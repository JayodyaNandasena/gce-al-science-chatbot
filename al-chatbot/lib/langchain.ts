import {ChatGroq} from "@langchain/groq";
import {PineconeStore} from "@langchain/pinecone";
import {ConversationalRetrievalQAChain} from "@langchain/classic/chains";
import {getPineconeClient} from "@/lib/pinecone-client.js";
import {getVectorStore} from "@/lib/vector-store.js";
import {formatChatHistory} from "@/lib/utils.js";
import {env} from "@/lib/config.js";

const CONDENSE_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;

const QA_TEMPLATE = `
You are a helpful AI assistant specializing in G.C.E. Advanced Level {subject} education.

Instructions:
- Answer ONLY using the provided context below.
- Do NOT use any outside knowledge or training data.
- If the answer is not found in the context, consider whether the question might belong to a different science subject (Biology, Physics, or Chemistry).
  - If it likely belongs to a different subject, respond ONLY with:
    "This question does not appear to be covered in {subject}. It may be related to [subject name] — please try the [subject name] assistant."
  - If it is clearly a {subject} question but just not covered, respond ONLY with:
    "The requested information is not covered in the current {subject} syllabus."
- Do NOT add any explanation or extra text when declining.
- If the answer is found, provide a comprehensive, detailed response using Markdown formatting.

Context:
{context}

Question:
{question}

Answer:
`;

type callChainArgs = {
    question: string;
    chatHistory: [string, string][];
    transformStream: TransformStream;
    subject: string;
};

interface SourceDocument {
    pageContent: string;
    metadata: {
        content_type: string;
        image_url: string;
        latex: string;
        page_end: number;
        page_start: number;
        source_file: string;
        subject: string;
        subtopic: string;
        unit_number: number;
    };
}

function makeChain(
    vectorStore: PineconeStore,
    writer: WritableStreamDefaultWriter,
    subject: string
) {
    const encoder = new TextEncoder();

    const streamingModel = new ChatGroq({
        apiKey: env.GROQ_API_KEY,
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        streaming: true,
        callbacks: [
            {
                async handleLLMNewToken(token) {
                    await writer.ready;
                    await writer.write(encoder.encode(token));
                },
                async handleLLMEnd() {
                    console.log("LLM stream ended");
                },
            },
        ],
    });

    const nonStreamingModel = new ChatGroq({
        apiKey: env.GROQ_API_KEY,
        model: "llama-3.1-8b-instant",
        temperature: 0,
    });

    const retriever = vectorStore.asRetriever({
        k: 10,
        searchType: "mmr",
        searchKwargs: {
            fetchK: 30,
            lambda: 0.7,
        },
    });

    const displaySubject = subject.charAt(0).toUpperCase() + subject.slice(1);

    return ConversationalRetrievalQAChain.fromLLM(
        streamingModel,
        retriever,
        {
            qaTemplate: QA_TEMPLATE.replaceAll("{subject}", displaySubject),
            questionGeneratorTemplate: CONDENSE_TEMPLATE,
            returnSourceDocuments: true,
            questionGeneratorChainOptions: {
                llm: nonStreamingModel,
            },
        }
    );
}

export async function callChain({
                                    question,
                                    chatHistory,
                                    transformStream,
                                    subject,
                                }: callChainArgs) {
    try {
        const sanitizedQuestion = question.trim().replaceAll("\n", " ");
        const encoder = new TextEncoder();
        const writer = transformStream.writable.getWriter();

        const pineconeClient = await getPineconeClient();
        const vectorStore = await getVectorStore(subject, pineconeClient);
        const chain = makeChain(vectorStore, writer, subject);
        const formattedChatHistory = formatChatHistory(chatHistory);

        chain
            .invoke({
                question: sanitizedQuestion,
                chat_history: formattedChatHistory,
            })
            .then(async (res) => {
                const sourceDocuments: SourceDocument[] = res?.sourceDocuments || [];

                const sources = sourceDocuments.slice(0, 2).map((doc) => ({
                    content: doc.pageContent,
                    subtopic: doc.metadata.subtopic,
                    unit_number: doc.metadata.unit_number,
                    source_file: doc.metadata.source_file,
                    page_start: doc.metadata.page_start,
                    page_end: doc.metadata.page_end,
                    content_type: doc.metadata.content_type,
                    ...(doc.metadata.image_url && {image_url: doc.metadata.image_url}),
                    ...(doc.metadata.latex && {latex: doc.metadata.latex}),
                }));

                await writer.ready;
                await writer.write(encoder.encode("tokens-ended"));

                setTimeout(async () => {
                    await writer.ready;
                    await writer.write(encoder.encode(JSON.stringify(sources)));
                    await writer.close();
                }, 100);
            })
            .catch(async (err) => {
                console.error("Chain invocation error:", err);
                await writer.abort(err);
            });

        return transformStream.readable;
    } catch (e) {
        console.error(e);
        throw new Error("Call chain method failed to execute!!");
    }
}
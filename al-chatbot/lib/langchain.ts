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

const REFERENCE_TEMPLATE = `
You are a study guide assistant for G.C.E. Advanced Level {subject} students.

Given the context below, do NOT answer the question directly.
Instead, list ALL relevant sections from the context where the student can find the answer.
Do not skip any section that is relevant — be exhaustive.

For each relevant section, format as:
- **Unit [unit_number] – [subtopic]**, pages [page_start]–[page_end] in [source_file]
  → One sentence on why this section is relevant to the question.

List sections in order of relevance. If a section is not relevant to the question, omit it.
If the topic is not covered in {subject} at all, redirect to the correct subject assistant.

Context:
{context}

Question:
{question}

References:
`;

type callChainArgs = {
    question: string;
    chatHistory: [string, string][];
    transformStream: TransformStream;
    subject: string;
    mode?: "answer" | "reference";
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
    subject: string,
    mode: "answer" | "reference" = "answer"
) {
    const template = mode === "reference" ? REFERENCE_TEMPLATE : QA_TEMPLATE;

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
        k: mode === "reference" ? 20 : 10,   // more chunks for reference mode
        searchType: "mmr",
        searchKwargs: {
            fetchK: mode === "reference" ? 50 : 30,
            lambda: 0.7,
        },
    });

    const displaySubject = subject.charAt(0).toUpperCase() + subject.slice(1);

    return ConversationalRetrievalQAChain.fromLLM(
        streamingModel,
        retriever,
        {
            qaTemplate: template.replaceAll("{subject}", displaySubject),
            questionGeneratorTemplate: CONDENSE_TEMPLATE,
            returnSourceDocuments: true,
            questionGeneratorChainOptions: {
                llm: nonStreamingModel,
            },
        }
    );
}

function formatSourceFile(filename: string): string {
    const match = filename.match(/^([a-z]+)_unit(\d+)\.pdf$/i);
    if (!match) return filename;
    const subject = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    return `${subject} Unit ${match[2]}`;
}

export async function callChain({question, chatHistory, transformStream, subject, mode}: callChainArgs) {
    try {
        const sanitizedQuestion = question.trim().replaceAll("\n", " ");
        const encoder = new TextEncoder();

        const pineconeClient = await getPineconeClient();
        const vectorStore = await getVectorStore(subject, pineconeClient);
        const formattedChatHistory = formatChatHistory(chatHistory);

        if (mode === "reference") {
            const retriever = vectorStore.asRetriever({
                k: 20,
                searchType: "mmr",
                searchKwargs: {fetchK: 50, lambda: 0.7},
            });

            const docs = await retriever.invoke(sanitizedQuestion);

            const seen = new Set<string>();
            const unique = docs.filter((doc) => {
                const key = `${doc.metadata.unit_number}|${doc.metadata.subtopic}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            const grouped = unique.reduce((acc, doc) => {
                const key = `Unit ${doc.metadata.unit_number}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(doc);
                return acc;
            }, {} as Record<string, typeof unique>);

            const referenceText = [
                "Here are the sections to refer to for your answer:\n",
                ...Object.entries(grouped).map(([unit, docs]) =>
                    `**${formatSourceFile(docs[0].metadata.source_file)}**\n` +
                    docs.map((doc, i) =>
                        `${i + 1}. ${doc.metadata.subtopic} · Page ${doc.metadata.page_start}`
                    ).join("\n")
                )
            ].join("\n\n");

            const sources = unique.map((doc) => ({
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

            const writer = transformStream.writable.getWriter();

            // Fire and forget, don't await
            (async () => {
                try {
                    console.log("[reference] writing referenceText...");
                    await writer.write(encoder.encode(referenceText));
                    console.log("[reference] writing tokens-ended...");
                    await writer.write(encoder.encode("tokens-ended"));
                    console.log("[reference] writing sources...");
                    await writer.write(encoder.encode(JSON.stringify(sources)));
                    console.log("[reference] closing writer...");
                    await writer.close();
                    console.log("[reference] done");
                } catch (err) {
                    console.error("[reference] write error:", err);
                    await writer.abort(err);
                }
            })();

            return transformStream.readable;
        }

        // Answer mode
        const writer = transformStream.writable.getWriter();
        const chain = makeChain(vectorStore, writer, subject);
        chain
            .invoke({question: sanitizedQuestion, chat_history: formattedChatHistory})
            .then(async (res) => {
                const sourceDocuments: SourceDocument[] = res?.sourceDocuments || [];
                const sources = sourceDocuments.map((doc) => ({
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
// import { ChatGroq } from "@langchain/groq";
// import { PineconeStore } from "@langchain/pinecone";
// import { ConversationalRetrievalQAChain } from "@langchain/classic/chains";
// import { getPineconeClient } from "@/lib/pinecone-client.js";
// import { getVectorStore } from "@/lib/vector-store.js";
// import { formatChatHistory } from "@/lib/utils.js";
// import { env } from "@/lib/config.js";
//
// const CONDENSE_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.
//
// Chat History:
// {chat_history}
// Follow Up Input: {question}
// Standalone question:`;
//
// const QA_TEMPLATE = `
// You are a helpful AI assistant specializing in science education.
//
// Instructions:
// - Answer ONLY using the provided context below.
// - Do NOT use any outside knowledge or training data.
// - If the answer is not explicitly found in the context, respond ONLY with:
//   "The requested information is not covered in the current syllabus."
// - Do NOT add any explanation or extra text when declining.
// - If the answer is found, provide a comprehensive, detailed response using Markdown formatting.
//
// Context:
// {context}
//
// Question:
// {question}
//
// Answer:
// `;
//
// type callChainArgs = {
//     question: string;
//     chatHistory: [string, string][];
//     transformStream: TransformStream;
//     subject: string;
// };
//
// function makeChain(
//     vectorStore: PineconeStore,
//     writer: WritableStreamDefaultWriter
// ) {
//     const encoder = new TextEncoder();
//
//     const streamingModel = new ChatGroq({
//         apiKey: env.GROQ_API_KEY,
//         model: "llama-3.3-70b-versatile",
//         temperature: 0,
//         streaming: true,
//         callbacks: [
//             {
//                 async handleLLMNewToken(token) {
//                     await writer.ready;
//                     await writer.write(encoder.encode(token));
//                 },
//                 async handleLLMEnd() {
//                     console.log("LLM end called");
//                 },
//             },
//         ],
//     });
//
//     const nonStreamingModel = new ChatGroq({
//         apiKey: env.GROQ_API_KEY,
//         model: "llama3-8b-8192",
//         temperature: 0,
//     });
//
//     const retriever = vectorStore.asRetriever({
//         k: 6,
//         searchType: "similarity",
//     });
//
//     return ConversationalRetrievalQAChain.fromLLM(
//         streamingModel,
//         retriever,
//         {
//             qaTemplate: QA_TEMPLATE,
//             questionGeneratorTemplate: CONDENSE_TEMPLATE,
//             returnSourceDocuments: true,
//             questionGeneratorChainOptions: {
//                 llm: nonStreamingModel,
//             },
//         }
//     );
// }
//
// export async function callChain({
//                                     question,
//                                     chatHistory,
//                                     transformStream,
//                                     subject, // 👈 now dynamic
//                                 }: callChainArgs) {
//     try {
//         const sanitizedQuestion = question.trim().replaceAll("\n", " ");
//         const pineconeClient = await getPineconeClient(subject);
//         const vectorStore = await getVectorStore(subject, pineconeClient); // 👈 passes correct namespace
//
//         const encoder = new TextEncoder();
//         const writer = transformStream.writable.getWriter();
//         const chain = makeChain(vectorStore, writer);
//         const formattedChatHistory = formatChatHistory(chatHistory);
//
//         chain
//             .invoke({
//                 question: sanitizedQuestion,
//                 chat_history: formattedChatHistory,
//             })
//             .then(async (res) => {
//                 const sourceDocuments = res?.sourceDocuments || [];
//                 const firstTwoDocuments = sourceDocuments.slice(0, 2);
//                 const pageContents = firstTwoDocuments.map(
//                     ({ pageContent }: { pageContent: string }) => pageContent
//                 );
//
//                 await writer.ready;
//                 await writer.write(encoder.encode("tokens-ended"));
//
//                 setTimeout(async () => {
//                     await writer.ready;
//                     await writer.write(
//                         encoder.encode(JSON.stringify(pageContents))
//                     );
//                     await writer.close();
//                 }, 100);
//             });
//
//         return transformStream.readable;
//     } catch (e) {
//         console.error(e);
//         throw new Error("Call chain method failed to execute!!");
//     }
// }

import { ChatGroq } from "@langchain/groq";
import { PineconeStore } from "@langchain/pinecone";
import { ConversationalRetrievalQAChain } from "@langchain/classic/chains";
import { getPineconeClient } from "@/lib/pinecone-client.js";
import { getVectorStore } from "@/lib/vector-store.js";
import { formatChatHistory } from "@/lib/utils.js";
import { env } from "@/lib/config.js";

const VALID_SUBJECTS = ["biology", "physics", "chemistry"] as const;
type Subject = typeof VALID_SUBJECTS[number];

const CONDENSE_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;

const QA_TEMPLATE = `
You are a helpful AI assistant specializing in G.C.E. Advanced Level science education.

Instructions:
- Answer ONLY using the provided context below.
- Do NOT use any outside knowledge or training data.
- If the answer is not explicitly found in the context, respond ONLY with:
  "The requested information is not covered in the current syllabus."
- Do NOT add any explanation or extra text when declining.
- If the answer is found, provide a comprehensive, detailed response using Markdown formatting.

Context:
{context}

Question:
{question}

Answer:
`;

// Returns the subject the question most likely belongs to, or "general" if unclear
const SUBJECT_CLASSIFIER_TEMPLATE = `You are a G.C.E. Advanced Level science subject classifier.

Given a student's question, determine which subject it belongs to.
You must reply with ONLY a single word — one of: biology, physics, chemistry, general.

Rules:
- "general" means it could apply to multiple subjects or is not subject-specific.
- Choose the MOST specific subject if it clearly belongs to one.
- Do NOT explain your answer. Just output one word.

Question: {question}
Subject:`;

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

// Capitalizes subject name for display: "physics" → "Physics"
function displaySubject(subject: string) {
    return subject.charAt(0).toUpperCase() + subject.slice(1);
}

// Classifies the question's subject using a fast, non-streaming model
async function classifyQuestionSubject(
    question: string,
    classifierModel: ChatGroq
): Promise<string> {
    const prompt = SUBJECT_CLASSIFIER_TEMPLATE.replace("{question}", question);
    const response = await classifierModel.invoke(prompt);
    const raw = (response.content as string).trim().toLowerCase();

    // Defensive: only trust known values
    if ((VALID_SUBJECTS as readonly string[]).includes(raw)) return raw;
    return "general";
}

function makeChain(
    vectorStore: PineconeStore,
    writer: WritableStreamDefaultWriter
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
        k: 10,                    // fetch more candidates to pick from
        searchType: "mmr",        // maximal marginal relevance
        searchKwargs: {
            fetchK: 30,           // consider top 30 by similarity, then diversify down to k=10
            lambda: 0.7,          // 0 = max diversity, 1 = max similarity. 0.7 balances both
        },
    });

    return ConversationalRetrievalQAChain.fromLLM(
        streamingModel,
        retriever,
        {
            qaTemplate: QA_TEMPLATE,
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

        // Fast classifier model — no streaming needed here
        const classifierModel = new ChatGroq({
            apiKey: env.GROQ_API_KEY,
            model: "llama-3.1-8b-instant",
            temperature: 0,
        });

        // Step 1: classify the question's subject
        const detectedSubject = await classifyQuestionSubject(
            sanitizedQuestion,
            classifierModel
        );

        console.log(detectedSubject.toString());

        // Step 2: if it's clearly a different subject, redirect immediately
        if (
            detectedSubject !== "general" &&
            detectedSubject !== subject.toLowerCase()
        ) {
            const redirectMessage =
                `This question is related to **${displaySubject(detectedSubject)}**, ` +
                `not ${displaySubject(subject)}. ` +
                `Please switch to the **${displaySubject(detectedSubject)}** assistant to get the answer.`;

            console.log(redirectMessage);
            // Write token by token to match how the frontend reads the stream
            for (const char of redirectMessage) {
                await writer.ready;
                await writer.write(encoder.encode(char));
            }

            await writer.ready;
            await writer.write(encoder.encode("tokens-ended"));

            setTimeout(async () => {
                await writer.ready;
                await writer.write(encoder.encode(JSON.stringify([])));
                await writer.close();
            }, 100);

            return transformStream.readable;
        }

        // Step 3: proceed normally with the correct namespace
        const pineconeClient = await getPineconeClient();
        const vectorStore = await getVectorStore(subject, pineconeClient);
        const chain = makeChain(vectorStore, writer);
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
                    ...(doc.metadata.image_url && { image_url: doc.metadata.image_url }),
                    ...(doc.metadata.latex && { latex: doc.metadata.latex }),
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
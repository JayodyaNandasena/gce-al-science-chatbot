// import {ChatGroq} from "@langchain/groq";
// import {PineconeStore} from "@langchain/pinecone";
// import {ConversationalRetrievalQAChain} from "@langchain/classic/chains";
// import {getPineconeClient} from "@/lib/pinecone-client.js";
// import {getVectorStore} from "@/lib/vector-store.js";
// import {formatChatHistory} from "@/lib/utils.js";
// import {env} from "@/lib/config.js";
// import {ChatPromptTemplate} from "@langchain/core/prompts";
// import {StringOutputParser} from "@langchain/core/output_parsers";
// import {HumanMessage} from "@langchain/core/messages";
//
// // ─── Models ───────────────────────────────────────────────────────────────────
//
// const streamingModel = new ChatGroq({
//     apiKey: env.GROQ_API_KEY,
//     model: "llama-3.3-70b-versatile",
//     temperature: 0.2,
//     streaming: true,
// });
//
// const visionModel = new ChatGroq({
//     apiKey: process.env.GROQ_API_KEY!,
//     model: "meta-llama/llama-4-scout-17b-16e-instruct",
//     temperature: 0.2,
//     streaming: true,
// });
//
// // ─── Chat prompts ─────────────────────────────────────────────────────────────
//
// const CONDENSE_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.
//
// Chat History:
// {chat_history}
// Follow Up Input: {question}
// Standalone question:`;
//
// const QA_TEMPLATE = `
// You are a helpful AI assistant specializing in G.C.E. Advanced Level {subject} education.
//
// Instructions:
// - Answer ONLY using the provided context below.
// - Do NOT use any outside knowledge or training data.
// - If the answer is not found in the context, consider whether the question might belong to a different science subject (Biology, Physics, or Chemistry).
//   - If it likely belongs to a different subject, respond ONLY with:
//     "This question does not appear to be covered in {subject}. It may be related to [subject name] — please try the [subject name] assistant."
//   - If it is clearly a {subject} question but just not covered, respond ONLY with:
//     "The requested information is not covered in the current {subject} syllabus."
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
// const REFERENCE_TEMPLATE = `
// You are a study guide assistant for G.C.E. Advanced Level {subject} students.
//
// Given the context below, do NOT answer the question directly.
// Instead, list ALL relevant sections from the context where the student can find the answer.
// Do not skip any section that is relevant — be exhaustive.
//
// For each relevant section, format as:
// - **Unit [unit_number] – [subtopic]**, pages [page_start]–[page_end] in [source_file]
//   → One sentence on why this section is relevant to the question.
//
// List sections in order of relevance. If a section is not relevant to the question, omit it.
// If the topic is not covered in {subject} at all, redirect to the correct subject assistant.
//
// Context:
// {context}
//
// Question:
// {question}
//
// References:
// `;
//
// const EVAL_INSTRUCTIONS = `You are a GCE A/L examiner evaluating a student's answer.
//
// TASK:
// 1. Compare meaning, not exact wording.
// 2. Award marks per point.
// 3. Allow synonyms and minor spelling errors.
// 4. For image answers: first read all handwritten/drawn content carefully, including calculations, diagrams, and annotations.
// 5. Output STRICT JSON ONLY — no markdown, no prose outside the JSON block.
//
// TONE RULES for finalFeedback:
// - Address the student directly as "you" / "your" — never say "the student".
// - Be encouraging but honest.`;
//
// // Single braces — for plain template literals only (never fed to LangChain templates)
// const EVAL_OUTPUT_FORMAT_RAW = `OUTPUT FORMAT:
// {
//   "totalMarks": number,
//   "maxMarks": number,
//   "breakdown": [
//     {
//       "point": string,
//       "awarded": number,
//       "comment": string
//     }
//   ],
//   "finalFeedback": string
// }`;
//
// // Double braces — for ChatPromptTemplate.fromTemplate only
// const EVALUATION_TEMPLATE = `
// ${EVAL_INSTRUCTIONS}
//
// OUTPUT FORMAT:
// {{
//   "totalMarks": number,
//   "maxMarks": number,
//   "breakdown": [
//     {{
//       "point": string,
//       "awarded": number,
//       "comment": string
//     }}
//   ],
//   "finalFeedback": string
// }}
//
// QUESTION:
// {question}
//
// MARKING SCHEME (POINT-WISE):
// {markingScheme}
//
// STUDENT ANSWER:
// {studentAnswer}
// `;
//
// const evaluationPrompt = ChatPromptTemplate.fromTemplate(EVALUATION_TEMPLATE);
//
// // ─── Types ────────────────────────────────────────────────────────────────────
//
// type callChatArgs = {
//     question: string;
//     chatHistory: [string, string][];
//     transformStream: TransformStream;
//     subject: string;
//     mode?: "answer" | "reference";
// };
//
// type callEvaluateArgs = {
//     question: string;
//     markingScheme: string;
//     studentAnswer: string;
//     transformStream: TransformStream;
// };
//
// type CallEvaluateWithImageArgs = {
//     question: string;
//     markingScheme: string;
//     imageBase64: string;   // pure base64 string, no data URI prefix
//     mediaType: string;     // e.g. "image/jpeg", "image/png"
//     transformStream: TransformStream;
// };
//
// interface SourceDocument {
//     pageContent: string;
//     metadata: {
//         content_type: string;
//         image_url: string;
//         latex: string;
//         page_end: number;
//         page_start: number;
//         source_file: string;
//         subject: string;
//         subtopic: string;
//         unit_number: number;
//     };
// }
//
// // ─── Stream helpers ───────────────────────────────────────────────────────────
//
// function attachCallbacks(model: ChatGroq, writer: WritableStreamDefaultWriter) {
//     const encoder = new TextEncoder();
//     return model.withConfig({
//         callbacks: [
//             {
//                 async handleLLMNewToken(token: string) {
//                     await writer.ready;
//                     await writer.write(encoder.encode(token));
//                 },
//             },
//         ],
//     });
// }
//
// async function finishStream(writer: WritableStreamDefaultWriter, err?: unknown) {
//     const encoder = new TextEncoder();
//     if (err) {
//         console.error("[finishStream] error:", err);
//         await writer.abort(err);
//     } else {
//         await writer.ready;
//         await writer.write(encoder.encode("tokens-ended"));
//         await writer.close();
//     }
// }
//
// // ─── makeChain ────────────────────────────────────────────────────────────────
//
// function makeChain(
//     vectorStore: PineconeStore,
//     writer: WritableStreamDefaultWriter,
//     subject: string,
//     mode: "answer" | "reference" = "answer"
// ) {
//     const template = mode === "reference" ? REFERENCE_TEMPLATE : QA_TEMPLATE;
//     const encoder = new TextEncoder();
//
//     const streamingModelWithCallbacks = new ChatGroq({
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
//                     console.log("LLM stream ended");
//                 },
//             },
//         ],
//     });
//
//     const nonStreamingModel = new ChatGroq({
//         apiKey: env.GROQ_API_KEY,
//         model: "llama-3.1-8b-instant",
//         temperature: 0,
//     });
//
//     const retriever = vectorStore.asRetriever({
//         k: mode === "reference" ? 20 : 10,
//         searchType: "mmr",
//         searchKwargs: {
//             fetchK: mode === "reference" ? 50 : 30,
//             lambda: 0.7,
//         },
//     });
//
//     const displaySubject = subject.charAt(0).toUpperCase() + subject.slice(1);
//
//     return ConversationalRetrievalQAChain.fromLLM(
//         streamingModelWithCallbacks,
//         retriever,
//         {
//             qaTemplate: template.replaceAll("{subject}", displaySubject),
//             questionGeneratorTemplate: CONDENSE_TEMPLATE,
//             returnSourceDocuments: true,
//             questionGeneratorChainOptions: {
//                 llm: nonStreamingModel,
//             },
//         }
//     );
// }
//
// // ─── callEvaluate — typed text answer ────────────────────────────────────────
//
// export async function callEvaluate({
//                                        question,
//                                        markingScheme,
//                                        studentAnswer,
//                                        transformStream,
//                                    }: callEvaluateArgs): Promise<ReadableStream> {
//     try {
//         const writer = transformStream.writable.getWriter();
//         const modelWithCallbacks = attachCallbacks(streamingModel, writer);
//
//         const chain = evaluationPrompt
//             .pipe(modelWithCallbacks)
//             .pipe(new StringOutputParser());
//
//         chain
//             .invoke({ question, markingScheme, studentAnswer })
//             .then(() => finishStream(writer))
//             .catch((err) => finishStream(writer, err));
//
//         return transformStream.readable;
//     } catch (e) {
//         console.error("[callEvaluate] setup error:", e);
//         throw new Error("callEvaluate failed to execute!");
//     }
// }
//
// // ─── callEvaluateWithImage — handwritten/image answer ────────────────────────
// // Uses a plain HumanMessage (not ChatPromptTemplate) so single { } braces in
// // EVAL_OUTPUT_FORMAT_RAW are sent to the model as-is — no LangChain escaping.
//
// export async function callEvaluateWithImage({
//                                                 question,
//                                                 markingScheme,
//                                                 imageBase64,
//                                                 mediaType,
//                                                 transformStream,
//                                             }: CallEvaluateWithImageArgs): Promise<ReadableStream> {
//     try {
//         const writer = transformStream.writable.getWriter();
//         const modelWithCallbacks = attachCallbacks(visionModel, writer);
//
//         const message = new HumanMessage({
//             content: [
//                 {
//                     type: "image_url",
//                     image_url: {
//                         url: `data:${mediaType};base64,${imageBase64}`,
//                     },
//                 },
//                 {
//                     type: "text",
//                     text: `${EVAL_INSTRUCTIONS}
//
// ${EVAL_OUTPUT_FORMAT_RAW}
//
// QUESTION:
// ${question}
//
// MARKING SCHEME (POINT-WISE):
// ${markingScheme}
//
// STUDENT ANSWER:
// The student's answer is shown in the image above. Read all handwritten content carefully — including any calculations, equations, diagrams, and annotations — then evaluate it against the marking scheme.`,
//                 },
//             ],
//         });
//
//         modelWithCallbacks
//             .invoke([message])
//             .then(() => finishStream(writer))
//             .catch((err) => finishStream(writer, err));
//
//         return transformStream.readable;
//     } catch (e) {
//         console.error("[callEvaluateWithImage] setup error:", e);
//         throw new Error("callEvaluateWithImage failed to execute!");
//     }
// }
//
// // ─── Helpers ──────────────────────────────────────────────────────────────────
//
// function formatSourceFile(filename: string): string {
//     const match = filename.match(/^([a-z]+)_unit(\d+)\.pdf$/i);
//     if (!match) return filename;
//     const subject = match[1].charAt(0).toUpperCase() + match[1].slice(1);
//     return `${subject} Unit ${match[2]}`;
// }
//
// // ─── callChain ────────────────────────────────────────────────────────────────
//
// export async function callChain({question, chatHistory, transformStream, subject, mode}: callChatArgs) {
//     try {
//         const sanitizedQuestion = question.trim().replaceAll("\n", " ");
//         const encoder = new TextEncoder();
//
//         const pineconeClient = await getPineconeClient();
//         const vectorStore = await getVectorStore(subject, pineconeClient);
//         const formattedChatHistory = formatChatHistory(chatHistory);
//
//         if (mode === "reference") {
//             const retriever = vectorStore.asRetriever({
//                 k: 20,
//                 searchType: "mmr",
//                 searchKwargs: {fetchK: 50, lambda: 0.7},
//             });
//
//             const docs = await retriever.invoke(sanitizedQuestion);
//
//             const seen = new Set<string>();
//             const unique = docs.filter((doc) => {
//                 const key = `${doc.metadata.unit_number}|${doc.metadata.subtopic}`;
//                 if (seen.has(key)) return false;
//                 seen.add(key);
//                 return true;
//             });
//
//             const grouped = unique.reduce((acc, doc) => {
//                 const key = `Unit ${doc.metadata.unit_number}`;
//                 if (!acc[key]) acc[key] = [];
//                 acc[key].push(doc);
//                 return acc;
//             }, {} as Record<string, typeof unique>);
//
//             const referenceText = [
//                 "Here are the sections to refer to for your answer:\n",
//                 ...Object.entries(grouped).map(([unit, docs]) =>
//                     `**${formatSourceFile(docs[0].metadata.source_file)}**\n` +
//                     docs.map((doc, i) =>
//                         `${i + 1}. ${doc.metadata.subtopic} · Page ${doc.metadata.page_start}`
//                     ).join("\n")
//                 )
//             ].join("\n\n");
//
//             const sources = null;
//             const writer = transformStream.writable.getWriter();
//
//             (async () => {
//                 try {
//                     await writer.write(encoder.encode(referenceText));
//                     await writer.write(encoder.encode("tokens-ended"));
//                     await writer.write(encoder.encode(JSON.stringify(sources)));
//                     await writer.close();
//                 } catch (err) {
//                     await writer.abort(err);
//                 }
//             })();
//
//             return transformStream.readable;
//         }
//
//         // Answer mode
//         const writer = transformStream.writable.getWriter();
//         const chain = makeChain(vectorStore, writer, subject);
//         chain
//             .invoke({question: sanitizedQuestion, chat_history: formattedChatHistory})
//             .then(async (res) => {
//                 const sourceDocuments: SourceDocument[] = res?.sourceDocuments || [];
//                 const sources = sourceDocuments.map((doc) => ({
//                     content: doc.pageContent,
//                     subtopic: doc.metadata.subtopic,
//                     unit_number: doc.metadata.unit_number,
//                     source_file: doc.metadata.source_file,
//                     page_start: doc.metadata.page_start,
//                     page_end: doc.metadata.page_end,
//                     content_type: doc.metadata.content_type,
//                     ...(doc.metadata.image_url && {image_url: doc.metadata.image_url}),
//                     ...(doc.metadata.latex && {latex: doc.metadata.latex}),
//                 }));
//
//                 await writer.ready;
//                 await writer.write(encoder.encode("tokens-ended"));
//                 setTimeout(async () => {
//                     await writer.ready;
//                     await writer.write(encoder.encode(JSON.stringify(sources)));
//                     await writer.close();
//                 }, 100);
//             })
//             .catch(async (err) => {
//                 console.error("Chain invocation error:", err);
//                 await writer.abort(err);
//             });
//
//         return transformStream.readable;
//
//     } catch (e) {
//         console.error(e);
//         throw new Error("Call chain method failed to execute!!");
//     }
// }

import {ChatGroq} from "@langchain/groq";
import {PineconeStore} from "@langchain/pinecone";
import {ConversationalRetrievalQAChain} from "@langchain/classic/chains";
import {getPineconeClient} from "@/lib/pinecone-client.js";
import {getVectorStore} from "@/lib/vector-store.js";
import {formatChatHistory} from "@/lib/utils.js";
import {env} from "@/lib/config.js";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {StringOutputParser} from "@langchain/core/output_parsers";
import {HumanMessage} from "@langchain/core/messages";

// ─── Models ───────────────────────────────────────────────────────────────────

const streamingModel = new ChatGroq({
    apiKey: env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    streaming: true,
});

const visionModel = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY!,
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 0.2,
    streaming: true,
});

// ─── Chat prompts ─────────────────────────────────────────────────────────────

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

// ─── Evaluation prompts ───────────────────────────────────────────────────────
// Architecture:
//
//   EVAL_INSTRUCTIONS_<SUBJECT>  — plain prose, NO braces.
//       Safe to embed directly in HumanMessage template literals.
//       Each subject gets its own tailored rules.
//
//   EVAL_OUTPUT_FORMAT_RAW — single { } braces.
//       Used only inside plain JS template literals (HumanMessage).
//
//   EVALUATION_TEMPLATE_<SUBJECT> — LangChain ChatPromptTemplate versions.
//       Uses {{ }} for literal braces so LangChain doesn't parse them as slots.
//
//   getEvalInstructions(subject)      → picks the right plain instructions block.
//   getEvaluationPrompt(subject)      → picks the right ChatPromptTemplate.
//
// Rule: anything going through ChatPromptTemplate.fromTemplate → use {{ }}.
//       anything going through a plain JS template literal  → use { }.

// ── Biology ──────────────────────────────────────────────────────────────────

const EVAL_INSTRUCTIONS_BIOLOGY = `You are a GCE A/L Biology examiner evaluating a student's answer.

TASK:
1. Compare meaning, not exact wording.
2. Award marks per point.
3. Allow synonyms and minor spelling errors.
4. Accept correct biological terminology even if phrased differently from the scheme.
5. For image answers: read all handwritten/drawn content carefully, including diagrams, labels, and annotations.
6. Output STRICT JSON ONLY — no markdown, no prose outside the JSON block.

BIOLOGY-SPECIFIC RULES:
- Diagrams and labels: award marks if the correct structures are identified, even if the drawing is rough.
- Do not accept incorrect Latin binomial names with minor spelling or capitalisation errors.
- Do NOT penalise for missing units — Biology answers are predominantly qualitative.

TONE RULES for finalFeedback:
- Address the student directly as "you" / "your" — never say "the student".
- Be encouraging but honest.`;

// ── Physics ───────────────────────────────────────────────────────────────────

const EVAL_INSTRUCTIONS_PHYSICS = `You are a GCE A/L Physics examiner evaluating a student's answer.

TASK:
1. Compare meaning, not exact wording.
2. Award marks per point.
3. Allow synonyms and minor spelling errors.
4. For image answers: read all handwritten/drawn content carefully, including calculations, circuit diagrams, graphs, and annotations.
5. Output STRICT JSON ONLY — no markdown, no prose outside the JSON block.

PHYSICS-SPECIFIC RULES:
- UNIT RULE: If the question requires a numerical answer AND the student's answer does not include
  any unit (e.g. m, s, kg, N, J, W, Pa, Hz, etc.), award totalMarks = 0 regardless of whether
  the numerical value is correct. Add a breakdown entry:
  { "point": "Unit missing", "awarded": 0, "comment": "No unit was stated. In Physics, a numerical answer without a unit scores zero." }
- If the question is purely qualitative (no numerical answer expected), the unit rule does not apply.
- Accept correct SI units and their recognised equivalents (e.g. N m for J).
- Award method marks for correct working even if the final numerical answer is wrong, UNLESS the unit is missing.
- For graphs: award marks for correctly labelled axes, appropriate scale, and correct shape/trend.

TONE RULES for finalFeedback:
- Address the student directly as "you" / "your" — never say "the student".
- Be encouraging but honest.`;

// ── Chemistry ─────────────────────────────────────────────────────────────────

const EVAL_INSTRUCTIONS_CHEMISTRY = `You are a GCE A/L Chemistry examiner evaluating a student's answer.

TASK:
1. Compare meaning, not exact wording.
2. Award marks per point.
3. Allow synonyms and minor spelling errors.
4. For image answers: read all handwritten/drawn content carefully, including equations, structural formulae, calculations, and annotations.
5. Output STRICT JSON ONLY — no markdown, no prose outside the JSON block.

CHEMISTRY-SPECIFIC RULES:
- UNIT RULE: If the question requires a numerical answer AND the student's answer does not include
  any unit (e.g. mol, g, dm³, mol dm⁻³, J mol⁻¹, kPa, etc.), award totalMarks = 0 regardless of
  whether the numerical value is correct. Add a breakdown entry:
  { "point": "Unit missing", "awarded": 0, "comment": "No unit was stated. In Chemistry, a numerical answer without a unit scores zero." }
- If the question is purely qualitative (no numerical answer expected), the unit rule does not apply.
- STATE SYMBOLS: If the marking scheme requires state symbols (s), (l), (g), (aq) and they are
  absent, deduct the mark allocated to that point.
- EQUATIONS: Accept correct equations with correct balancing even if state symbols are missing,
  unless state symbols carry a dedicated mark in the scheme.
- SIGNIFICANT FIGURES: Accept answers within ±1 significant figure of the scheme answer unless
  the question explicitly demands a specific number of significant figures.
- Structural formulae: award marks if the connectivity and functional groups are correct, even if
  the drawing style differs from the scheme.

TONE RULES for finalFeedback:
- Address the student directly as "you" / "your" — never say "the student".
- Be encouraging but honest.`;

// ── Selector helpers ──────────────────────────────────────────────────────────

function getEvalInstructions(subject: string): string {
    switch (subject.toLowerCase()) {
        case "physics":
            return EVAL_INSTRUCTIONS_PHYSICS;
        case "chemistry":
            return EVAL_INSTRUCTIONS_CHEMISTRY;
        default:
            return EVAL_INSTRUCTIONS_BIOLOGY;
    }
}

// ── Shared output format ──────────────────────────────────────────────────────

// Single braces — for plain template literals only (never fed to LangChain templates)
const EVAL_OUTPUT_FORMAT_RAW = `OUTPUT FORMAT:
{
  "totalMarks": number,
  "maxMarks": number,
  "breakdown": [
    {
      "point": string,
      "awarded": number,
      "comment": string
    }
  ],
  "finalFeedback": string
}`;

// ── Per-subject ChatPromptTemplates ───────────────────────────────────────────
// Double braces = literal braces sent to the model (LangChain escaping).

const EVALUATION_TEMPLATE_BIOLOGY = `
${EVAL_INSTRUCTIONS_BIOLOGY}

OUTPUT FORMAT:
{{
  "totalMarks": number,
  "maxMarks": number,
  "breakdown": [
    {{
      "point": string,
      "awarded": number,
      "comment": string
    }}
  ],
  "finalFeedback": string
}}

QUESTION:
{question}

MARKING SCHEME (POINT-WISE):
{markingScheme}

STUDENT ANSWER:
{studentAnswer}
`;

const EVALUATION_TEMPLATE_PHYSICS = `
${EVAL_INSTRUCTIONS_PHYSICS}

OUTPUT FORMAT:
{{
  "totalMarks": number,
  "maxMarks": number,
  "breakdown": [
    {{
      "point": string,
      "awarded": number,
      "comment": string
    }}
  ],
  "finalFeedback": string
}}

QUESTION:
{question}

MARKING SCHEME (POINT-WISE):
{markingScheme}

STUDENT ANSWER:
{studentAnswer}
`;

const EVALUATION_TEMPLATE_CHEMISTRY = `
${EVAL_INSTRUCTIONS_CHEMISTRY}

OUTPUT FORMAT:
{{
  "totalMarks": number,
  "maxMarks": number,
  "breakdown": [
    {{
      "point": string,
      "awarded": number,
      "comment": string
    }}
  ],
  "finalFeedback": string
}}

QUESTION:
{question}

MARKING SCHEME (POINT-WISE):
{markingScheme}

STUDENT ANSWER:
{studentAnswer}
`;

const evaluationPrompts: Record<string, ReturnType<typeof ChatPromptTemplate.fromTemplate>> = {
    biology: ChatPromptTemplate.fromTemplate(EVALUATION_TEMPLATE_BIOLOGY),
    physics: ChatPromptTemplate.fromTemplate(EVALUATION_TEMPLATE_PHYSICS),
    chemistry: ChatPromptTemplate.fromTemplate(EVALUATION_TEMPLATE_CHEMISTRY),
};

function getEvaluationPrompt(subject: string) {
    return evaluationPrompts[subject.toLowerCase()] ?? evaluationPrompts["biology"];
}

// ─── Types ────────────────────────────────────────────────────────────────────

type callChatArgs = {
    question: string;
    chatHistory: [string, string][];
    transformStream: TransformStream;
    subject: string;
    mode?: "answer" | "reference";
};

type callEvaluateArgs = {
    question: string;
    markingScheme: string;
    studentAnswer: string;
    transformStream: TransformStream;
    subject: string;
};

type CallEvaluateWithImageArgs = {
    question: string;
    markingScheme: string;
    imageBase64: string;   // pure base64 string, no data URI prefix
    mediaType: string;     // e.g. "image/jpeg", "image/png"
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

// ─── Stream helpers ───────────────────────────────────────────────────────────

function attachCallbacks(model: ChatGroq, writer: WritableStreamDefaultWriter) {
    const encoder = new TextEncoder();
    return model.withConfig({
        callbacks: [
            {
                async handleLLMNewToken(token: string) {
                    await writer.ready;
                    await writer.write(encoder.encode(token));
                },
            },
        ],
    });
}

async function finishStream(writer: WritableStreamDefaultWriter, err?: unknown) {
    const encoder = new TextEncoder();
    if (err) {
        console.error("[finishStream] error:", err);
        await writer.abort(err);
    } else {
        await writer.ready;
        await writer.write(encoder.encode("tokens-ended"));
        await writer.close();
    }
}

// ─── makeChain ────────────────────────────────────────────────────────────────

function makeChain(
    vectorStore: PineconeStore,
    writer: WritableStreamDefaultWriter,
    subject: string,
    mode: "answer" | "reference" = "answer"
) {
    const template = mode === "reference" ? REFERENCE_TEMPLATE : QA_TEMPLATE;
    const encoder = new TextEncoder();

    const streamingModelWithCallbacks = new ChatGroq({
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
        k: mode === "reference" ? 20 : 10,
        searchType: "mmr",
        searchKwargs: {
            fetchK: mode === "reference" ? 50 : 30,
            lambda: 0.7,
        },
    });

    const displaySubject = subject.charAt(0).toUpperCase() + subject.slice(1);

    return ConversationalRetrievalQAChain.fromLLM(
        streamingModelWithCallbacks,
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

// ─── callEvaluate — typed text answer ────────────────────────────────────────

export async function callEvaluate({
                                       question,
                                       markingScheme,
                                       studentAnswer,
                                       transformStream,
                                       subject,
                                   }: callEvaluateArgs): Promise<ReadableStream> {
    try {
        const writer = transformStream.writable.getWriter();
        const modelWithCallbacks = attachCallbacks(streamingModel, writer);

        const chain = getEvaluationPrompt(subject)
            .pipe(modelWithCallbacks)
            .pipe(new StringOutputParser());

        chain
            .invoke({question, markingScheme, studentAnswer})
            .then(() => finishStream(writer))
            .catch((err) => finishStream(writer, err));

        return transformStream.readable;
    } catch (e) {
        console.error("[callEvaluate] setup error:", e);
        throw new Error("callEvaluate failed to execute!");
    }
}

// ─── callEvaluateWithImage — handwritten/image answer ────────────────────────
// Uses a plain HumanMessage (not ChatPromptTemplate) so single { } braces in
// EVAL_OUTPUT_FORMAT_RAW are sent to the model as-is — no LangChain escaping.

export async function callEvaluateWithImage({
                                                question,
                                                markingScheme,
                                                imageBase64,
                                                mediaType,
                                                transformStream,
                                                subject,
                                            }: CallEvaluateWithImageArgs): Promise<ReadableStream> {
    try {
        const writer = transformStream.writable.getWriter();
        const modelWithCallbacks = attachCallbacks(visionModel, writer);

        const message = new HumanMessage({
            content: [
                {
                    type: "image_url",
                    image_url: {
                        url: `data:${mediaType};base64,${imageBase64}`,
                    },
                },
                {
                    type: "text",
                    text: `${getEvalInstructions(subject)}

${EVAL_OUTPUT_FORMAT_RAW}

QUESTION:
${question}

MARKING SCHEME (POINT-WISE):
${markingScheme}

STUDENT ANSWER:
The student's answer is shown in the image above. Read all handwritten content carefully — including any calculations, equations, diagrams, and annotations — then evaluate it against the marking scheme.`,
                },
            ],
        });

        modelWithCallbacks
            .invoke([message])
            .then(() => finishStream(writer))
            .catch((err) => finishStream(writer, err));

        return transformStream.readable;
    } catch (e) {
        console.error("[callEvaluateWithImage] setup error:", e);
        throw new Error("callEvaluateWithImage failed to execute!");
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSourceFile(filename: string): string {
    const match = filename.match(/^([a-z]+)_unit(\d+)\.pdf$/i);
    if (!match) return filename;
    const subject = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    return `${subject} Unit ${match[2]}`;
}

// ─── callChain ────────────────────────────────────────────────────────────────

export async function callChain({question, chatHistory, transformStream, subject, mode}: callChatArgs) {
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

            const sources = null;
            const writer = transformStream.writable.getWriter();

            (async () => {
                try {
                    await writer.write(encoder.encode(referenceText));
                    await writer.write(encoder.encode("tokens-ended"));
                    await writer.write(encoder.encode(JSON.stringify(sources)));
                    await writer.close();
                } catch (err) {
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

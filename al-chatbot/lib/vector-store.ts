// import { NomicEmbeddings } from "@langchain/nomic";
// import { PineconeStore } from "@langchain/pinecone";
// import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
// import { env } from "@/lib/config.js";
//
// /**
//  * Nomic Atlas (cloud) embeddings
//  * Uses API key from .env
//  */
// const nomicEmbeddings = new NomicEmbeddings({
//     apiKey: env.NOMIC_API_KEY,
//     model: "nomic-embed-text-v1.5", // current Atlas embedding model
// });
//
//
// /**
//  * Uses cloud embeddings to embed user queries
//  */
// export async function getVectorStore(
//     namespace: string,
//     client: PineconeClient
// ) {
//     try {
//         const index = client.Index(env.PINECONE_INDEX); // create Index object
//
//         const vectorStore = await PineconeStore.fromExistingIndex(
//             nomicEmbeddings,
//             {
//                 pineconeIndex: index,
//                 textKey: "content",
//                 namespace,
//             }
//         );
//
//         return vectorStore;
//     } catch (error) {
//         console.error("Vector store retrieval error:", error);
//         throw new Error("Something went wrong while getting vector store!");
//     }
// }

import { NomicEmbeddings } from "@langchain/nomic";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { env } from "@/lib/config.js";

const VALID_SUBJECTS = ["biology", "physics", "chemistry"] as const;
export type Subject = typeof VALID_SUBJECTS[number];

const nomicEmbeddings = new NomicEmbeddings({
    apiKey: env.NOMIC_API_KEY,
    model: "nomic-embed-text-v1.5",
});

export async function getVectorStore(
    subject: string,
    client: PineconeClient
) {
    if (!VALID_SUBJECTS.includes(subject as Subject)) {
        throw new Error(
            `Invalid subject "${subject}". Must be one of: ${VALID_SUBJECTS.join(", ")}`
        );
    }

    try {
        // .index() (lowercase) is the current Pinecone SDK method
        const index = client.index(env.PINECONE_INDEX);

        const vectorStore = await PineconeStore.fromExistingIndex(
            nomicEmbeddings,
            {
                pineconeIndex: index,
                textKey: "content",   // matches your metadata field name
                namespace: subject,   // "biology" | "physics" | "chemistry"
            }
        );

        return vectorStore;
    } catch (error) {
        console.error("Vector store retrieval error:", error);
        throw new Error("Something went wrong while getting vector store!");
    }
}
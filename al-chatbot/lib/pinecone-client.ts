// import { Pinecone } from '@pinecone-database/pinecone';
// import {env} from "@/lib/config.js";
// import {delay} from "@/lib/utils.js";
//
// let pineconeClientInstance: Pinecone | null = null;
//
// async function createIndex(pc: Pinecone) {
//     try {
//         await pc.createIndex({
//             name: env.PINECONE_INDEX,
//             dimension: 1536,
//             metric: "cosine",
//             spec: {
//                 serverless: {
//                     cloud: 'aws',
//                     region: env.PINECONE_ENVIRONMENT
//                 }
//             }
//         });
//
//         // console.log(`Waiting for ${env.INDEX_INIT_TIMEOUT}s for initialization...`);
//         // await delay(env.INDEX_INIT_TIMEOUT);
//         console.log("Index created !!");
//     } catch (error) {
//         console.error("error ", error);
//         throw new Error("Index creation failed");
//     }
// }
//
// async function initPineconeClient(subject: string) {
//     try {
//         // Initialize directly in the constructor
//         const pc = new Pinecone({
//             apiKey: env.PINECONE_API_KEY,
//         });
//
//         const indexName = env.PINECONE_INDEX;
//
//         // listIndexes returns an object with an 'indexes' array
//         const response = await pc.listIndexes();
//         const existingIndexes = response.indexes?.map((idx: { name: any; }) => idx.name) || [];
//
//         if (!existingIndexes.includes(indexName)) {
//             await createIndex(pc);
//         } else {
//             console.log("Index already exists!!");
//         }
//
//         return pc;
//     } catch (error) {
//         console.error("error", error);
//         throw new Error("Failed to initialize Pinecone Client");
//     }
// }
//
// export async function getPineconeClient(subject: string) {
//     if (!pineconeClientInstance) {
//         pineconeClientInstance = await initPineconeClient(subject);
//     }
//     return pineconeClientInstance;
// }

import { Pinecone } from '@pinecone-database/pinecone';
import { env } from "@/lib/config.js";

let pineconeClientInstance: Pinecone | null = null;

async function createIndex(pc: Pinecone) {
    try {
        await pc.createIndex({
            name: env.PINECONE_INDEX,
            dimension: 768, // nomic-embed-text-v1.5 outputs 768 dimensions
            metric: "cosine",
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: env.PINECONE_ENVIRONMENT
                }
            }
        });
        console.log("Index created!!");
    } catch (error) {
        console.error("error ", error);
        throw new Error("Index creation failed");
    }
}

async function initPineconeClient() {
    try {
        const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY });
        const indexName = env.PINECONE_INDEX;
        const response = await pc.listIndexes();
        const existingIndexes = response.indexes?.map((idx: { name: any }) => idx.name) || [];

        if (!existingIndexes.includes(indexName)) {
            await createIndex(pc);
        } else {
            console.log("Index already exists!!");
        }

        return pc;
    } catch (error) {
        console.error("error", error);
        throw new Error("Failed to initialize Pinecone Client");
    }
}

export async function getPineconeClient() {
    if (!pineconeClientInstance) {
        pineconeClientInstance = await initPineconeClient();
    }
    return pineconeClientInstance;
}
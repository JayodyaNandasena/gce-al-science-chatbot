import {NomicEmbeddings} from "@langchain/nomic";
import {PineconeStore} from "@langchain/pinecone";
import {Pinecone as PineconeClient} from "@pinecone-database/pinecone";
import {env} from "@/lib/config.js";

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
        const index = client.index(env.PINECONE_INDEX);

        const vectorStore = await PineconeStore.fromExistingIndex(
            nomicEmbeddings,
            {
                pineconeIndex: index,
                textKey: "content",   // matches metadata field name
                namespace: subject,
            }
        );

        return vectorStore;
    } catch (error) {
        console.error("Vector store retrieval error:", error);
        throw new Error("Something went wrong while getting vector store!");
    }
}
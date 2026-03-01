import z from "zod";

const envSchema = z.object({
    DB_HOST: z.string().trim().min(1),
    DB_PORT: z.coerce.number().int().positive(),
    DB_USER: z.string().trim().min(1),
    DB_PASSWORD: z.string().trim().min(1),
    DB_NAME: z.string().trim().min(1),
    JWT_SECRET: z.string().trim().min(16),
    JWT_EXPIRES_IN: z.string().trim().min(1),
    APP_URL: z.string().trim().min(1),
    SMTP_HOST: z.string().trim().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_SECURE: z.coerce.boolean(),
    SMTP_USER: z.string().trim().min(1),
    SMTP_PASSWORD: z.string().trim().min(1),
    EMAIL_FROM: z.string().trim().min(1),
    GROQ_API_KEY: z.string().trim().min(1),
    NOMIC_API_KEY: z.string().trim().min(1),
    PINECONE_API_KEY: z.string().trim().min(1),
    PINECONE_INDEX: z.string().trim().min(1),
    PINECONE_ENVIRONMENT: z.string().trim().min(1),
    NEXT_PUBLIC_APP_URL: z.string().trim().min(1),
});

export const env = envSchema.parse(process.env);

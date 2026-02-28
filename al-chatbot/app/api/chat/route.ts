import {NextRequest, NextResponse} from "next/server.js";
import {callChain} from "@/lib/langchain.js";

export async function POST(req: NextRequest) {
    const { question, chatHistory, subject } = await req.json();

    if (!question) {
        return NextResponse.json(
            { error: "No question in the request" },
            { status: 400 }
        );
    }

    try {
        const transformStream = new TransformStream();
        const readableStream = await callChain({
            question,
            chatHistory,
            transformStream,
            subject: subject.toLowerCase()
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error("Internal server error ", error);
        return NextResponse.json(
            { error: "Something went wrong. Try again!" },
            { status: 500 }
        );
    }
}

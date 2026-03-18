import {NextRequest, NextResponse} from "next/server.js";
import {callEvaluate, callEvaluateWithImage} from "@/lib/langchain.js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const contentType = req.headers.get("content-type") ?? "";
    const isImageSubmission = contentType.includes("multipart/form-data");

    try {
        if (isImageSubmission) {
            // Image path
            const form = await req.formData();

            const question = form.get("question") as string;
            const markingRaw = form.get("markingPoints") as string;
            const subject = form.get("subject") as string;
            const image = form.get("image") as File | null;

            if (!question || !image) {
                return NextResponse.json({error: "Missing question or image"}, {status: 400});
            }

            const markingPoints: { point: string; marks: number }[] = JSON.parse(markingRaw);
            const markingScheme = markingPoints
                .map((mp, i) => `${i + 1}. [${mp.marks} mark${mp.marks > 1 ? "s" : ""}] ${mp.point}`)
                .join("\n");

            // Convert the uploaded File → base64 string
            const arrayBuffer = await image.arrayBuffer();
            const imageBase64 = Buffer.from(arrayBuffer).toString("base64");
            const mediaType = image.type || "image/jpeg";

            const transformStream = new TransformStream();
            const readableStream = await callEvaluateWithImage({
                question,
                markingScheme,
                imageBase64,
                mediaType,
                transformStream,
                subject,
            });

            return new Response(readableStream, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });

        } else {
            // Text path
            const {question, userAnswer, markingPoints, subject} = await req.json();

            if (!question || !userAnswer) {
                return NextResponse.json({error: "No question or answer in the request"}, {status: 400});
            }

            const markingScheme = (markingPoints as { point: string; marks: number }[])
                .map((mp, i) => `${i + 1}. [${mp.marks} mark${mp.marks > 1 ? "s" : ""}] ${mp.point}`)
                .join("\n");

            const transformStream = new TransformStream();
            const readableStream = await callEvaluate({
                question,
                markingScheme,
                studentAnswer: userAnswer,
                transformStream,
                subject,
            });

            return new Response(readableStream, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        }
    } catch (error) {
        console.error("[evaluate/route] error:", error);
        return NextResponse.json({error: "Something went wrong. Try again!"}, {status: 500});
    }
}
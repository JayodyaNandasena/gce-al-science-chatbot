import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const VALID_SUBJECTS = ["biology", "chemistry", "physics"];

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject")?.toLowerCase();

    if (!subject || !VALID_SUBJECTS.includes(subject)) {
        return NextResponse.json({ error: "Invalid subject" }, { status: 400 });
    }

    const filePath = path.join(
        process.cwd(),
        "data",
        "questions",
        `${subject}.json`
    );

    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        return NextResponse.json(data);
    } catch {
        return NextResponse.json(
            { error: `Questions file for ${subject} not found` },
            { status: 404 }
        );
    }
}

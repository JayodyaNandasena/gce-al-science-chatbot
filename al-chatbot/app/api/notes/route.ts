import {NextRequest, NextResponse} from "next/server.js";
import path from "path";
import fs from "fs/promises";

const ALLOWED_SUBJECTS = new Set(["biology", "chemistry", "physics"]);

export async function GET(req: NextRequest) {
    const subject = req.nextUrl.searchParams.get("subject")?.toLowerCase();

    if (!subject || !ALLOWED_SUBJECTS.has(subject)) {
        return NextResponse.json({error: "Invalid subject"}, {status: 400});
    }

    const filePath = path.join(process.cwd(), "data", "notes", `${subject}.json`);

    try {
        const raw = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(raw);
        return NextResponse.json(data);
    } catch (e) {
        console.error(e);
        return NextResponse.json({error: "Notes not found"}, {status: 404});
    }
}
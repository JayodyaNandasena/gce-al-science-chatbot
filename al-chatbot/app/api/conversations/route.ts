import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import pool from '@/lib/db';

// List all chats
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const subject = req.nextUrl.searchParams.get('subject');

        const [rows] = await pool.execute(
            `SELECT id, subject, title, created_at, updated_at
             FROM conversations
             WHERE user_id = ?
               AND is_deleted = FALSE
               ${subject ? 'AND subject = ?' : ''}
             ORDER BY updated_at DESC`,
            subject ? [user.id, subject] : [user.id]
        );

        return NextResponse.json(rows);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }
}

// Create new chat
export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { subject } = await req.json();
        if (!subject) return NextResponse.json({ error: 'Subject is required' }, { status: 400 });

        const [result]: any = await pool.execute(
            `INSERT INTO conversations (user_id, subject, title) VALUES (?, ?, 'New Chat')`,
            [user.id, subject]
        );

        const [rows]: any = await pool.execute(
            `SELECT id, subject, title, created_at, updated_at
             FROM conversations WHERE id = ?`,
            [result.insertId]
        );

        return NextResponse.json(rows[0], { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }
}
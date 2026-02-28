import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import pool from '@/lib/db';

// get all messages
export async function GET(
    _: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { conversationId } = await params;

        const [conv]: any = await pool.execute(
            `SELECT id FROM conversations
             WHERE id = ? AND user_id = ? AND is_deleted = FALSE`,
            [conversationId, user.id]
        );
        if (!conv.length) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        const [rows]: any = await pool.execute(
            `SELECT id, role, content, sources, created_at
             FROM messages
             WHERE conversation_id = ?
             ORDER BY created_at ASC`,
            [conversationId]
        );

        const messages = rows.map((row: any) => ({
            ...row,
            sources: row.sources ?? [],
        }));

        return NextResponse.json(messages);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

// add new message
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { conversationId } = await params;

        const [conv]: any = await pool.execute(
            `SELECT id FROM conversations
             WHERE id = ? AND user_id = ? AND is_deleted = FALSE`,
            [conversationId, user.id]
        );
        if (!conv.length) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        const { role, content, sources } = await req.json();

        await pool.execute(
            `INSERT INTO messages (conversation_id, role, content, sources)
             VALUES (?, ?, ?, ?)`,
            [conversationId, role, content, sources ? JSON.stringify(sources) : null]
        );

        await pool.execute(
            `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ?`,
            [conversationId, user.id]
        );

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }
}
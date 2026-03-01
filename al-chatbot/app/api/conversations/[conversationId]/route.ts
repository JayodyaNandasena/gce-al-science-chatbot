import {NextRequest, NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import pool from '@/lib/db';

// update chat title
export async function PATCH(
    req: NextRequest,
    {params}: { params: Promise<{ conversationId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

        const {conversationId} = await params;
        const {title} = await req.json();
        if (!title) return NextResponse.json({error: 'Title is required'}, {status: 400});

        await pool.execute(
            `UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?`,
            [title, conversationId, user.id]
        );

        return NextResponse.json({success: true});
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: 'Failed to update conversation'}, {status: 500});
    }
}

// soft delete a chat
export async function DELETE(
    _: NextRequest,
    {params}: { params: Promise<{ conversationId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

        const {conversationId} = await params;

        await pool.execute(
            `UPDATE conversations SET is_deleted = TRUE WHERE id = ? AND user_id = ?`,
            [conversationId, user.id]
        );

        return NextResponse.json({success: true});
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: 'Failed to delete conversation'}, {status: 500});
    }
}
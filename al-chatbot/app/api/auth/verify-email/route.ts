import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find token
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, user_id, expires_at, used FROM email_verification_tokens WHERE token = ?',
      [token]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
    }

    const tokenRow = rows[0];

    if (tokenRow.used) {
      return NextResponse.json({ error: 'This verification link has already been used' }, { status: 400 });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Verification link has expired. Please sign up again.' }, { status: 400 });
    }

    // Mark email as verified and token as used
    await pool.execute('UPDATE users SET email_verified = TRUE WHERE id = ?', [tokenRow.user_id]);
    await pool.execute('UPDATE email_verification_tokens SET used = TRUE WHERE id = ?', [tokenRow.id]);

    return NextResponse.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

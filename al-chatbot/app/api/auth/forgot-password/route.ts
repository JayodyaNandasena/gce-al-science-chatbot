import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { RowDataPacket } from 'mysql2';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Always return success to prevent email enumeration
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ? AND email_verified = TRUE',
      [email.toLowerCase()]
    );

    if (rows.length) {
      const userId = rows[0].id;

      // Invalidate existing tokens
      await pool.execute(
        'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ? AND used = FALSE',
        [userId]
      );

      // Create new reset token (expires in 1 hour)
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await pool.execute(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [userId, token, expiresAt]
      );

      await sendPasswordResetEmail(email.toLowerCase(), token);
    }

    return NextResponse.json({
      message: 'If an account with that email exists, you will receive a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

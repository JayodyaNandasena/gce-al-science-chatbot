import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Find token
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = ?',
      [token]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    const tokenRow = rows[0];

    if (tokenRow.used) {
      return NextResponse.json({ error: 'This reset link has already been used' }, { status: 400 });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and mark token as used
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, tokenRow.user_id]);
    await pool.execute('UPDATE password_reset_tokens SET used = TRUE WHERE id = ?', [tokenRow.id]);

    return NextResponse.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

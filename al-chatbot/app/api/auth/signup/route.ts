import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';
import { RowDataPacket } from 'mysql2';

export async function POST(req: NextRequest) {
    try {
        const { email, password, name } = await req.json();

        // Validation
        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        // Check if user exists
        const [existing] = await pool.execute<RowDataPacket[]>(
            'SELECT id FROM users WHERE email = ?',
            [email.toLowerCase()]
        );
        if (existing.length > 0) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const [result] = await pool.execute(
            'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
            [email.toLowerCase(), passwordHash, name || null]
        ) as any;

        const userId = result.insertId;

        // Create verification token (expires in 24 hours)
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.execute(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
            [userId, token, expiresAt]
        );

        // Send verification email
        await sendVerificationEmail(email.toLowerCase(), token, name);

        return NextResponse.json({
            message: 'Account created. Please check your email to verify your account.',
        });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

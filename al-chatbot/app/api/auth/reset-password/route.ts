import {NextRequest, NextResponse} from 'next/server.js';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db.js';
import {RowDataPacket} from 'mysql2';

export async function POST(req: NextRequest) {
    let connection;

    try {
        const {token, password} = await req.json();

        if (!token || !password) {
            return NextResponse.json(
                {error: 'Token and password are required'},
                {status: 400}
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                {error: 'Password must be at least 8 characters'},
                {status: 400}
            );
        }

        connection = await pool.getConnection();

        // Start transaction
        await connection.beginTransaction();

        // Find token
        const [rows] = await connection.execute<RowDataPacket[]>(
            `SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = ? FOR UPDATE`, [token]
        );

        if (!rows.length) {
            await connection.rollback();
            return NextResponse.json(
                {error: 'Invalid or expired reset link'},
                {status: 400}
            );
        }

        const tokenRow = rows[0];

        if (tokenRow.used) {
            await connection.rollback();
            return NextResponse.json(
                {error: 'This reset link has already been used'},
                {status: 400}
            );
        }

        if (new Date(tokenRow.expires_at) < new Date()) {
            await connection.rollback();
            return NextResponse.json(
                {error: 'Reset link has expired. Please request a new one.'},
                {status: 400}
            );
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update user password
        await connection.execute(
            `UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, tokenRow.user_id]
        );

        // Mark token as used
        await connection.execute(
            `UPDATE password_reset_tokens SET used = TRUE WHERE id = ?`, [tokenRow.id]
        );

        // Commit transaction
        await connection.commit();

        return NextResponse.json({
            message: 'Password reset successfully. You can now log in with your new password.'
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error('Reset password error:', error);

        return NextResponse.json(
            {error: 'Internal server error'},
            {status: 500}
        );

    } finally {
        if (connection) connection.release();
    }
}
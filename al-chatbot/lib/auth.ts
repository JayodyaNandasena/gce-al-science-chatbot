import { cookies } from 'next/headers';
import { verifyToken } from './jwt';
import pool from './db';
import { RowDataPacket } from 'mysql2';

export interface User {
    id: number;
    email: string;
    name: string | null;
    email_verified: boolean;
}

export async function getCurrentUser(): Promise<User | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return null;

        const payload = verifyToken(token);
        if (!payload) return null;

        const [rows] = await pool.execute<RowDataPacket[]>(
            'SELECT id, email, name, email_verified FROM users WHERE id = ?',
            [payload.userId]
        );

        if (!rows.length) return null;
        return rows[0] as User;
    } catch {
        return null;
    }
}
import jwt from 'jsonwebtoken';
import {env} from "@/lib/config.js";

const JWT_SECRET = env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
    userId: number;
    email: string;
}

export function signToken(payload: JWTPayload): string {
    return jwt.sign(
        payload,
        JWT_SECRET,
        {expiresIn: JWT_EXPIRES_IN} as jwt.SignOptions
    );
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

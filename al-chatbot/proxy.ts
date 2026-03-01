import {NextRequest, NextResponse} from 'next/server';
import {verifyToken} from './lib/jwt';

const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'];
const authRoutes = ['/login', '/signup'];

export function proxy(req: NextRequest) {
    const {pathname} = req.nextUrl;
    const token = req.cookies.get('auth-token')?.value;
    const isAuthenticated = token ? !!verifyToken(token) : false;

    // Redirect authenticated users away from auth pages
    if (isAuthenticated && authRoutes.some(r => pathname.startsWith(r))) {
        return NextResponse.redirect(new URL('/chat', req.url));
    }

    // Redirect unauthenticated users from protected pages
    const isPublic = publicRoutes.some(r => pathname.startsWith(r)) || pathname === '/';
    if (!isAuthenticated && !isPublic) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
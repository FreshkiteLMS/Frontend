import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // Check if token exists (basic auth check)
    const hasToken = !!token && token.length > 0;

    // Public paths accessible without authentication
    const publicPaths = ['/', '/login', '/signup', '/team', '/success-stories'];
    // Shared profiles (/u/:username) are viewable signed out; the API decides what's public.
    if (publicPaths.includes(pathname) || pathname.startsWith('/u/')) {
        // If logged-in user visits login/signup, redirect to home
        if (hasToken && (pathname === '/login' || pathname === '/signup')) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Protect all other routes. Remember where the user was going (e.g. an
    // invite link) so login can send them straight back.
    if (!hasToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};

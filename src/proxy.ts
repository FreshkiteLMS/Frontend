import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // Check if token exists (basic auth check)
    const hasToken = !!token && token.length > 0;

    // Public paths accessible without authentication
    const publicPaths = ['/', '/login', '/signup', '/team', '/success-stories'];
    if (publicPaths.includes(pathname)) {
        // If logged-in user visits login/signup, redirect to home
        if (hasToken && (pathname === '/login' || pathname === '/signup')) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Protect all other routes
    if (!hasToken) {
        return NextResponse.redirect(new URL('/login', request.url));
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

import { NextResponse, NextRequest } from 'next/server';

export const config = {
    matcher: ['/((?!_next/|api/|static/|.*\\.\w+$).*)'],
};

export function middleware(req: NextRequest) {
    const res = NextResponse.next();

    // Security headers
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Basic CSP (adjust for images/buckets/providers)
    const appwrite = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '';
    const openmoderator = 'https://api.openmoderator.com';
    const csp = [
        "default-src 'self'",
        // Allow inline due to Next/font and early theme script; avoid remote third-party scripts
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
        "font-src 'self' fonts.gstatic.com",
        // Images from self, data/blob, and Appwrite storage/view URLs; allow https fallback but avoid wildcard hosts
        `img-src 'self' data: blob: ${appwrite} https:`,
        // Network calls to Appwrite (https/wss) and OpenModerator; allow https for fonts and Next data
        `connect-src 'self' ${appwrite} ${openmoderator} https: wss:`,
        "frame-ancestors 'none'",
    ].join('; ');
    res.headers.set('Content-Security-Policy', csp);

    // Auth redirect logic using a lightweight cookie set on login
    const isLogin = req.nextUrl.pathname.startsWith('/login');
    const isMagic = req.nextUrl.pathname.startsWith('/magic');
    const isPublic = isLogin || isMagic || req.nextUrl.pathname === '/' || req.nextUrl.pathname.startsWith('/about') || req.nextUrl.pathname.startsWith('/contact') || req.nextUrl.pathname.startsWith('/faq') || req.nextUrl.pathname.startsWith('/privacy') || req.nextUrl.pathname.startsWith('/terms');
    const authed = req.cookies.get('d_auth')?.value === '1';

    if (isLogin && authed) {
        return NextResponse.redirect(new URL('/dashboard', req.url), { headers: res.headers });
    }
    if (!isPublic && !authed) {
        return NextResponse.redirect(new URL('/login', req.url), { headers: res.headers });
    }

    return res;
}



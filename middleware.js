import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { authMiddleware } from 'next-auth/middleware';

// Security headers helper
function setSecurityHeaders(response) {
  const headers = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'",
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Expect-CT': 'max-age=86400, enforce',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-XSS-Protection': '0',
  };

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export async function middleware(request) {
  const url = new URL(request.url);

  // Auth Middleware
  const authResult = await authMiddleware(request);
  const response = authResult ?? NextResponse.next();

  // Add security headers
  setSecurityHeaders(response);

  // Auth-based redirects
  const token = await getToken({ req: request });

  const publicPaths = ['/sign-in', '/sign-up', '/verify', '/'];
  const isPublicPath = publicPaths.some((path) => url.pathname.startsWith(path));

  if (token && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!token && url.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/sign-in',
    '/sign-up',
    '/verify',
    '/',
    '/dashboard/:path*',
    '/about/:path*',
  ],
};
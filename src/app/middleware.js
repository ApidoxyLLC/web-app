import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';


// Security headers helper
function setSecurityHeaders(response) {



  const headers = {
    'X-Frame-Options': 'DENY',
    // 'Content-Security-Policy': `default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests`,
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
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || request.ip || 'unknown';
  console.log('IP Address:', ip);

  // Auth Middleware

  const response = NextResponse.next();

  // Add security headers
  // setSecurityHeaders(response);

  // Auth-based redirects
  // const token = await getToken({ req: request });

  // const publicPaths = ['/sign-in', '/sign-up', '/verify', '/'];
  // const isPublicPath = publicPaths.some((path) => url.pathname.startsWith(path));

  // if (token && isPublicPath) {
  //   return NextResponse.redirect(new URL('/dashboard', request.url));
  // }

  // if (!token && url.pathname.startsWith('/dashboard')) {
  //   return NextResponse.redirect(new URL('/home', request.url));
  // }

  return response;
}

export const config = {
  matcher: [
    '/login',
    '/sign-up',
    '/verify',
    '/',
    '/dashboard/:path*',
    '/about/:path*',
  ],
};
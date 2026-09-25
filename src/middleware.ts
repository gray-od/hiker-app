import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEFAULT_LOCALE = 'uk';
const SUPPORTED_LOCALES = ['uk', 'ru', 'en'] as const;

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as typeof SUPPORTED_LOCALES[number])) {
    return cookieLocale;
  }
  const acceptLang = request.headers.get('accept-language') || '';
  const preferred = acceptLang.split(',')[0]?.split('-')[0];
  if (preferred && SUPPORTED_LOCALES.includes(preferred as typeof SUPPORTED_LOCALES[number])) {
    return preferred;
  }
  return DEFAULT_LOCALE;
}

// supabase-js stores the session under "sb-<project-ref>-auth-token", where the ref
// is the first hostname label of the project URL; oversized values are split into
// "<name>.0", "<name>.1", ... chunks.
function getAuthCookieName(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  try {
    const ref = new URL(supabaseUrl).hostname.split('.')[0];
    return ref ? `sb-${ref}-auth-token` : null;
  } catch {
    // Unparseable URL: nothing to gate on; failing open beats failing every request.
    return null;
  }
}

export default function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const locale = getLocale(request);

  // Local cookie-presence check only, no Supabase call: a server-side getUser()
  // rotates the refresh token and ships the replacement in Set-Cookie, so any
  // dropped response (reconnect, discarded redirect headers) would leave the
  // browser with a consumed token and the next refresh would revoke the session.
  // The browser client owns rotation; page guards (resolveUser) decide identity.
  const authCookieName = getAuthCookieName();
  // Env missing/unparseable leaves the name unknown; fail open, page guards still run.
  const hasSessionCookie = authCookieName
    ? request.cookies.has(authCookieName) || request.cookies.has(`${authCookieName}.0`)
    : true;

  const publicRoutes = ['/login', '/privacy', '/forgot-password'];
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route + '/'));

  if (!hasSessionCookie && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  response.cookies.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

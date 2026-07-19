import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
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

export default async function middleware(request: NextRequest) {
  let response = NextResponse.next();
  const locale = getLocale(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, { ...options, secure: true, sameSite: 'lax', path: '/' });
          });
        },
      },
    },
  );

  await supabase.auth.getUser();

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

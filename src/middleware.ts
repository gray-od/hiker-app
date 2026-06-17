import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Handle i18n routing first
  const response = intlMiddleware(request);

  // Refresh Supabase session and merge auth cookies into the response
  const supabaseResponse = await updateSession(request);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

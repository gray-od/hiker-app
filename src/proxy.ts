import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  const supabaseResponse = await updateSession(request);
  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|auth|.*\\..*).*)'],
};

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { serializeCookie } from './cookieHeader';

/**
 * Current user for a Pages Router API route.
 *
 * getUser() on the server can rotate the refresh token and returns the replacement
 * via Set-Cookie; dropping that response leaves the browser holding a consumed token
 * and the next refresh revokes the session (same hazard documented in
 * src/middleware.ts). This helper wires a real response path so rotation survives,
 * and callers stay free of cookie handling.
 *
 * Throws only if Supabase throws; auth failures resolve to null so each route keeps
 * its own 401 handling.
 */
export async function getRouteUser(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<User | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(req.cookies).map(([name, value]) => ({
            name,
            value: value as string,
          }));
        },
        setAll(cookiesToSet, headers) {
          if (cookiesToSet.length > 0) {
            // Preserve Set-Cookie entries other parts of the request may already have set.
            const existing = res.getHeader('Set-Cookie');
            const setCookies: string[] = existing
              ? (Array.isArray(existing) ? existing.map(String) : [String(existing)])
              : [];
            cookiesToSet.forEach(({ name, value, options }) => {
              setCookies.push(serializeCookie(name, value, options));
            });
            res.setHeader('Set-Cookie', setCookies);
          }
          // supabase/ssr requires no-store alongside auth cookies so a shared cache
          // can never serve one user's session token to another.
          Object.entries(headers).forEach(([key, headerValue]) => {
            res.setHeader(key, headerValue);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

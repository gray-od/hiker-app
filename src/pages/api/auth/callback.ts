import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || 'localhost:3000';
  const origin = `${protocol}://${host}`;

  const { searchParams } = new URL(req.url!, origin);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
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
          setAll(cookiesToSet) {
            const setCookies: string[] = [];
            cookiesToSet.forEach(({ name, value, options }) => {
              const parts = [`${name}=${encodeURIComponent(value)}`];
              if (options?.maxAge) parts.push(`Max-Age=${options.maxAge}`);
              if (options?.path) parts.push(`Path=${options.path}`);
              if (options?.domain) parts.push(`Domain=${options.domain}`);
              if (options?.secure) parts.push('Secure');
              if (options?.httpOnly) parts.push('HttpOnly');
              if (options?.sameSite) parts.push(`SameSite=${options.sameSite}`);
              setCookies.push(parts.join('; '));
            });
            if (setCookies.length > 0) {
              res.setHeader('Set-Cookie', setCookies);
            }
          },
        },
      },
    );

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        res.redirect(302, `${origin}${next}`);
        return;
      }
    } catch {
      res.redirect(302, `${origin}/login?error=auth_failed`);
      return;
    }
  }

  res.redirect(302, `${origin}/login?error=auth_failed`);
}

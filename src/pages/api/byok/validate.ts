import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { validateAiKey } from '@/lib/ai-providers';
import { validateSearchKey } from '@/lib/search-providers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

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
        setAll() {},
      },
    },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let body: { kind?: string; config?: Record<string, unknown> };
  try {
    body = req.body;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  try {
    const { kind, config } = body;

    let result: { ok: boolean; error?: string };

    if (kind === 'ai') {
      result = await validateAiKey(config);
    } else if (kind === 'search') {
      result = await validateSearchKey(config);
    } else {
      result = { ok: false, error: 'bad request' };
    }

    res.status(200).json(result);
  } catch {
    res.status(200).json({ ok: false, error: 'server error' });
  }
}

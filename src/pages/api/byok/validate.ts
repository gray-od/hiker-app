import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAiKey } from '@/lib/ai-providers';
import { validateSearchKey } from '@/lib/search-providers';
import { getRouteUser } from '@/lib/supabase/routeAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const user = await getRouteUser(req, res);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { kind, config } = req.body;

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
    res.status(500).json({ ok: false, error: 'server error' });
  }
}

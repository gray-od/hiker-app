import type { NextApiRequest, NextApiResponse } from 'next';
import { validateAiKey } from '@/lib/ai-providers';
import { validateSearchKey } from '@/lib/search-providers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

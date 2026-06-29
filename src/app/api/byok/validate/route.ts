import { validateAiKey } from '@/lib/ai-providers';
import { validateSearchKey } from '@/lib/search-providers';

export async function POST(req: Request) {
  let body: { kind?: string; config?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
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

    return Response.json(result);
  } catch {
    return Response.json({ ok: false, error: 'server error' });
  }
}

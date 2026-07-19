import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '@supabase/ssr';
import { pbkdf2Sync, randomBytes } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { question, answer } = req.body;

    if (!question || !answer) {
      res.status(400).json({ error: 'Question and answer are required' });
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

    const salt = randomBytes(16).toString('hex');
    const answerHash = pbkdf2Sync(answer, salt, 100000, 64, 'sha512').toString('hex');

    const { error: insertError } = await supabase
      .from('user_security')
      .insert({
        user_id: user.id,
        email: user.email?.toLowerCase(),
        question,
        answer_hash: answerHash,
        salt,
      });

    if (insertError) {
      res.status(500).json({ error: 'Failed to save security question' });
      return;
    }

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

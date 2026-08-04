import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: records, error: lookupError } = await adminClient.rpc('lookup_security_record', {
      p_email: email.toLowerCase(),
    });

    // Always return a question — never reveal whether email exists
    const question =
      !lookupError && records && records.length > 0
        ? records[0].question
        : 'What is your favorite color?';

    res.status(200).json({ question });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getRouteUser } from '@/lib/supabase/routeAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const user = await getRouteUser(req, res);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!user.email) {
      res.status(200).json({ hasQuestion: false });
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

    // Only the record's existence is used; the question text and answer hash
    // never leave the server through this route.
    const { data: records, error: lookupError } = await adminClient.rpc('lookup_security_record', {
      p_email: user.email.toLowerCase(),
    });

    if (lookupError) {
      // An unavailable check must not read as "no question": the caller would tell
      // the user their recovery is not set up when it actually is.
      res.status(500).json({ error: 'Failed to check security question' });
      return;
    }

    res.status(200).json({ hasQuestion: Boolean(records && records.length > 0) });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

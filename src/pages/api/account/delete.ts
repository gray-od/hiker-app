import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getRouteUser } from '@/lib/supabase/routeAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const { email } = req.body ?? {};

    if (typeof email !== 'string' || email.length === 0 || email.length > 254) {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }

    const user = await getRouteUser(req, res);

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (user.email?.toLowerCase() !== email.toLowerCase()) {
      res.status(400).json({ error: 'Email mismatch' });
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
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      res.status(500).json({ error: 'Failed to delete account' });
      return;
    }

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

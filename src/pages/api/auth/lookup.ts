import type { NextApiRequest, NextApiResponse } from 'next';

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

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_security?select=question&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`;

    const response = await fetch(url, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      res.status(404).json({ error: 'No recovery record found' });
      return;
    }

    const records = await response.json();
    if (!records || records.length === 0) {
      res.status(404).json({ error: 'No recovery record found' });
      return;
    }

    res.status(200).json({ question: records[0].question });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { pbkdf2Sync, timingSafeEqual } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { email, answer, newPassword } = req.body;
    if (!email || !answer || !newPassword) {
      res.status(400).json({ error: 'Email, answer, and new password are required' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters' });
      return;
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${serviceRoleKey}`,
    };

    // Look up security record
    const lookupRes = await fetch(
      `${baseUrl}/rest/v1/user_security?select=*&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`,
      { headers },
    );

    if (!lookupRes.ok) {
      res.status(404).json({ error: 'No recovery record found for this email' });
      return;
    }

    const records = await lookupRes.json();
    if (!records || records.length === 0) {
      res.status(404).json({ error: 'No recovery record found for this email' });
      return;
    }

    const record = records[0];

    // Check if locked
    if (record.locked_until) {
      if (new Date(record.locked_until).getTime() > Date.now()) {
        res.status(429).json({ error: 'too_many_attempts' });
        return;
      }
    }

    // Verify answer
    const hash = pbkdf2Sync(answer, record.salt, 100000, 64, 'sha512');
    const storedHash = Buffer.from(record.answer_hash, 'hex');

    let answerMatches = false;
    if (hash.length === storedHash.length) {
      answerMatches = timingSafeEqual(hash, storedHash);
    }

    if (!answerMatches) {
      const attempts = (record.attempts || 0) + 1;
      const patchBody: Record<string, unknown> = { attempts };
      if (attempts >= 5) {
        patchBody.locked_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }
      await fetch(`${baseUrl}/rest/v1/user_security?user_id=eq.${encodeURIComponent(record.user_id)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(patchBody),
      });
      res.status(403).json({ error: 'wrong_answer' });
      return;
    }

    // Reset attempts
    await fetch(`${baseUrl}/rest/v1/user_security?user_id=eq.${encodeURIComponent(record.user_id)}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ attempts: 0, locked_until: null }),
    });

    // Update password
    const adminClient = createClient(baseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      record.user_id,
      { password: newPassword },
    );

    if (updateError) {
      res.status(500).json({ error: 'Failed to reset password' });
      return;
    }

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

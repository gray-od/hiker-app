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

    const { data: records, error: lookupError } = await adminClient
      .from('user_security')
      .select('*')
      .eq('email', email.toLowerCase())
      .limit(1);

    if (lookupError || !records || records.length === 0) {
      res.status(404).json({ error: 'No recovery record found for this email' });
      return;
    }

    const record = records[0];

    // Check if locked
    if (record.locked_until) {
      const lockedUntil = new Date(record.locked_until).getTime();
      if (lockedUntil > Date.now()) {
        res.status(429).json({ error: 'too_many_attempts' });
        return;
      }
    }

    // Verify answer with PBKDF2 constant-time comparison
    const hash = pbkdf2Sync(answer, record.salt, 100000, 64, 'sha512');
    const storedHash = Buffer.from(record.answer_hash, 'hex');

    let answerMatches = false;
    if (hash.length === storedHash.length) {
      answerMatches = timingSafeEqual(hash, storedHash);
    }

    if (!answerMatches) {
      const attempts = (record.attempts || 0) + 1;
      const update: Record<string, unknown> = { attempts };

      if (attempts >= 5) {
        // Lock for 24 hours
        update.locked_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }

      await adminClient.from('user_security').update(update).eq('user_id', record.user_id);

      res.status(403).json({ error: 'wrong_answer' });
      return;
    }

    // Correct answer — reset attempts and update password
    await adminClient.from('user_security').update({
      attempts: 0,
      locked_until: null,
    }).eq('user_id', record.user_id);

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

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, isAuthRetryableFetchError, type User } from '@supabase/supabase-js';
import { pbkdf2Sync, randomBytes } from 'crypto';
import { getRouteUser } from '@/lib/supabase/routeAuth';

// Accounts created through Google have no password: their identities hold only the
// OAuth provider. When identities are absent (older stored sessions), fall back to
// app_metadata.providers; anything unknown defaults to "password required".
function hasPasswordIdentity(user: User): boolean {
  if (user.identities && user.identities.length > 0) {
    return user.identities.some((identity) => identity.provider === 'email');
  }
  const providers = user.app_metadata?.providers;
  if (providers) return providers.includes('email');
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { question, answer, currentPassword } = req.body ?? {};
    if (!question || !answer) {
      res.status(400).json({ error: 'Question and answer are required' });
      return;
    }

    const user = await getRouteUser(req, res);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // A stolen session alone must not replace the recovery question — from there the
    // password could be reset without ever knowing it. Accounts with a password
    // identity prove the password here; Google-only accounts have none to prove.
    if (hasPasswordIdentity(user)) {
      if (
        typeof currentPassword !== 'string' ||
        currentPassword.length < 6 ||
        currentPassword.length > 72
      ) {
        res.status(400).json({ error: 'invalid_request' });
        return;
      }
      if (!user.email) {
        // Nothing to verify against — this must not fall through as if the account
        // had no password at all.
        res.status(503).json({ error: 'verify_unavailable' });
        return;
      }
      const authClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
      const { error: verifyError } = await authClient.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyError) {
        // Network/5xx failures and GoTrue rate limits mean the password was not
        // evaluated, so they must not be reported as wrong; GoTrue's own message
        // stays internal either way.
        if (isAuthRetryableFetchError(verifyError) || verifyError.status === 429) {
          res.status(503).json({ error: 'verify_unavailable' });
          return;
        }
        res.status(403).json({ error: 'wrong_password' });
        return;
      }
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

    const salt = randomBytes(16).toString('hex');
    const answerHash = pbkdf2Sync(answer, salt, 100000, 64, 'sha512').toString('hex');

    const { error: rpcError } = await adminClient.rpc('upsert_security_record', {
      p_user_id: user.id,
      p_email: user.email?.toLowerCase(),
      p_question: question,
      p_answer_hash: answerHash,
      p_salt: salt,
    });

    if (rpcError) {
      res.status(500).json({ error: 'Failed to save security question' });
      return;
    }

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

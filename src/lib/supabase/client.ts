import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// supabase-js' signOut() removes the stored session only after the auth
// server answers: even `{ scope: 'local' }` POSTs /logout first and
// GoTrueClient._signOut returns on a network error before _removeSession
// runs. Clear the session through the client's own storage adapter — the
// same removal _removeSession performs — so a failed sign-out cannot leave
// a valid session behind.
export async function clearStoredSession(client: SupabaseClient): Promise<boolean> {
  try {
    const { storage, storageKey } = client.auth as unknown as {
      storage: {
        getItem: (key: string) => Promise<string | null> | string | null;
        removeItem: (key: string) => Promise<void> | void;
      };
      storageKey: string;
    };
    if (typeof storageKey !== 'string' || storageKey.length === 0) {
      return false;
    }
    await storage.removeItem(storageKey);
    await storage.removeItem(`${storageKey}-code-verifier`);
    return !(await storage.getItem(storageKey));
  } catch {
    // Report the failure to the caller instead of pretending it worked.
    return false;
  }
}

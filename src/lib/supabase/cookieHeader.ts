import type { CookieOptions } from '@supabase/ssr';

/**
 * Set-Cookie header value for one auth cookie.
 *
 * maxAge is emitted for every defined value, including 0: that is how
 * @supabase/ssr clears stale cookie chunks, and a truthiness check would drop
 * the deletion, leaving expired chunks next to the freshly written token. For
 * maxAge <= 0 a past Expires is added as well, since some clients read only
 * that attribute.
 */
export function serializeCookie(name: string, value: string, options?: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options?.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options?.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  } else if (options?.maxAge !== undefined && options.maxAge <= 0) {
    parts.push(`Expires=${new Date(0).toUTCString()}`);
  }
  if (options?.path) parts.push(`Path=${options.path}`);
  if (options?.domain) parts.push(`Domain=${options.domain}`);
  if (options?.secure) parts.push('Secure');
  if (options?.httpOnly) parts.push('HttpOnly');
  if (options?.sameSite) {
    parts.push(`SameSite=${options.sameSite === true ? 'Strict' : options.sameSite}`);
  }
  return parts.join('; ');
}

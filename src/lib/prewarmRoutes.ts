// Private documents to keep in the service worker's page cache (`pages-<buildId>`).
// SPA clicks never reach the worker's navigation handler, so without this the cache
// only fills on a full document load (F5) and an offline tap on Android — where
// there is no F5 — falls through to /offline.html. Dynamic `[id]`, print and
// shopping pages are excluded: they are per-record views nothing links to directly.
const ROUTES = ['/', '/gear', '/food', '/lists', '/meals', '/settings'];

const MAX_CONCURRENT_REQUESTS = 3;

// On the reconnect event the browser reloads the page, which runs this module
// again, so one run per loaded document is enough.
let started = false;

/**
 * Fetch the private pages so the service worker stores their documents in the page
 * cache. Best-effort by design: any failure is dropped, nothing is surfaced.
 */
export async function prewarmRoutes(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.onLine || started) return;
  started = true;

  const pending = [...ROUTES];
  const warm = async () => {
    for (let route = pending.shift(); route !== undefined; route = pending.shift()) {
      try {
        // `x-prohikes-prewarm` is what the worker's matcher in src/sw.ts keys on;
        // `no-store` keeps the HTTP cache out of the way, the Cache API is the target.
        await fetch(route, {
          headers: { 'x-prohikes-prewarm': '1' },
          credentials: 'same-origin',
          cache: 'no-store',
        });
      } catch {
        // Offline mid-run or a response the worker refused: this document stays
        // uncached and offline navigation falls back to /offline.html as before.
      }
    }
  };

  await Promise.all(Array.from({ length: MAX_CONCURRENT_REQUESTS }, () => warm()));
}

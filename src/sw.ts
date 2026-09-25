/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  ExpirationPlugin,
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
} from "serwist";
import type { RuntimeCaching } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  skipWaiting(): Promise<void>;
  clients: Clients;
};

// Navigation (HTML): NetworkFirst, short TTL, no IDB — in-memory only
// JS/CSS: CacheFirst (webpack revisions), long TTL
// Images: StaleWhileRevalidate
// Fonts: CacheFirst, very long TTL
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ request }) => request.mode === "navigate",
    handler: new NetworkFirst({
      cacheName: "pages",
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        }),
      ],
    }),
  },
  {
    matcher: ({ request }) =>
      request.destination === "script" || request.destination === "style",
    handler: new CacheFirst({
      cacheName: "static-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        }),
      ],
    }),
  },
  {
    matcher: ({ request }) => request.destination === "image",
    handler: new StaleWhileRevalidate({
      cacheName: "images",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
        }),
      ],
    }),
  },
  {
    matcher: ({ request }) => request.destination === "font",
    handler: new CacheFirst({
      cacheName: "fonts",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Built-in cleanup deletes only outdated `serwist-*-precache-*` caches from
  // previous library versions (same scope, excluding the current precache).
  // The custom activate handler below must not do this itself — it only
  // removes caches that belong to no SW version of this project.
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching,
});

// Offline fallback for navigations: serve the document cached for this exact
// URL, or the same URL without its query string. Anything else must fail:
// returning `undefined` lets the fetch reject so the browser shows its own
// offline error. Serving another route's document (e.g. the homepage) would
// render a page that does not belong to the requested URL.
serwist.setCatchHandler(async ({ request }) => {
  if (request.mode === "navigate") {
    const cache = await caches.open("pages");
    const cached = await cache.match(request);
    if (cached) return cached;
    // NetworkFirst's own cache lookup is exact-only; retry ignoring search.
    // No document for this URL: resolve with `undefined` so `respondWith`
    // fails and the browser reports the network error. The cast only satisfies
    // Serwist's types, which require a Response value.
    return (await cache.match(request, { ignoreSearch: true })) as Response;
  }
  return Response.error();
});

serwist.addEventListeners();

// Remove caches left behind by earlier SW versions that this project no longer
// uses. Serwist's own caches (`serwist-*` / `workbox-*`, including the
// precache) and the four named runtime caches are kept; outdated Serwist
// precaches are handled by `precacheOptions.cleanupOutdatedCaches` above.
const keepCacheNames = new Set(["pages", "static-assets", "images", "fonts"]);

self.addEventListener("activate", (event) => {
  (event as ExtendableEvent).waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith("serwist-") && !key.startsWith("workbox-") && !keepCacheNames.has(key))
          .map((key) => caches.delete(key))
      )
    )
  );
});

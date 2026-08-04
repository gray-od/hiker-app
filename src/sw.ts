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
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching,
});

// Offline fallback: when navigation fails (offline + not in cache),
// serve cached homepage or inline HTML instead of browser error page
serwist.setCatchHandler(async ({ request }) => {
  if (request.mode === 'navigate') {
    const cache = await caches.open('pages');
    const cached = await cache.match('/');
    if (cached) return cached;
    return new Response(
      '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0a0a0a;color:#fff"><div style="text-align:center"><h1 style="color:#75a93a">ProHikes</h1><p>You are offline</p><p style="color:#888">Check your connection and try again</p></div></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
  return Response.error();
});

serwist.addEventListeners();

// Clean up orphaned caches from previous SW versions on activate
self.addEventListener('activate', (event) => {
  (event as ExtendableEvent).waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith('workbox-') && key !== 'pages' && key !== 'static-assets' && key !== 'images' && key !== 'fonts')
          .map((key) => caches.delete(key))
      )
    )
  );
});

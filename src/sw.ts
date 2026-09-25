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

// Precache only: the file never changes except on deploy, and a revision
// change in public/ is enough for Serwist to fetch it again.
const OFFLINE_URL = "/offline.html";

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
      plugins: [new ExpirationPlugin({ maxEntries: 50 })],
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
  precacheOptions: { cleanupOutdatedCaches: true },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching,
});

// Last resort if even the Cache API is unusable. A navigation must never be
// answered with `undefined` (ERR_FAILED) or `Response.error()` (also ERR_FAILED).
const INLINE_OFFLINE_HTML =
  '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
  '<body style="font-family:sans-serif;background:#0a0a0a;color:#fff;text-align:center;padding-top:20vh">' +
  '<h1 style="color:#75a93a">ProHikes</h1><p>You are offline</p></body>';

// Order for navigations: this URL's document -> the same URL without query ->
// the precached /offline.html -> inline HTML. Never `undefined`.
serwist.setCatchHandler(async ({ request }) => {
  if (request.mode !== "navigate") {
    return Response.error();
  }
  try {
    const cache = await caches.open("pages");
    const cached =
      (await cache.match(request)) ??
      (await cache.match(request, { ignoreSearch: true }));
    if (cached) return cached;

    const offlinePage = await serwist.matchPrecache(OFFLINE_URL);
    if (offlinePage) return offlinePage;
  } catch {
    // Cache Storage unavailable: fall through to the inline page.
  }
  return new Response(INLINE_OFFLINE_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});

serwist.addEventListeners();

const keepCacheNames = new Set(["pages", "static-assets", "images", "fonts"]);

self.addEventListener("activate", (event) => {
  (event as ExtendableEvent).waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              !key.startsWith("serwist-") &&
              !key.startsWith("workbox-") &&
              !keepCacheNames.has(key),
          )
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});

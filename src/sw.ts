/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  ExpirationPlugin,
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

// `self.__SW_MANIFEST` must remain the only occurrence of the injection point:
// @serwist/build rejects a SW source with more than one ("multiple-injection-points").
// Hoisting it once keeps the manifest readable by the rest of the worker.
const precacheEntries = self.__SW_MANIFEST ?? [];

// Next embeds the build id into the precached path /_next/static/<buildId>/_buildManifest.js.
// Deriving the documents cache name from it means a document from a previous build can
// never be served: serwist deletes every stale precache entry on activate, so the old
// document's chunks are already gone by the time we would have served it.
const BUILD_ID =
  precacheEntries
    .map((entry) => (typeof entry === "string" ? entry : entry.url))
    .map((url) => /\/_next\/static\/([^/]+)\/(?:_buildManifest|_ssgManifest)\.js$/.exec(url)?.[1])
    .find((id): id is string => !!id) ?? "dev";

const PAGES_CACHE = `pages-${BUILD_ID}`;
const OFFLINE_URL = "/offline.html";

// Next issues /_next/data/<buildId>/<path>.json on every client navigation while a
// middleware is configured (next/dist/shared/lib/router/router.js:1382, 1391-1392).
// A failed fetch there is treated as an asset error (:388-393) and degrades the SPA
// transition into a hard navigation (:1304-1317) — offline that means a full document
// load, which is why dynamic routes ended up on /offline.html. No page here loads props
// (no getStaticProps/getServerSideProps), so an empty payload keeps the SPA alive and
// skips the network wait. Abort keeps a dead-but-"online" link (lie-fi) from holding
// the navigation for tens of seconds.
const DATA_FALLBACK_TIMEOUT_MS = 4000;
const DATA_FALLBACK_BODY = '{"pageProps":{}}';

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin &&
      request.method === "GET" &&
      url.pathname.startsWith("/_next/data/"),
    handler: async ({ request }) => {
      try {
        return await fetch(request, {
          signal: AbortSignal.timeout(DATA_FALLBACK_TIMEOUT_MS),
        });
      } catch {
        return new Response(DATA_FALLBACK_BODY, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
  },
  {
    // Navigations and the client's prewarm fetches (src/lib/prewarmRoutes.ts) both
    // have to end up in the document cache; the header is their only distinction.
    // StaleWhileRevalidate, not NetworkFirst: an offline navigation must never wait
    // on the network. The cache name carries the build id (see BUILD_ID), so a
    // document from a previous build can never be served, and the HTML carries no
    // data (no page defines getStaticProps/getServerSideProps).
    matcher: ({ request, sameOrigin }) =>
      request.mode === "navigate" ||
      (sameOrigin &&
        request.method === "GET" &&
        request.headers.get("x-prohikes-prewarm") === "1"),
    handler: new StaleWhileRevalidate({
      cacheName: PAGES_CACHE,
      matchOptions: { ignoreSearch: true },
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7,
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
  precacheEntries,
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

// Order for navigations: this build's document -> the same URL without query ->
// the precached /offline.html -> inline HTML. Never `undefined`.
serwist.setCatchHandler(async ({ request }) => {
  if (request.mode !== "navigate") {
    return Response.error();
  }
  try {
    const cache = await caches.open(PAGES_CACHE);
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

// Runtime caches owned by this version; everything else (legacy "pages",
// "pages-<older build>", foreign caches) is dropped so no stale document survives.
const keepCacheNames = new Set(["static-assets", "images", "fonts"]);

self.addEventListener("activate", (event) => {
  (event as ExtendableEvent).waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => {
            if (key === PAGES_CACHE) return false;
            if (key.startsWith("serwist-") || key.startsWith("workbox-")) return false;
            if (keepCacheNames.has(key)) return false;
            return true;
          })
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});

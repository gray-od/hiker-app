# AGENTS.md — ProHikes (Pages Router Migration)

## Origin

Migration of `D:\Projects\hiker-app` (Next.js 16 App Router + Supabase PWA) → Pages Router.

**Reason:** App Router (RSC client-side navigation) is architecturally incompatible with offline page transitions. 3 attempts failed (R19, R51, R52 in original project). Pages Router does SPA-style client navigation — offline-compatible.

**Source context:** `D:\Projects\hiker-app\AGENTS.md` + `D:\Projects\hiker-app\wiki_map_project.md`

## Stack

- **Frontend:** Next.js 16 Pages Router + TypeScript + Tailwind v4
- **Backend:** Supabase (PostgreSQL, Auth, RLS) — same project as hiker-app
- **i18n:** next-intl v4 (uk/ru/en)
- **Theme:** next-themes (class-based dark mode)
- **AI:** Google Gemma 4 26B A4B (free via AI Studio) + Exa (web search) + Open-Meteo (weather)
- **AI SDK:** Vercel AI SDK v4 (`ai@4.3.19`, `@ai-sdk/google@1`)
- **SW:** `@serwist/next` + webpack (`next build --webpack`)
- **Offline data:** IndexedDB (`idb`) cache-first in `src/lib/supabase/service.ts`
- **BYOK:** опц. свой ключ AI/поиска через `localStorage` (`prohikes.ai`/`prohikes.search`)
- **Hosting:** Vercel (new project `prohikes`, same env vars)

## Current State — Files Copied (unchanged from hiker-app)

```
src/components/   — 11 files (AppShell, ChatWidget, Modal, Navbar, etc.)*
src/lib/          — 18 files (types, format, service, AI providers, etc.)
src/hooks/        — 3 files (useDebounce, useAuth, useForm)*
src/i18n/         — messages/ + request.ts
public/           — icons, manifest, images
supabase/         — 9 migrations
.env.local        — same env vars
```
*AppShell, Navbar, useAuth adapted for Pages Router (next/router) in R2.

## Round History

| Round | Date | What | Files |
|---|---|---|---|
| R1 | 2026-06-29 | Scaffold + shared files copy | 40+ files copied from hiker-app |
| R2 | 2026-06-30 | Pages Router foundation | 11 files: _app, _document, middleware, globals.css, next.config, sw, cache, OfflineBanner + hook fixes |
| R3 | 2026-06-30 | Core pages + API routes | 9 files: auth callback, login, dashboard, chat API, error, 404, locales fix |
| R4 | 2026-06-30 | All remaining pages + APIs | 25 files: gear, food, lists, meals, settings, privacy + sub-pages + 2 APIs + 11 list/meal components |
| R5 | 2026-07-01 | Fix TS errors + Vercel deploy | ChatWidget.tsx — migrate ai/react→@ai-sdk/react v4, install @ai-sdk/react, tsc clean, build OK, pushed to Vercel |
| R6 | 2026-07-01 | Cleanup App Router artifacts (request.ts, createNavigation) — clean build | commit c6e4a19 |
| R7 | 2026-07-01 | Fix 404 on Vercel: custom middleware replaces next-intl/middleware | commit e5a5a61, src/middleware.ts |
| R8 | 2026-07-01 | Launch checklist created (LAUNCH.md, superseded by PLAN.md in R10) | commit 445be1b |
| R9 | 2026-07-17 | Supabase July 2026 update analysis (no code impact; keys already new sb_* format) + Supabase MCP setup: PAT `SUPABASE_ACCESS_TOKEN` + `supabase` server in global opencode.json, project-scoped `lcqsbjflososfglajydw` | global opencode.json, AGENTS.md |
| R10 | 2026-07-17 | Reality audit + docs sync: deploy exists at prohikes-ten.vercel.app (public), BYOK confirmed broken (client never sends keys), public/sw.js was tracked + build script lacked --webpack (deploy mine), LAUNCH.md → PLAN.md | AGENTS.md, wiki_map_project.md, BRIDGE.md, PLAN.md, .gitignore, package.json |
| R11 | 2026-07-17 | BYOK fix: readByok hoisted to module level, wired via `body: () => readByok()` into DefaultChatTransport (ai@7 Resolvable, fresh per request); tsc clean, build+SW OK | src/components/ChatWidget.tsx |
| R12 | 2026-07-17 | Local offline test PASSED (banner, pages, F5) + fix-cycle: uuid "undefined" guards (5 [id] pages), manifest.json created + apple-touch-icon fixed + mobile-web-app-capable meta, React #418 hydration (two-pass locale in _app, dates→useEffect in 3 print pages). Re-test clean: all 3 bugs gone, full offline nav confirmed | _app, _document, 5×[id] pages, public/manifest.json |

## What's Done So Far

- [x] Next.js Pages Router scaffold (`create-next-app --no-app`)
- [x] All dependencies installed (mirror of hiker-app + `@serwist/next` + `idb`)
- [x] All shared files copied (components, lib, hooks, i18n, public, supabase, .env.local)
- [x] Pages Router foundation (_app.tsx, _document.tsx, middleware.ts)
- [x] Globals CSS copied from hiker-app
- [x] next.config.ts (withSerwistInit + webpack build)
- [x] SW file created (`src/sw.ts`)
- [x] IndexedDB cache layer (`src/lib/cache.ts`)
- [x] OfflineBanner component
- [x] Auth callback adapted (`pages/api/auth/callback.ts`)
- [x] Chat API adapted (`pages/api/chat.ts`) — AI SDK v7
- [x] Login page adapted (`pages/login.tsx`)
- [x] Dashboard adapted (`pages/index.tsx`)
- [x] Error + 404 pages (`_error.tsx`, `404.tsx`)
- [x] Remaining 13 pages (gear, food, lists, meals + sub-pages)
- [x] 2 API routes (account/delete, byok/validate)
- [x] Vercel deploy exists: `https://prohikes-ten.vercel.app` (public, auto-deploy from GitHub main)
- [ ] Finish & launch — see `PLAN.md` (single source of truth for remaining work)

## Page Migration Map

| App Router (source) | Pages Router (target) |
|---|---|
| `src/app/layout.tsx` | `src/pages/_app.tsx` + `_document.tsx` |
| `src/app/page.tsx` (dashboard) | `src/pages/index.tsx` |
| `src/app/gear/page.tsx` | `src/pages/gear.tsx` |
| `src/app/food/page.tsx` | `src/pages/food.tsx` |
| `src/app/lists/page.tsx` | `src/pages/lists.tsx` |
| `src/app/lists/[id]/page.tsx` | `src/pages/lists/[id].tsx` |
| `src/app/lists/[id]/print/page.tsx` | `src/pages/lists/[id]/print.tsx` |
| `src/app/lists/[id]/components/*` | `src/components/` (unchanged) |
| `src/app/meals/page.tsx` | `src/pages/meals.tsx` |
| `src/app/meals/[id]/page.tsx` | `src/pages/meals/[id].tsx` |
| `src/app/meals/[id]/print/page.tsx` | `src/pages/meals/[id]/print.tsx` |
| `src/app/meals/[id]/shopping/page.tsx` | `src/pages/meals/[id]/shopping.tsx` |
| `src/app/meals/[id]/components/*` | `src/components/` (unchanged) |
| `src/app/settings/page.tsx` | `src/pages/settings.tsx` |
| `src/app/login/page.tsx` | `src/pages/login.tsx` |
| `src/app/privacy/page.tsx` | `src/pages/privacy.tsx` |
| `src/app/error.tsx` | `src/pages/_error.tsx` |
| `src/app/not-found.tsx` | `src/pages/404.tsx` |
| `src/app/globals.css` | `src/styles/globals.css` |
| `src/app/api/chat/route.ts` | `src/pages/api/chat.ts` |
| `src/app/api/account/delete/route.ts` | `src/pages/api/account/delete.ts` |
| `src/app/api/byok/validate/route.ts` | `src/pages/api/byok/validate.ts` |
| `src/app/auth/callback/route.ts` | `src/pages/api/auth/callback.ts` |

## Page Adaptation Rules

1. **`'use client'`** — remove directive (Pages Router pages are always client-capable)
2. **`useTranslations`** — same API, no change
3. **`params: Promise<{ id }>` + `use()`** → `const { id } = router.query` (from `useRouter`)
4. **`tCommon, tGear` etc.** — same pattern, no change
5. **Server Components** → Pages Router has no server components; use `getServerSideProps` for SSR or `useEffect` for client fetch
6. **`loading.tsx`** → `router.events` for loading state or Suspense (limited)
7. **`generateMetadata()`** → `<Head>` from `next/head` in each page
8. **`notFound()`** → `return { notFound: true }` from `getServerSideProps` or `router.push('/404')`

## Key Patterns

- All components remain unchanged — only page wrappers change
- `getServerSideProps` can be used for online SSR, but for offline we rely on `useEffect` + IndexedDB (same as current App Router pattern)
- SW caches static assets (CacheFirst), doesn't touch HTML/RSC (not needed — Pages Router navigation is client-side)
- IndexedDB cache (cache-first, network-update) wraps all 9 service.ts functions
- `next build --webpack` forces webpack for production (Serwist webpack plugin compatible)

## External Changes Needed (after deploy)

1. **Google Cloud Console:** Add redirect URI `https://prohikes-ten.vercel.app/api/auth/callback` to existing OAuth client
2. **Vercel:** Project `prohikes` exists (domain `prohikes-ten.vercel.app` — `prohikes.vercel.app` is taken by a stranger; alias `hiker.vercel.app` is free). Verify 6 env vars
3. **Supabase:** Add `https://prohikes-ten.vercel.app` to Auth Redirect URLs (via Management API)

## Supabase MCP (since R9)

- Global MCP server `supabase` (opencode.json) → Management API, scoped to project `lcqsbjflososfglajydw` (prod DB, shared with live hiker-app)
- **Rule: DDL via `apply_migration`/`execute_sql` — ONLY after explicit user confirmation per migration**

## Verification

- `npx tsc --noEmit` — must be clean
- `npx next build --webpack` — must succeed, SW must be generated (`public/sw.js`)
- Offline test: browse pages online → go offline → navigate between pages → should work
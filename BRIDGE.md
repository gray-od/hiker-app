# Bridge — ProHikes ↔ hiker-app

## Source Project

- **Path:** `D:\Projects\hiker-app`
- **Git:** `github.com/gray-od/hiker-app`
- **Vercel:** `hiker-app.vercel.app`
- **Stack:** Next.js 16 App Router + Supabase
- **Memory files:** `D:\Projects\hiker-app\AGENTS.md`, `D:\Projects\hiker-app\wiki_map_project.md`
- **State:** R50 (stable, after deep audit, offline attempts reverted)

## Target Project

- **Path:** `D:\Projects\ProHikes` (current)
- **Git:** not yet created
- **Stack:** Next.js 16 Pages Router + Supabase
- **Migration status:** Shared files copied, core setup pending

## What Was Copied (unchanged)

- `src/components/` — all 11 components
- `src/lib/` — all 18 files (types, service, AI, etc.)
- `src/hooks/` — 3 files
- `src/i18n/messages/` — 3 locale JSONs
- `public/` — all assets
- `supabase/migrations/` — 9 migration files
- `.env.local` — same env vars

## What Needs Adaptation

- `src/app/*` (16 pages + layouts) → `src/pages/*` (different routing patterns)
- `src/app/api/*` (4 route handlers) → `src/pages/api/*` (different API pattern)
- `src/app/globals.css` → `src/styles/globals.css`
- `src/app/auth/callback/route.ts` → `src/pages/api/auth/callback.ts`
- `next.config.ts` — rework for Pages Router + webpack + Serwist

## What's NEW (Pages Router specific)

- `src/pages/_app.tsx` — replaces layout.tsx
- `src/pages/_document.tsx` — HTML structure
- `src/middleware.ts` — i18n + Supabase auth refresh
- `src/sw.ts` — Serwist service worker
- `src/lib/cache.ts` — IndexedDB data cache
- `src/components/OfflineBanner.tsx` — offline indicator

## Post-Deploy Checklist

- [ ] Vercel new project `prohikes` — copy 6 env vars from hiker-app
- [ ] Google Cloud Console — add `https://prohikes.vercel.app/api/auth/callback` redirect URI
- [ ] Test online: auth, all pages, CRUD
- [ ] Test offline: navigate between pages without internet
- [ ] When ready: close `gray-od/hiker-app` GitHub repo, remove Vercel project

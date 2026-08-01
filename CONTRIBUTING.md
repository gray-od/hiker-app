# Contributing to ProHikes

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
npm install
```

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Dev

```bash
npm run dev       # http://localhost:3000
npm run build     # production build (webpack for SW)
npm start         # serve production build
```

## Type check & lint

```bash
npx tsc --noEmit
npm run lint
```

## Project structure

```
src/
├── pages/          # Next.js Pages Router
│   ├── api/        # 7 API routes (chat, auth, byok, account)
│   ├── _app.tsx    # App wrapper (theme, i18n, offline banner)
│   └── _document.tsx
├── components/     # 22 shared components
│   ├── meals/      # Meal plan components
│   └── lists/      # Packing list components
├── lib/            # 18 utility modules
│   ├── supabase/   # Supabase client + data service
│   ├── cache.ts    # IndexedDB cache layer (TTL 5min)
│   ├── offline-queue.ts  # Mutation queue for offline
│   └── format.ts   # i18n formatters
├── styles/         # Tailwind globals
└── middleware.ts   # Auth + i18n middleware
```

## Architecture

See [wiki_map_project.md](wiki_map_project.md) for full stack details, known issues, and gotchas.

## Offline data flow

1. **Reads** — `service.ts` wraps all Supabase calls with `withCache()` (IndexedDB, cache-first, 5min TTL)
2. **Writes** — `service.ts` mutations call `invalidateCache()` after success, `enqueue()` to offline queue on failure
3. **Offline sync** — `syncPendingMutations()` runs on app load and online event, replays queued mutations via fresh Supabase client

## Key patterns

- **Auth** — `userIdRef` pattern: `useRef` set once in `useEffect` → checked before every mutation
- **i18n** — `useTranslations('namespace')` from `next-intl` in every page
- **Error handling** — `setSaving(false)` required in BOTH success and catch paths; missing → permanently disabled save button
- **Modals** — use `<Modal>` component for focus trap and Escape-to-close

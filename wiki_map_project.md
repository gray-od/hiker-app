# wiki_map_project.md — Hiker App (ПроПоходи 2.0)

## Project Origin

**Date:** 17.06.2026

**Context:** User discovered the abandoned PWA `app.propohody.com` — a hiking gear checklist app by Антон Прохоров. It was a client-only React PWA with localStorage, no backend, no meal planning, no winter season completion. The user wanted a new, improved version as a separate project.

**Market Research (conducted 17.06.2026):**
- 10+ gear apps exist in English market (LighterPack, PackWizard, DFTS, Packstack, OutPack, Hikt, MyPacks, PackLight)
- **Zero apps in Ukrainian/Russian market** — 70% of UA/RU hikers use Google Sheets
- **#1 user complaint everywhere:** no mobile app / no offline mode
- **Biggest market gap:** no app combines gear management + meal planning in one tool
- **LighterPack** is the community standard but abandoned, web-only, no persistent gear library

**Strategic decision:** Build a mobile-first PWA with cloud sync that does BOTH gear + meal planning, with Ukrainian as base language (also ru/en). First-mover advantage in Eastern European market.

## Tech Decisions

| Decision | Rationale |
|----------|-----------|
| Next.js (not pure React) | SSR for auth, better PWA, Vercel deployment |
| Supabase (not Firebase) | PostgreSQL (relational model fits gear→list→items), better free tier, open source |
| Tailwind v4 (not v3) | Latest, utility-first, fast iteration |
| next-intl v4 (not v2/v3) | App Router native, cookie-based locale |
| TypeScript strict | Weight/calorie calculations need type safety |
| localePrefix: 'never' | Clean URLs, default uk without /uk prefix |

## What Was Tried

### Round 1 (17.06.2026) — Project Scaffold ✅

Created full project structure:
- Next.js 16 with App Router and TypeScript
- Supabase client/server/middleware setup
- Database schema: 7 tables (profiles, gear_items, gear_lists, list_items, meal_plans, meal_days, meal_entries)
- RLS policies on all tables, auto-profile trigger
- i18n: uk.json (base, 99 lines), ru.json, en.json — 62+ keys
- Google OAuth login page + auth callback route
- Combined middleware (next-intl routing + Supabase session refresh)
- Responsive Navbar (desktop sidebar + mobile bottom bar)
- Placeholder pages: Dashboard, Gear Library, Packing Lists, Meal Plans
- Brand: #75a93a green, dark theme support
- PWA meta tags in layout

**Agents involved:** debugger (infrastructure), code-reviewer (UI + i18n)
**Build result:** ✅ TypeScript clean, 9 pages, Turbopack

## Manual Steps Pending

1. ~~Apply SQL migration in Supabase SQL Editor~~ Done 17.06.2026 — via pooler eu-west-1
2. ~~Configure Google OAuth in Supabase Authentication → Providers~~ Done 17.06.2026

## Known Issues (тестирование 18.06.2026)

| # | Проблема | Статус |
|---|---|---|
| KI-1 | Gear CRUD: INSERT/UPDATE не сохраняет данные в Supabase | 🔴 |
| KI-2 | Страницы Списки/Питание — заглушки без функционала | 🔴 |
| KI-3 | Настройки — 404 (нет файла page.tsx) | 🔴 |
| KI-4 | Переключение языка не работает (NEXT_LOCALE игнорируется) | 🔴 |
| KI-5 | next-intl middleware удалён — несовместим с Next.js 16 proxy | 🔴 |
| KI-6 | middleware.ts заменён на proxy.ts (только Supabase refresh, /auth/* исключён) | 🟡 |

### Что работает после Раунда 2
- ✅ Вход через Google OAuth
- ✅ Редирект с `/` на `/login`
- ✅ Gear page UI рендерится (заголовок, кнопки, модалка, таблица)
- ✅ i18n переводы загружаются (uk/ru/en)

## Next Steps

| Round | Planned |
|-------|---------|
| 2 | Gear module: CRUD operations, gear library table, add/edit/delete items|
| 3 | Meal planning: calorie calculator, day-by-day meal schedule, macros |
| 4 | PWA: Service Worker, offline mode via Dexie.js, install prompt |
| 5 | Polish: export/share, Reddit-friendly links, Vercel deploy |

## File Structure (as of Round 1)

```
hiker-app/
├── .env.local                          # Supabase URL + anon key
├── .gitignore
├── AGENTS.md                           # Project conventions + round history
├── wiki_map_project.md                 # This file
├── eslint.config.mjs
├── next.config.ts                      # next-intl plugin
├── package.json                        # Next 16, Supabase, next-intl, Dexie, Lucide
├── tsconfig.json
├── public/
│   └── *.svg                           # Next.js boilerplate icons
├── src/
│   ├── app/
│   │   ├── auth/callback/route.ts      # OAuth code exchange → session
│   │   ├── gear/page.tsx               # Gear library (placeholder)
│   │   ├── lists/page.tsx              # Packing lists (placeholder)
│   │   ├── login/page.tsx              # Google sign-in button
│   │   ├── meals/page.tsx              # Meal plans (placeholder)
│   │   ├── layout.tsx                  # Root layout (i18n + PWA + Navbar)
│   │   ├── page.tsx                    # Dashboard (auth guard + quick actions)
│   │   ├── globals.css                 # Tailwind v4 + theme variables
│   │   └── favicon.ico
│   ├── components/
│   │   └── Navbar.tsx                  # Responsive nav (desktop sidebar + mobile bottom)
│   ├── i18n/
│   │   ├── messages/{uk,ru,en}.json    # Translation dictionaries
│   │   ├── request.ts                  # next-intl message loader
│   │   └── routing.ts                  # Locale routing config
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser Supabase client
│   │   │   ├── server.ts               # Server Supabase client (cookies)
│   │   │   └── middleware.ts           # updateSession() helper
│   │   └── types.ts                    # TypeScript DB interfaces
│   └── proxy.ts                       # Next.js 16 proxy (Supabase session refresh, /auth/* excluded)
└── supabase/
    └── migrations/
        └── 00001_init.sql              # Full DB schema + RLS
```

# AGENTS.md — Hiker App (ПроПоходи 2.0)

## Stack
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind v4
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **i18n:** next-intl v4 (uk/ru/en)
- **Offline:** Dexie.js (IndexedDB) — planned, not yet implemented
- **Hosting:** Vercel (free tier)
- **Repo:** github.com/gray-od/hiker-app

## Conventions
- Ukrainian base language (uk), with ru/en translations
- Code: TypeScript, strict mode
- No comments in code unless critical
- Tailwind utility classes, no CSS modules
- Season values: `summer`, `winter`, `demi`
- Gear categories: `backpack`, `sleep_system`, `tent`, `clothing`, `footwear`, `kitchen`, `hygiene`, `first_aid`, `navigation`, `documents`, `electronics`, `other`
- Meal types: `breakfast`, `lunch`, `snack`, `dinner`
- Weight always in grams (weight_g), calories in kcal
- Brand color: `#75a93a` (green)
- Season colors: summer `#ffec6d`, winter `#6db3ff`, demi `#f5a623`

## Architecture

```
hiker-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/callback/      # OAuth callback handler
│   │   ├── gear/               # Gear library page
│   │   ├── lists/              # Packing lists page
│   │   ├── login/              # Google OAuth login
│   │   ├── meals/              # Meal plans page
│   │   ├── layout.tsx          # Root layout (i18n + PWA)
│   │   ├── page.tsx            # Dashboard
│   │   └── globals.css         # Tailwind v4 + theme
│   ├── components/
│   │   └── Navbar.tsx          # Responsive navigation
│   ├── i18n/
│   │   ├── messages/           # uk.json, ru.json, en.json
│   │   ├── request.ts          # next-intl config
│   │   └── routing.ts          # Locale routing
│   ├── lib/
│   │   ├── supabase/           # client.ts, server.ts, middleware.ts
│   │   └── types.ts            # DB type interfaces
│   └── middleware.ts            # Combined intl + Supabase auth
├── supabase/
│   └── migrations/             # SQL migrations
└── .env.local                  # Supabase URL + anon key (gitignored)
```

## Database Schema (Supabase)

```
profiles        — id (FK→auth.users), email, name, lang, created_at
gear_items      — id, user_id, name, category, weight_g, season, notes, created_at
gear_lists      — id, user_id, name, season, trip_date, shared_link, created_at
list_items      — id, list_id, gear_item_id, quantity, is_packed, worn, consumable
meal_plans      — id, user_id, name, days_count, total_weight_g, created_at
meal_days       — id, plan_id, day_number, total_calories, total_weight_g
meal_entries    — id, day_id, meal_type, name, weight_g, calories, protein_g, fat_g, carbs_g
```

All tables have Row Level Security (RLS) — users can only access their own data.
Auto-creates profile via trigger on auth.users insert.

## Key Decisions
1. **Next.js App Router + Supabase SSR** — server-side auth checks, client-side data fetching. No API routes needed for CRUD (Supabase client directly from browser).
2. **next-intl v4 with localePrefix: 'never'** — clean URLs, default locale uk. Language switching via cookie + reload.
3. **PWA-ready** — viewport meta, apple-mobile-web-app tags, safe-area CSS. Service worker not yet registered (planned Round 4).
4. **PostgreSQL (Supabase)** — not Google Sheets. Chosen for offline sync capability, real-time, proper relational model.
5. **Combined middleware** — next-intl routing + Supabase session refresh in single middleware.ts.

## Round History

| Round | Date | What | Files Changed |
|---|---|---|---|
| 1 | 17.06.2026 | Project scaffold: Next.js, Supabase schema, i18n (uk/ru/en), Google OAuth auth, responsive Navbar, placeholder pages (dashboard/gear/lists/meals). | 34 files created |

## Open Issues
- [ ] Применить SQL-миграцию в Supabase SQL Editor (ручной шаг)
- [ ] Настроить Google OAuth Provider в Supabase (ручной шаг)
- [ ] Реализовать CRUD для модуля снаряжения (Раунд 2)
- [ ] Реализовать модуль раскладок питания (Раунд 3)
- [ ] PWA: Service Worker + офлайн-режим (Раунд 4)
- [ ] Деплой на Vercel
- [ ] Supabase OAuth redirect URI: `https://lcqsbjflososfglajydw.supabase.co/auth/v1/callback`

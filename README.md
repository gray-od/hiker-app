# ProHikes

AI-first hiking planner — gear, packing lists, meals, and an AI partner that actually thinks.

**URL:** [hiker-app.vercel.app](https://hiker-app.vercel.app)

## Stack

- **Frontend:** Next.js 16 Pages Router + TypeScript + Tailwind v4
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **i18n:** next-intl v4 (uk/ru/en)
- **AI:** Gemma 4 26B via AI SDK v4 + Exa search + Open-Meteo weather
- **Offline:** Service Worker (Serwist) + IndexedDB cache + mutation queue
- **Auth:** Google OAuth + email/password with security-question recovery
- **Hosting:** Vercel

## Features

- Gear management with weight tracking
- Food products database
- Packing lists with GPX route import + weather
- Meal plans with day-by-day calories, templates, shopping list
- AI chat (8 tools: weather, search, gear, food, lists, meals, mountaineering standards, trail knowledge)
- Dark/light theme, 3 languages (UA/RU/EN)

### Auth & Registration

- **Google OAuth** — instant sign in
- **Email + password** — instant registration (autoconfirm), no email verification needed
- **Password recovery** — security question (PBKDF2-hashed) set at signup. No SMTP required
- **Google fallback** — if recovery unavailable, sign in with Google (same email) then change password in Settings
- **Password change** — in `/settings` for authenticated users

### Offline (PWA)

- **All pages precached** — install once, all pages work offline immediately
- **IndexedDB data cache** — 5-minute TTL, cache-first with background refresh
- **Mutation queue** — 12 CRUD operations (gear, food, lists, list items) are queued when offline and sync automatically
- **F5 resistant** — full page refresh works offline via precached HTML

## Getting Started

```bash
npm install
npm run dev
```

Requires `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Build

```bash
npm run build -- --webpack   # webpack required for Serwist SW
```

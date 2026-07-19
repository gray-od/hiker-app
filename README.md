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
- Full offline (PWA): all pages precached, data cached, mutations queued
- Dark/light theme, 3 languages (UA/RU/EN)

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

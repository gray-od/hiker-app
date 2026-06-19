# AGENTS.md — Hiker App (ПроПоходи 2.0)

## Stack
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind v4
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **i18n:** next-intl v4 (uk/ru/en)
- **Theme:** next-themes (class-based dark mode)
- **AI:** DeepSeek API (chat) + Tavily API (web search)
- **AI SDK:** Vercel AI SDK v4 (`ai`, `@ai-sdk/openai`)
- **Offline:** Dexie.js (IndexedDB) — planned, not yet implemented
- **Hosting:** Vercel (free tier)
- **Repo:** github.com/gray-od/hiker-app

## Conventions
- Ukrainian base language (uk), with ru/en translations
- Code: TypeScript, strict mode
- No comments in code unless critical
- Tailwind utility classes, no CSS modules
- Season values: `summer`, `winter`, `demi`
- Gear categories: `backpack`, `shelter`, `sleep_system`, `cooking`, `water`, `clothing`, `footwear`, `lighting`, `navigation`, `safety`, `hygiene`, `electronics`, `tools`, `documents`, `technical`, `other`
- Meal types: `breakfast`, `lunch`, `snack`, `dinner`
- Weight always in grams (weight_g), calories in kcal
- Brand color: `#75a93a` (green)
- Season colors: summer `#ffec6d`, winter `#6db3ff`, demi `#f5a623`
- Mobile touch targets: min 44×44px
- Mobile base font: 17px (desktop 16px)

## Architecture

```
hiker-app/
├── src/
│   ├── app/
│   │   ├── auth/callback/      # OAuth callback
│   │   ├── gear/               # Gear hub (cards mobile, table desktop)
│   │   ├── lists/              # Packing lists + [id] detail
│   │   ├── login/              # Google OAuth login
│   │   ├── meals/              # Meal plans + [id] detail
│   │   ├── settings/           # Settings (lang, theme, profile)
│   │   ├── api/chat/           # AI chat API route (DeepSeek + Tavily)
│   │   ├── layout.tsx          # Root layout (i18n + ThemeProvider)
│   │   ├── manifest.ts         # PWA manifest
│   │   ├── page.tsx            # Dashboard
│   │   ├── icon.png            # Favicon (192×192)
│   │   ├── apple-icon.png      # Apple touch icon (180×180)
│   │   └── globals.css         # Tailwind v4 + dark mode + safe-area
│   ├── components/
│   │   ├── AppShell.tsx        # Conditional navbar wrapper
│   │   ├── Navbar.tsx          # Responsive nav (sidebar + bottom bar + logo)
│   │   └── Providers.tsx       # ThemeProvider wrapper
│   │   └── ChatWidget.tsx     # AI chat floating widget
│   ├── i18n/
│   │   ├── messages/           # uk.json, ru.json, en.json
│   │   ├── request.ts          # next-intl config (cookie-based)
│   │   └── routing.ts          # Locale routing
│   ├── lib/
│   │   ├── food-catalog.ts     # 75 hiking food products with KBJU
│   │   ├── hiking-standards.ts # Plan types, norms, adaptation
│   │   ├── meal-templates.ts   # 3 cyclic meal plan templates
│   │   ├── chat-system-prompt.ts # AI system prompt (survival specialist)
│   │   ├── supabase/           # client.ts, server.ts, middleware.ts
│   │   └── types.ts            # DB type interfaces
│   └── proxy.ts                # Next.js 16 proxy (Supabase session)
├── public/
│   ├── icon-{16,32,180,192,512}x*.png  # PWA icons
│   └── logo-circle.png         # Circular logo for navbar
├── logo/                       # Source logo files (6 variants)
└── supabase/migrations/        # SQL migrations (3 files)
```

## Database Schema (Supabase)

```
profiles        — id (FK→auth.users), email, name, lang, created_at
gear_items      — id, user_id, name, category, weight_g, season, notes, created_at
gear_lists      — id, user_id, name, season, trip_date, shared_link, created_at
list_items      — id, list_id, gear_item_id, quantity, is_packed, worn, consumable
meal_plans      — id, user_id, name, plan_type, people_count, days_count, target_calories, target_weight_g, created_at
meal_days       — id, plan_id, day_number, total_calories, total_weight_g
meal_entries    — id, day_id, meal_type, name, weight_g, calories, protein_g, fat_g, carbs_g
```

All tables have RLS — users can only access their own data.

## Key Decisions
1. **Next.js App Router + Supabase SSR** — server-side auth, client-side CRUD
2. **next-intl v4 localePrefix: 'never'** — clean URLs, cookie-based locale switching
3. **next-themes (class-based)** — manual Light/Dark/System toggle in settings
4. **PWA-ready** — manifest.ts, custom icons, safe-area CSS. Service Worker pending.
5. **proxy.ts** — next-intl middleware removed (incompatible with Next.js 16), i18n via cookie in request.ts

## Round History

| Round | Date | Summary |
|---|---|---|
| 1 | 17.06 | Project scaffold: Next.js 16, Supabase schema (7 tables), i18n, Google OAuth, Navbar |
| 2 | 17.06 | Gear CRUD: add/edit/delete, table, modal form |
| 3 | 18.06 | Bug fixes: error handling, weight kg format, login redirect, settings page |
| 4 | 18.06 | Nav restructure: AppShell, safe-area, Vercel deploy |
| 5 | 18.06 | Gear lists module: overview + detail (add items, packed/worn/consumable, weights) |
| 6 | 18.06 | Meal plans module: overview + detail (days, 4 meal types, KBJU, summary) |
| 7 | 18.06 | Smart meals: food catalog (75 items), 3 plan types, templates, group calc, progress bars |
| 8 | 19.06 | Mobile UX: touch targets ≥44px, gear cards, i18n greeting, lang switcher fix, name editing, favicon/PWA icons, logo, manifest |
| 9 | 19.06 | Page subtitles, rename "Бібліотека" → "Хаб спорядження" |
| 10 | 19.06 | Dashboard name from profile, mobile font 17px, dark mode toggle (next-themes) |
| 11 | 19.06 | AI-помічник ProHikes: DeepSeek chat + Tavily web search, system prompt (5 рівнів експертизи), markdown rendering, user context injection |
| 12 | 19.06 | Professional gear categories (16), editable meal plans after creation, direct quantity input, Beta badge |

## Open Issues
- [ ] PWA: Service Worker + офлайн-режим (Dexie.js) — Раунд 12
- [ ] Експорт/шерінг (PDF, посилання) — Раунд 13+

## What Works (summary)
- Auth: Google OAuth, login/logout, session refresh
- Gear Hub: full CRUD, cards on mobile, table on desktop, 16 professional categories, weight formatting
- Packing Lists: create/delete, add from gear library, packed/worn/consumable, weights, progress, direct quantity input
- Meal Plans: smart planning with 75-product catalog, 3 plan types, templates, group calc, KBJU, progress bars, all fields editable after creation
- i18n: uk/ru/en, greeting translation, lang saves to DB
- Settings: language switcher, theme toggle (Light/Dark/System), name editing
- Branding: custom favicon, PWA icons, manifest, logo in navbar
- Mobile: touch targets ≥44px, 17px base font, safe-area, card layouts
- AI Assistant: DeepSeek chat with Tavily web search, 5-level expertise, proactive gear/meal analysis, markdown responses, user data context
- Deploy: Vercel auto-deploy from GitHub main branch

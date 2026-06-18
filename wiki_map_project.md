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

### Round 5 (18.06.2026) — Gear Lists Module ✅

Implemented full gear lists functionality:
- `lists/page.tsx` — rewritten from placeholder to client-side CRUD (416 lines): cards grid, create/delete lists, season badges with colors, packing progress bars, weight summaries
- `lists/[id]/page.tsx` — new detail page (778 lines): add items from gear library (multi-select with search), toggle packed/worn/consumable (worn & consumable mutually exclusive), quantity ±, weight summary panel (base/worn/consumable/total), edit/delete list
- `types.ts` — added `ListItemWithGear` type (ListItem + joined GearItem)
- i18n — +17 new keys across all 3 locales (uk/ru/en)

**Agents involved:** debugger ×2 (parallel: lists page + detail page), orchestrator (types + i18n)
**Build result:** ✅ TypeScript clean, 10 pages (including /lists/[id]), Turbopack
**User testing:** ✅ Lists create, items add from library, language switching — all work

### Round 6 (18.06.2026) — Meal Plans Module ✅

Implemented full meal plans functionality:
- `meals/page.tsx` — rewritten from placeholder to client-side CRUD (369 lines): cards grid, create plan (name + days_count, auto-creates meal_days 1..N), delete with confirmation, stats (days/kcal/weight), meal type badges
- `meals/[id]/page.tsx` — new detail page (802 lines): collapsible day accordions, 4 meal-type groups (breakfast/lunch/snack/dinner), add/edit/delete entries with nutrition (weight, calories, protein, fat, carbs), summary cards (total + daily average calories/weight), add/remove days, edit/delete plan, auto-recalculate totals
- `types.ts` — added `MealDayWithEntries` type (MealDay + joined MealEntry[])
- i18n — +18 new keys across all 3 locales (uk/ru/en)

**Agents involved:** debugger ×2 (parallel: overview + detail page), orchestrator (types + i18n)
**Build result:** ✅ TypeScript clean, Compiled successfully in 18.5s

### Round 7 (18.06.2026) — Smart Meal Planning ✅

Major enhancement of meal planning with hiking nutrition standards:
- `src/lib/food-catalog.ts` — new: 75 hiking food products across 13 categories, KBJU per 100g, default portions per plan type, `calculateNutrition()` helper
- `src/lib/hiking-standards.ts` — new: 3 plan types (comfort 800-900g, standard 600-700g, ultralight 400-550g), daily calorie targets, macro ratios B:Zh:V=1:1:4, day adaptation coefficients (days 1-3 ×0.8)
- `src/lib/meal-templates.ts` — new: 3 template meal plans (standard/winter/ultralight) with cyclic 2-3 day rotation patterns
- `supabase/migrations/00003_meal_plan_enhancements.sql` — new: adds `plan_type`, `people_count`, `target_calories`, `target_weight_g` to `meal_plans`
- `meals/page.tsx` — reworked: plan type selector with descriptions, people count, template selector, auto-populate entries from template × group size, plan type badges on cards
- `meals/[id]/page.tsx` — reworked: two-tab entry modal ("From Catalog" with search/filter/auto-KBJU vs "Custom"), daily progress bars (calories/weight vs target with adaptation), 6-card summary (group totals + per-person averages)
- `types.ts` — MealPlan extended with plan_type, people_count, target_calories, target_weight_g
- i18n — +20 new keys per locale (plan types, catalog, progress, templates)

**Agents involved:** debugger ×2 (parallel: overview + detail page), orchestrator (data files + types + i18n + migration)
**Build result:** ✅ TypeScript clean (tsc --noEmit 0 errors)
**Manual step required:** User must run `00003_meal_plan_enhancements.sql` in Supabase SQL Editor

## Manual Steps Pending

1. ~~Apply SQL migration in Supabase SQL Editor~~ Done 17.06.2026 — via pooler eu-west-1
2. ~~Configure Google OAuth in Supabase Authentication → Providers~~ Done 17.06.2026

## Known Issues (тестирование 18.06.2026)

| # | Проблема | Статус |
|---|---|---|
| KI-1 | Gear CRUD: INSERT/UPDATE не сохраняет данные в Supabase | ✅ Fixed R3 |
| KI-2 | Страницы Списки/Питание — заглушки без функционала | ✅ Списки Fixed R5. ✅ Питание Fixed R6 |
| KI-3 | Настройки — 404 (нет файла page.tsx) | ✅ Fixed R3 |
| KI-4 | Переключение языка не работает (NEXT_LOCALE игнорируется) | ✅ Fixed R3 |
| KI-5 | next-intl middleware удалён — несовместим с Next.js 16 proxy | 🟡 Архитектурное решение |
| KI-6 | middleware.ts заменён на proxy.ts (только Supabase refresh, /auth/* исключён) | 🟡 Архитектурное решение |

### Что работает после Раунда 2
- ✅ Вход через Google OAuth
- ✅ Редирект с `/` на `/login`
- ✅ Gear page UI рендерится (заголовок, кнопки, модалка, таблица)
- ✅ i18n переводы загружаются (uk/ru/en)

## Next Steps

| Round | Planned |
|-------|---------|
| 7 | UX: tooltips/hints on pages, rename "Бібліотека" → "Хаб снаряжения" |
| 8 | PWA: Service Worker, offline mode via Dexie.js, install prompt |
| 9 | Polish: export/share, Reddit-friendly links |

## File Structure (as of Round 6)

```
hiker-app/
├── .env.local                          # Supabase URL + anon key
├── AGENTS.md                           # Project conventions + round history
├── wiki_map_project.md                 # This file
├── src/
│   ├── app/
│   │   ├── auth/callback/route.ts      # OAuth code exchange → session
│   │   ├── gear/page.tsx               # Gear library (full CRUD)
│   │   ├── lists/page.tsx              # Gear lists overview (cards, create/delete)
│   │   ├── lists/[id]/page.tsx         # List detail (items, weights, packing)
│   │   ├── login/page.tsx              # Google sign-in button
│   │   ├── meals/page.tsx              # Meal plans overview (full CRUD)
│   │   ├── meals/[id]/page.tsx        # Meal plan detail (days, entries, nutrition)
│   │   ├── settings/page.tsx           # Settings (language, profile)
│   │   ├── layout.tsx                  # Root layout (i18n + PWA)
│   │   ├── page.tsx                    # Dashboard (auth guard)
│   │   └── globals.css                 # Tailwind v4 + theme
│   ├── components/
│   │   ├── AppShell.tsx                # Conditional navbar wrapper
│   │   └── Navbar.tsx                  # Responsive nav (sidebar + bottom bar)
│   ├── i18n/
│   │   ├── messages/{uk,ru,en}.json    # Translation dictionaries
│   │   ├── request.ts                  # next-intl message loader
│   │   └── routing.ts                  # Locale routing config
│   ├── lib/
│   │   ├── supabase/{client,server,middleware}.ts
│   │   └── types.ts                    # DB interfaces + ListItemWithGear + MealDayWithEntries
│   └── proxy.ts                        # Next.js 16 proxy (Supabase session)
└── supabase/migrations/00001_init.sql  # Full DB schema + RLS
```

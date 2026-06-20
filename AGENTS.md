# AGENTS.md — Hiker App (ПроПоходи 2.0)

## Stack
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind v4
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **i18n:** next-intl v4 (uk/ru/en)
- **Theme:** next-themes (class-based dark mode)
- **AI:** DeepSeek API (chat) + Tavily API (web search)
- **AI SDK:** Vercel AI SDK v4 (`ai@4.3.19`, `@ai-sdk/openai@1`) — НЕ v6 (несовместим с useChat)
- **AI Tools:** DeepSeek function calling (createMealPlan, addGearItems, createGearList, addItemsToList)
- **Hosting:** Vercel (free tier, auto-deploy from `main`)
- **Repo:** github.com/gray-od/hiker-app

## Conventions
- Ukrainian base language (uk), with ru/en translations
- Code: TypeScript strict, no comments unless critical
- Tailwind utility classes, no CSS modules
- Weight always in grams (`weight_g`), calories in kcal
- Mobile touch targets: min 44×44px (`min-w-[44px] min-h-[44px]`)
- Mobile base font: 17px (desktop 16px)
- Icons: `w-5 h-5` mobile cards, `w-4 h-4 md:w-5 md:h-5` desktop table/header actions
- Enum values see wiki_map_project.md (seasons, gear categories, food categories, meal types)

## Color System
- **Brand:** `#75a93a` (green) — buttons, links, focus rings, logo accent
- **Seasons:** summer `#ffec6d`, winter `#6db3ff`, demi `#f5a623`
- **Donate/CTA:** `text-amber-600 dark:text-amber-400` (аналогова гармонія з зеленим)
- **Danger:** `text-red-400 hover:text-red-600` (delete buttons)
- **Dark mode:** `dark:bg-zinc-900`, `dark:bg-zinc-800` (cards/inputs), `dark:text-zinc-100`

## Architecture

```
src/app/
  api/chat/route.ts        # AI: DeepSeek streaming + Tavily search + user context + rate limit
  auth/callback/route.ts   # OAuth code exchange
  gear/page.tsx             # Gear hub (cards mobile, table desktop) — ~490 lines
  food/page.tsx             # Custom food CRUD (cards+table) — ~537 lines
  lists/page.tsx            # Packing lists overview
  lists/[id]/page.tsx       # List detail (items, weights, packing) — ~818 lines
  lists/[id]/print/page.tsx # Printable packing list
  meals/page.tsx            # Meal plans overview (smart CRUD, templates)
  meals/[id]/page.tsx       # Meal plan detail (3-tab entry modal) — ~1350 lines
  meals/[id]/print/page.tsx # Printable meal plan
  settings/page.tsx         # Language, theme, name
  login/page.tsx            # Google sign-in
  page.tsx                  # Dashboard
  layout.tsx                # Root (i18n + ThemeProvider, viewportFit: 'cover')
  globals.css               # Tailwind v4 + dark mode + safe-area + @media print
  manifest.ts               # PWA manifest

src/components/
  AppShell.tsx              # Navbar wrapper + ChatWidget (print:hidden)
  ChatWidget.tsx            # AI chat floating widget (~180 lines)
  Navbar.tsx                # Sidebar + bottom bar + header (~213 lines)
  Providers.tsx             # ThemeProvider (next-themes)

src/lib/
  supabase/{client,server,middleware}.ts
  types.ts                  # DB interfaces
  food-catalog.ts           # 75 products with KBJU
  hiking-standards.ts       # 3 plan types, norms, adaptation
  meal-templates.ts         # 3 cyclic templates
  chat-system-prompt.ts     # AI system prompt (5-level expertise)

src/i18n/messages/{uk,ru,en}.json  # ~230 keys each
src/proxy.ts               # Next.js 16 proxy (Supabase session refresh)
```

## Database Schema (Supabase)

```
profiles        — id (FK→auth.users), email, name, lang, is_premium, created_at
gear_items      — id, user_id, name, category, weight_g, season, notes, created_at
gear_lists      — id, user_id, name, season, trip_date, shared_link, created_at
list_items      — id, list_id, gear_item_id, quantity, is_packed, worn, consumable
meal_plans      — id, user_id, name, plan_type, people_count, days_count, target_calories, target_weight_g, created_at
meal_days       — id, plan_id, day_number, total_calories, total_weight_g
meal_entries    — id, day_id, meal_type, name, weight_g, calories, protein_g, fat_g, carbs_g
ai_usage        — id, user_id, date, message_count (UNIQUE user_id+date)
user_food_items — id, user_id, name, category, calories_per100g, protein_per100g, fat_per100g, carbs_per100g, default_portion_g, created_at
```

All tables have RLS — users can only access their own data. 6 migration files in `supabase/migrations/`.

## Key Patterns & Gotchas

### Routing & i18n
- `localePrefix: 'never'` — clean URLs, locale from cookie (not URL path)
- `proxy.ts` replaces middleware — next-intl middleware incompatible with Next.js 16
- Language switch: cookie + DB save to `profiles.lang`

### CSS & Layout
- **Safe area:** `viewportFit: 'cover'` in layout.tsx, CSS vars in globals.css
- **Safe area gotcha:** `.safe-area-bottom` class OVERRIDES `py-*` padding — use `max()` inline style instead: `paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))'`
- **Print:** `print:!hidden` on Navbar, ChatWidget, AppShell padding. Print pages at `/print` subroutes
- **Dark mode:** `@custom-variant dark` in globals.css, class-based via next-themes

### Chat Widget (ChatWidget.tsx)
- **Scroll:** `container.scrollTop = container.scrollHeight` (NOT `scrollIntoView({smooth})` — causes jumping during streaming)
- **Input:** `<textarea>` with auto-height, Enter=submit, Shift+Enter=newline
- **Desktop expand:** toggle 480px ↔ 700px via state, `transition-[width]`
- **Text overflow:** `break-words overflow-hidden min-w-0` on bubbles, `overflow-x-hidden` on container
- **Rate limit:** 15 msg/day (`FREE_DAILY_LIMIT` in `api/chat/route.ts`), amber banner + donate link

### Component Patterns
- **Mobile cards + desktop table:** gear/page.tsx, food/page.tsx use `md:hidden` / `hidden md:block`
- **Modal forms:** state-driven (`modalOpen`), form object in state, submit → Supabase insert/update → refetch
- **Touch targets:** all interactive elements min 44×44px on mobile

## Environment Variables

```
# .env.local (not in git)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DEEPSEEK_API_KEY=
TAVILY_API_KEY=
NEXT_PUBLIC_DONATE_URL=https://send.monobank.ua/jar/8AQXnnupou
```

## Round History

| Round | Date | Summary |
|---|---|---|
| 1 | 17.06 | Project scaffold: Next.js 16, Supabase (7 tables), i18n, OAuth, Navbar |
| 2 | 17.06 | Gear CRUD: add/edit/delete, table, modal |
| 3 | 18.06 | Bug fixes: error handling, weight format, login redirect, settings |
| 4 | 18.06 | Nav restructure: AppShell, safe-area, Vercel deploy |
| 5 | 18.06 | Gear lists: overview + detail (items, packed/worn/consumable, weights) |
| 6 | 18.06 | Meal plans: overview + detail (days, 4 meal types, KBJU) |
| 7 | 18.06 | Smart meals: 75-product catalog, 3 plan types, templates, progress bars |
| 8 | 19.06 | Mobile UX: touch 44px, gear cards, icons/logo, PWA manifest |
| 9 | 19.06 | Page subtitles, rename "Бібліотека" → "Хаб спорядження" |
| 10 | 19.06 | Dashboard profile name, 17px mobile font, dark mode (next-themes) |
| 11 | 19.06 | AI chat: DeepSeek + Tavily, 5-level expertise, markdown, user context |
| 12 | 19.06 | 16 gear categories, editable meal plans, direct quantity input, Beta badge |
| 13 | 19.06 | AI rate limit (15/day), Monobank donate, ai_usage table |
| 14 | 19.06 | Custom food: user_food_items, /food CRUD, 3-tab meal entry modal |
| 15 | 19.06 | Print/PDF: /meals/[id]/print, /lists/[id]/print, @media print CSS |
| 16 | 19.06 | Chat UX: scroll fix, safe-area input, expand toggle, textarea, word-wrap, desktop icons md:w-5, donate pink→amber |
| 17 | 20.06 | Print mobile fix, weight tooltips, "Розхідники"→"Розхідне спорядження", template hint+apply button, dashboard TripWeightCard |
| 18 | 20.06 | AI tool calling: 4 tools (createMealPlan, addGearItems, createGearList, addItemsToList), system prompt English rewrite, smart language detection, tool-use guidelines |
| 19 | 20.06 | PWA offline: Service Worker (app shell cache), localStorage data cache for meals/lists, offline banner, SWRegister, install prompt |

## Open Issues
- [ ] Групові походи (розподіл спорядження та їжі по учасниках, персональні списки) — Раунд 20+

## What Works

**Core modules:**
- Gear Hub — full CRUD, cards mobile / table desktop, 16 categories, weight formatting
- Packing Lists — create/delete, add from gear, packed/worn/consumable, weights, progress, print
- Meal Plans — 75-product catalog + custom user products, 3 plan types, templates, group calc, KBJU, progress bars, editable after creation, print
- Custom Food — /food CRUD, 14 categories, KBJU per 100g, integrated into meal entry modal

**Infrastructure:**
- Auth: Google OAuth, session refresh via proxy.ts
- i18n: uk/ru/en, cookie + DB sync
- Dark mode: Light/Dark/System via next-themes
- Branding: favicon, PWA icons, manifest, logo, Beta badge
- Mobile: 44px targets, 17px font, safe-area, card layouts
- Deploy: Vercel auto-deploy from GitHub main

**AI Assistant:**
- DeepSeek chat + Tavily web search, 5-level hiking expertise
- Proactive gear/meal analysis (reads user data from Supabase)
- Markdown rendering (react-markdown), word-wrap, text overflow handling
- Desktop expand toggle (480↔700px), textarea with auto-height
- 15 msg/day rate limit, Monobank donation (amber CTA)

> Для подробной истории раундов, архитектурных решений и что было испробовано → `wiki_map_project.md`

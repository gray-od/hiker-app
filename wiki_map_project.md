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
**Manual step required:** ~~User must run `00003_meal_plan_enhancements.sql` in Supabase SQL Editor~~ Done 18.06.2026 — via pg pooler script

### Round 8 (19.06.2026) — Mobile UX + i18n + Branding ✅

Major mobile UX overhaul + branding:
- `gear/page.tsx` — added mobile card view (`md:hidden`) alongside desktop table (`hidden md:block`), eliminating horizontal scroll. Edit/delete buttons now 44×44px touch targets
- `lists/[id]/page.tsx` — restructured list items to two-row mobile layout: Row 1 (checkbox + name + weight), Row 2 (quantity ±, worn/consumable toggles, remove). All buttons min 44×44px
- `meals/page.tsx`, `meals/[id]/page.tsx` — enlarged all icon buttons from `p-1.5`/`w-7 h-7` to `min-w-[44px] min-h-[44px]`, increased entry button icons, added `min-h-[44px]` to Add Day/Remove Day
- `Navbar.tsx` — bottom nav: icons w-5→w-6, labels 10→11px, padding increased. Header: h-12→h-14, logout button enlarged
- `AppShell.tsx` — pt-12→pt-14 to match new header height
- `page.tsx` — replaced hardcoded "Вітаємо" with i18n `t('welcome', { name })` / `t('welcome_anonymous')`
- `settings/page.tsx` — fixed language switcher race condition (cookie priority over DB), switchLocale now saves to `profiles.lang`, added name inline editing with save/cancel
- Branding: generated favicon + PWA icons (16/32/180/192/512px) from `logo6_19_103237.png`, created `manifest.ts`, replaced default Next.js favicon, added circular logo to sidebar/header
- i18n: added `welcome`/`welcome_anonymous` keys to all 3 locales

**Agents involved:** debugger (i18n + settings), code-reviewer ×3 (gear cards, navbar, list detail, meals touch targets)
**Build result:** ✅ TypeScript clean (tsc --noEmit 0 errors)

### Round 9 (19.06.2026) — Page Subtitles + Rename ✅

Quick UX improvement:
- Renamed gear page title: "Бібліотека спорядження" → "Хаб спорядження" (ru: "Хаб снаряжения", en: "Gear Hub")
- Added `subtitle` key to gear/lists/meals sections in all 3 locale files
- Added subtitle rendering (`<p>` below `<h1>`) on gear, lists, and meals pages

**Build result:** ✅ TypeScript clean

### Round 10 (19.06.2026) — Dashboard Name + Font + Dark Mode ✅

Three fixes from user testing:
- `page.tsx` — dashboard greeting now reads `profiles.name` (from settings) instead of Google OAuth `user_metadata.full_name`. Added profile query to existing `Promise.all`
- `globals.css` — increased mobile base font from 16px to 17px via `@media (max-width: 767px) { html { font-size: 17px } }`. Added `@custom-variant dark` for class-based Tailwind dark mode. CSS variables updated to support both media query and `.dark` class
- `Providers.tsx` — new: wraps app in `next-themes` `ThemeProvider` (attribute="class", defaultTheme="system", enableSystem)
- `layout.tsx` — wrapped content in `<Providers>` component
- `settings/page.tsx` — added theme toggle section (Light/Dark/System) using `useTheme` from `next-themes`, same visual style as language switcher
- Installed `next-themes` dependency

**Build result:** ✅ TypeScript clean

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

### Що працює після Раунду 16
- ✅ Auth: Google OAuth, login/logout, session refresh
- ✅ Gear Hub: full CRUD, cards mobile / table desktop, 16 professional categories, weight formatting
- ✅ Packing Lists: create/delete, add from gear library, packed/worn/consumable, weights, progress bar, direct quantity input, print/PDF export
- ✅ Meal Plans: smart planning (75-product catalog + custom user products, 3 plan types, templates, group calc, KBJU, progress bars), all fields editable after creation, print/PDF export
- ✅ Custom Food: user food library (/food), full CRUD, 14 categories, KBJU per 100g, default portion, integrated into meal plan entry modal as "My Products" tab
- ✅ Dashboard: greeting from profile name (editable), recent lists + meals cards
- ✅ i18n: uk/ru/en, cookie + DB sync, greeting translates
- ✅ Settings: language switcher (saves to DB), theme toggle (Light/Dark/System), name editing
- ✅ Branding: custom favicon + PWA icons, manifest.ts, logo in sidebar/header, Beta badge
- ✅ Mobile UX: touch targets ≥44px, 17px base font, safe-area, card layouts, two-row controls
- ✅ Dark mode: class-based (next-themes), supports Light/Dark/System
- ✅ AI Assistant: DeepSeek chat with Tavily web search, 5-level expertise, proactive gear/meal analysis, markdown responses, user data context
- ✅ AI Monetization: 15 msg/day free for all, Monobank donation button (amber, color harmony), ai_usage tracking
- ✅ Print/PDF: printable meal plans (KBJU tables per day) and packing lists (☐ checkboxes for paper), @media print CSS
- ✅ Chat UX: instant auto-scroll (no jumping), safe-area input padding, 480px desktop width, enlarged desktop icons (md:w-5)
- ✅ Deploy: Vercel auto-deploy from GitHub `main` branch
- ✅ Page subtitles on gear/lists/meals pages

## Next Steps

### Раунд 11 — AI-помічник ProHikes ✅ (19.06.2026)

**Концепція:** Вбудований спеціаліст з туризму та виживання — як YouTube AI знає свою платформу. Не загальний чатбот, а вузько направлений експерт.

**5 рівнів експертизи:**
1. **Навігатор по ProHikes** — знає додаток, допомагає користуватися
2. **Аналітик даних** — бачить gear/lists/meals, знаходить прогалини
3. **Консультант по спорядженню** — підбір під маршрут/сезон/рівень
4. **Спец по маршруту** — аналіз місцевості, рельєф, небезпеки
5. **Спец по виживанню** — рятувальні служби, евакуація, перша допомога

**Реалізовано:**
- `src/lib/chat-system-prompt.ts` — системний промпт з 5 рівнями експертизи, конкретні номери рятувальних служб (Карпати, Європа), корисні ресурси (yr.no, windy.com, maps.me)
- `src/app/api/chat/route.ts` — API route: DeepSeek стрімінг + Tavily web search tool + user context injection (gear/lists/meals з Supabase)
- `src/components/ChatWidget.tsx` — плаваюча кнопка Sparkles (✨) → панель чату, markdown rendering (react-markdown), error handling
- `src/components/AppShell.tsx` — віджет додано глобально (крім /login)
- i18n: ключі chat (title, placeholder, welcome, send) у всіх 3 локалях
- Залежності: `ai@4.3.19`, `@ai-sdk/openai@1`, `react-markdown`
- Env: `DEEPSEEK_API_KEY` + `TAVILY_API_KEY` на Vercel

**Ітерації під час розробки:**
- AI SDK v6 → downgrade до v4 (v6 має складний UIMessage API, несумісний з простим useChat)
- Додано error handling після першого тесту (API key not configured → чітке повідомлення)
- Додано react-markdown після тесту (raw markdown символи замість форматування)
- Додано Tavily web search після feedback (AI не мав доступу до інтернету для актуальних даних)

**Статус:** ✅ Працює на production (Vercel)

### Раунд 12 — Профессиональные категории + редактируемость (19.06.2026) ✅

**Что сделано:**
- `gear/page.tsx` — обновлены категории 12→16 профессиональных: добавлены shelter, cooking, water, lighting, safety, tools, technical. Категории теперь по функции, не по предмету ("Укриття" вместо "Намет")
- `meals/[id]/page.tsx` — edit modal расширен: plan_type, people_count, target_calories, target_weight_g теперь редактируемы после создания (было заморожено)
- `lists/[id]/page.tsx` — количество теперь вводится напрямую (input number), не только ±1 кнопками. Добавлен handleSetQuantity
- `Navbar.tsx` — добавлен бейдж "beta" в сайдбар и мобильный хедер
- i18n — обновлены gear.categories во всех 3 локалях (uk/ru/en)
- `supabase/migrations/00004_update_gear_categories.sql` — миграция для переименования существующих данных
- Миграция выполнена через pg pooler (1 запись обновлена: tent→shelter)

**Исследование:** проанализированы LighterPack, Reddit r/Ultralight, OutdoorGearLab — система категорий основана на функции (shelter, cooking, safety) вместо предмета (tent, kitchen, first_aid)

**Build result:** ✅ TypeScript clean

### Раунд 13 (19.06.2026) — AI Rate Limit + Монетизация ✅

Rate limiting и добровольные пожертвования:
- `supabase/migrations/00005_ai_usage_rate_limit.sql` — таблица `ai_usage` (user_id, date, message_count, UNIQUE), RLS, поле `is_premium` в profiles
- `api/chat/route.ts` — проверка лимита (15 msg/day) перед вызовом AI, upsert счётчика, возврат 429 RATE_LIMIT при превышении
- `ChatWidget.tsx` — жёлтый баннер при лимите с кнопкой на Monobank банку, отдельно от общей ошибки
- `Navbar.tsx` — постоянная ссылка "Підтримати проект" с иконкой Heart: в сайдбаре (desktop) и хедере (mobile), всегда на виду
- i18n: ключи limit_reached, donate в chat и common секциях
- Env: `NEXT_PUBLIC_DONATE_URL=https://send.monobank.ua/jar/8AQXnnupou`

**Модель монетизации (trust-based):**
- 15 сообщений/день для ВСЕХ пользователей одинаково, без premium-обхода
- Добровольные пожертвования через Monobank банку
- Если пожертвования > расходы → увеличить лимит для всех
- Если пожертвований нет → закрыть AI за оплату (ручная верификация: скрин → admin открывает)
- Лимит регулируется одной константой `FREE_DAILY_LIMIT` в `api/chat/route.ts`

**Миграция:** выполнена через pg pooler

### Раунд 14 (19.06.2026) — Кастомні продукти харчування ✅

Повноцінний модуль користувацьких продуктів:
- `supabase/migrations/00006_user_food_items.sql` — нова таблиця user_food_items (name, category, КБЖВ per100g, default_portion_g), RLS, GRANT
- `src/lib/types.ts` — додано інтерфейс `UserFoodItem`
- `src/app/food/page.tsx` — нова CRUD-сторінка (537 рядків): картки mobile / таблиця desktop, 14 категорій продуктів, форма з КБЖВ на 100г
- `src/components/Navbar.tsx` — додано іконку Apple для /food у desktop sidebar (не в mobile bottom bar — 6 елементів забагато)
- `src/app/meals/[id]/page.tsx` — модальне вікно додавання страв тепер має 3 вкладки: "З каталогу" / "Мої продукти" / "Вручну". catalogMode (boolean) замінено на entryMode ('catalog' | 'my_products' | 'custom')
- i18n: секція "food" з 14 категоріями, ключ meals.my_products у всіх 3 локалях
- Міграція виконана через pg pooler eu-west-1

**Build result:** ✅ Compiled successfully

### Раунд 15 (19.06.2026) — Друк/PDF експорт ✅

Друк раскладок та списків на папір:
- `src/app/meals/[id]/print/page.tsx` — print-оптимізована сторінка раскладки (250 рядків): таблиці по днях з групуванням за типом їжі, КБЖВ, підсумки по дню та загальні
- `src/app/lists/[id]/print/page.tsx` — print-оптимізована сторінка списку (251 рядок): таблиця з ☐ чекбоксами, категорії, вага, worn/consumable, підсумок ваги
- `src/app/meals/[id]/page.tsx` — кнопка "Друк" (іконка принтера) → відкриває /print в новій вкладці
- `src/app/lists/[id]/page.tsx` — аналогічна кнопка
- `src/app/globals.css` — `@media print { @page { margin: 1cm } }`
- `src/components/Navbar.tsx` — `print:!hidden` на aside, nav, header
- `src/components/ChatWidget.tsx` — `print:!hidden` на контейнер
- `src/components/AppShell.tsx` — `print:!pt-0 print:!pb-0 print:!pl-0` на main
- i18n: ключі print, generated

**Підхід:** `window.print()` — кирилиця нативно, нуль залежностей, "Save as PDF" на мобільних. Автодрук видалено за feedback — юзер сам натискає кнопку.

**Build result:** ✅ Compiled successfully

### Раунд 16 (19.06.2026) — Chat UX polish ✅

5 фіксів UI/UX чату та загальних іконок:
- `ChatWidget.tsx` — **fix scroll jumping**: замінено `scrollIntoView({ behavior: 'smooth' })` на `container.scrollTop = container.scrollHeight`. Під час стрімінгу `smooth` створював конфліктуючі анімації (~50ms між токенами vs ~300ms анімація) → прыжки. Instant scroll вирішує це повністю. Додано `isLoading` до deps useEffect
- `ChatWidget.tsx` — **fix mobile input behind shelf**: форма мала `py-3 safe-area-bottom`, але `.safe-area-bottom` перезаписувала padding-bottom з `py-3` (12px) на `env(safe-area-inset-bottom)` (0px на Android без notch). Рішення: `pt-3` + inline style `paddingBottom: max(0.75rem, env(safe-area-inset-bottom, 0.75rem))` — гарантує мінімум 12px
- `ChatWidget.tsx` — **desktop chat width**: `md:w-[400px]` → `md:w-[480px]` (+80px для комфортного читання)
- `gear/page.tsx`, `food/page.tsx`, `lists/[id]/page.tsx`, `meals/[id]/page.tsx` — **desktop icons**: SVG іконки edit/print/delete `w-4 h-4` → `w-4 h-4 md:w-5 md:h-5` (16→20px на десктопі)
- `Navbar.tsx` — **donate button color**: `text-pink-*` → `text-amber-*` (аналогова гармонія з зеленим брендом #75a93a, теорія кольорів: сусіди на колі)

**Build result:** ✅ Compiled successfully

### Раунд 17 — PWA: Service Worker + офлайн-режим

**Концепція:** Повноцінний PWA з офлайн-доступом.

**Що входить:**
- Реєстрація Service Worker (next-pwa або кастомний sw.js)
- Кешування статичних ресурсів (App Shell: HTML, CSS, JS, іконки)
- Кешування API-відповідей Supabase (gear, lists, meals) через Cache API
- Офлайн fallback сторінка ("Ви офлайн, дані збережено локально")
- Dexie.js (IndexedDB): локальне зберігання gear/lists/meals
- Синхронізація: при відновленні зʼєднання — sync локальних змін з Supabase
- Install prompt: пропозиція встановити PWA на домашній екран

**Статус:** Планується

### Раунд 18+ — Шерінг (shared links)

- Генерація унікального токена (UUID) для раскладки/списку
- Публічний роут `/shared/[token]` без авторизації
- RLS-політика для доступу по shared_link
- Кнопка "Копіювати посилання" + можливість вимкнути шерінг

**Статус:** Планується

## File Structure (as of Round 16)

```
hiker-app/
├── .env.local                          # Supabase URL + anon key + DEEPSEEK_API_KEY + TAVILY_API_KEY
├── .gitignore                          # Includes secrets file
├── AGENTS.md                           # Project conventions + round history (compact)
├── wiki_map_project.md                 # Detailed project chronology (this file)
├── logo/                               # Source logo files (6 PNG variants)
├── public/
│   ├── icon-{16,32,180,192,512}x*.png  # PWA icons (generated from logo)
│   └── logo-circle.png                 # Circular logo for navbar
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts           # AI chat API (DeepSeek + Tavily search + user context)
│   │   ├── auth/callback/route.ts      # OAuth code exchange → session
│   │   ├── food/page.tsx               # Custom food items CRUD (cards+table, 14 categories)
│   │   ├── gear/page.tsx               # Gear hub (cards mobile, table desktop)
│   │   ├── lists/page.tsx              # Gear lists overview (cards, create/delete)
│   │   ├── lists/[id]/page.tsx         # List detail (items, weights, packing)
│   │   ├── lists/[id]/print/page.tsx   # Printable packing list (☐ checkboxes, weights)
│   │   ├── login/page.tsx              # Google sign-in button
│   │   ├── meals/page.tsx              # Meal plans overview (smart CRUD, templates)
│   │   ├── meals/[id]/page.tsx         # Meal plan detail (3-tab: catalog/my products/custom)
│   │   ├── meals/[id]/print/page.tsx   # Printable meal plan (KBJU tables per day)
│   │   ├── settings/page.tsx           # Settings (language, theme, name, profile)
│   │   ├── layout.tsx                  # Root layout (i18n + ThemeProvider + PWA)
│   │   ├── manifest.ts                 # PWA manifest (name, theme_color, icons)
│   │   ├── page.tsx                    # Dashboard (greeting from profile, recent lists/meals)
│   │   ├── icon.png                    # Favicon (192×192, green gradient)
│   │   ├── apple-icon.png              # Apple touch icon (180×180)
│   │   └── globals.css                 # Tailwind v4 + dark mode + safe-area + @media print
│   ├── components/
│   │   ├── AppShell.tsx                # Conditional navbar wrapper + ChatWidget (print:hidden)
│   │   ├── ChatWidget.tsx              # AI chat floating widget (print:hidden)
│   │   ├── Navbar.tsx                  # Responsive nav (sidebar + bottom bar + logo, print:hidden)
│   │   └── Providers.tsx               # ThemeProvider wrapper (next-themes)
│   ├── i18n/
│   │   ├── messages/{uk,ru,en}.json    # Translation dictionaries (~230 keys each)
│   │   ├── request.ts                  # next-intl message loader (cookie-based)
│   │   └── routing.ts                  # Locale routing config
│   ├── lib/
│   │   ├── chat-system-prompt.ts       # AI system prompt (5-level survival specialist)
│   │   ├── food-catalog.ts             # 75 hiking food products with KBJU
│   │   ├── hiking-standards.ts         # Plan types, norms, adaptation coefficients
│   │   ├── meal-templates.ts           # 3 cyclic meal plan templates
│   │   ├── supabase/{client,server,middleware}.ts
│   │   └── types.ts                    # DB interfaces + UserFoodItem + ListItemWithGear + MealDayWithEntries
│   └── proxy.ts                        # Next.js 16 proxy (Supabase session)
└── supabase/migrations/
    ├── 00001_init.sql                  # Full DB schema + RLS + auto-profile trigger
    ├── 00002_grant_authenticated.sql   # GRANT on all tables
    ├── 00003_meal_plan_enhancements.sql # plan_type, people_count, targets
    ├── 00004_update_gear_categories.sql # Rename tent→shelter, kitchen→cooking etc.
    ├── 00005_ai_usage_rate_limit.sql   # ai_usage table + is_premium flag
    └── 00006_user_food_items.sql       # user_food_items table + RLS
```

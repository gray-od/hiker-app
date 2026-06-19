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
| 2 | 17.06.2026 | Gear module CRUD: client component with Supabase data fetching, add/edit modal form, delete confirmation, loading/empty states, responsive table, i18n (uk/ru/en). | 5 files changed |
| 3 | 18.06.2026 | Bug fixes + stabilization: Gear CRUD error handling, weight in kg (smart format), login redirect fix, logout buttons fix, language switching fix (cookie reading), settings page created, app renamed to ProHikes. | 9 files changed |
| 4 | 18.06.2026 | Navigation restructure: AppShell (conditional navbar), no nav on login page, simplified mobile header, safe-area support, GRANT fix for RLS, deployed to Vercel. | 5 files changed |
| 5 | 18.06.2026 | Gear lists module: lists overview (cards grid, create/delete, season badges, packing progress), list detail page (add items from gear library, toggle packed/worn/consumable, quantity ±, weight summary panel, edit/delete list), i18n +17 keys, ListItemWithGear type. | 6 files changed |
| 6 | 18.06.2026 | Meal plans module: overview page (cards grid, create with auto-days, delete), detail page (collapsible day accordions, 4 meal-type groups, add/edit/delete entries, nutrition macros P/F/C, summary cards with totals + daily averages, add/remove days, edit/delete plan), i18n +18 keys per locale, MealDayWithEntries type. | 6 files changed |
| 7 | 18.06.2026 | Smart meal planning: food catalog (75 products, KBJU per 100g, 13 categories), 3 plan types (comfort/standard/ultralight with norms), 3 meal templates (cyclic rotation), group calculation (people_count), catalog picker with auto-KBJU calculation, daily progress bars (calories/weight vs target), adaptation coefficients by day, enhanced summary cards (per-person/per-group). | 10 files changed |
| 8 | 19.06.2026 | Mobile UX + i18n + Branding: all touch targets ≥44px (gear cards on mobile, list detail two-row layout, meals buttons, navbar), i18n greeting fix (dashboard), language switcher highlight fix (cookie priority + save to DB), name editing in settings, custom favicon/PWA icons from logo, manifest.ts, logo in sidebar/header. | 13 files changed, 9 files created |
| 9 | 19.06.2026 | Page subtitles + rename: "Бібліотека спорядження" → "Хаб спорядження", added subtitle hints on gear/lists/meals pages (uk/ru/en). | 6 files changed |

## Open Issues
- [x] Применить SQL-миграцию (выполнено 17.06.2026 — через pooler eu-west-1)
- [x] Настроить Google OAuth Provider в Supabase (выполнено 17.06.2026)
- [x] Реализовать CRUD для модуля снаряжения (Раунд 2) — исправлено в Раунде 3
- [x] Деплой на Vercel — `https://hiker-app.vercel.app` (выполнено 18.06.2026)
- [x] Supabase OAuth redirect URI добавлен для Vercel домена
- [x] Реализовать модуль списков снаряжения (Раунд 5)
- [x] UX: тултипы-подсказки на страницах (Хаб снаряжения → "ваш склад походного спорядження"), переименовать "Бібліотека" → "Хаб" (Раунд 9)
- [x] Реализовать модуль раскладок питания (Раунд 6)
- [ ] PWA: Service Worker + офлайн-режим

## Known Issues (тестирование 18.06.2026)

| # | Проблема | Детали |
|---|---|---|
| KI-1 | ~~Сохранение данных не работает~~ | **FIXED R3** — добавлен error handling на insert/update/delete |
| KI-2 | ~~Вкладка Списки — мёртвая~~ | **FIXED R5** — списки. **FIXED R6** — питание: полный CRUD + детальная страница |
| KI-3 | ~~Настройки — 404~~ | **FIXED R3** — создан `src/app/settings/page.tsx` |
| KI-4 | ~~Переключение языка не работает~~ | **FIXED R3** — `request.ts` теперь читает cookie `NEXT_LOCALE` |
| KI-5 | **next-intl middleware удалён** | `createMiddleware` из next-intl несовместим с Next.js 16 proxy. i18n работает через cookie в request.ts |
| KI-6 | **Прокси на proxy.ts** | `src/middleware.ts` → `src/proxy.ts` (Next.js 16), только Supabase session refresh, `/auth/*` исключён. |

### Что работает
- ✅ Вход через Google OAuth
- ✅ Редирект с `/` на `/login` (без сессии)
- ✅ Gear CRUD (добавление, редактирование, удаление) — данные сохраняются в Supabase
- ✅ Вес в кг (smart format: ≥1кг → "3.25 кг", <1кг → "250 г")
- ✅ Logout (desktop sidebar + mobile header)
- ✅ i18n (uk/ru/en) — переключение через Settings или sidebar
- ✅ Страница Settings (язык + email профиля)
- ✅ Навигация: sidebar (desktop), bottom bar + header (mobile), без дублирования
- ✅ Login page без навбара
- ✅ Vercel deploy: https://hiker-app.vercel.app
- ✅ Мобильная адаптация работает
- ✅ Gear Lists CRUD (создание, удаление списков, карточки с сезон-бейджами)
- ✅ List Detail (добавление предметов из библиотеки, packed/worn/consumable, количество, вес)
- ✅ Панель весов (базова/на собі/розхідники/загальна)
- ✅ Прогрес-бар упаковки
- ✅ i18n для списків (uk/ru/en)
- ✅ Meal Plans CRUD (створення/видалення розкладок, карточки з калоріями/вагою)
- ✅ Meal Plan Detail (дні-акордеони, 4 типи прийомів їжі, додавання/редагування/видалення страв)
- ✅ Нутрієнти: калорії, вага, білки/жири/вуглеводи для кожної страви
- ✅ Панель підсумків (загальні калорії/вага + середнє на день)
- ✅ Додавання/видалення днів у розкладці
- ✅ i18n для розкладок (uk/ru/en)
- ✅ Каталог продуктів (75 позицій з КБЖВ на 100г, 13 категорій)
- ✅ 3 типи розкладок (комфортна/стандартна/легка) з цільовими нормами
- ✅ 3 шаблони розкладок (циклічна ротація днів)
- ✅ Розрахунок на групу (кількість людей)
- ✅ Вибір продуктів з каталогу + авто-розрахунок КБЖВ
- ✅ Прогрес-бари денних норм (калорії/вага vs ціль)
- ✅ Коефіцієнти адаптації по днях (дні 1-3 → ×0.8)
- ✅ Дашборд: останні списки та розкладки з карточками та бейджами
- ✅ Усі модулі задеплоєні на Vercel: https://hiker-app.vercel.app
- ✅ Мобільні touch targets ≥44px на всіх сторінках (gear cards, list detail, meals, navbar)
- ✅ Gear: карточки на мобільному замість таблиці (без горизонтального скролу)
- ✅ i18n привітання на дашборді (uk/ru/en)
- ✅ Підсвітка мови в налаштуваннях працює коректно (зберігає в БД)
- ✅ Редагування імені в налаштуваннях
- ✅ Кастомний favicon + PWA іконки з логотипу
- ✅ PWA manifest.ts (name, theme_color, icons)
- ✅ Логотип в сайдбарі та мобільному хедері

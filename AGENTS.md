# AGENTS.md — ProHikes (Pages Router Migration)

## Origin

Migration of `D:\Projects\hiker-app` (Next.js 16 App Router + Supabase PWA) → Pages Router.

**Reason:** App Router (RSC client-side navigation) is architecturally incompatible with offline page transitions. 3 attempts failed (R19, R51, R52 in original project). Pages Router does SPA-style client navigation — offline-compatible.

**Source context:** `D:\Projects\hiker-app\AGENTS.md` + `D:\Projects\hiker-app\wiki_map_project.md`

## Stack

- **Frontend:** Next.js 16 Pages Router + TypeScript + Tailwind v4
- **Backend:** Supabase (PostgreSQL, Auth, RLS) — проект `lcqsbjflososfglajydw` (в дашборде — `hiker-app`), ПРОД-БД самого ProHikes; тот же проект использовала архивная App Router версия, других живых приложений на этой БД нет.
- **i18n:** next-intl v4 (uk/ru/en)
- **Theme:** next-themes (class-based dark mode)
- **AI:** Google Gemma 4 26B A4B (free via AI Studio) + Exa (web search) + Open-Meteo (weather)
- **AI SDK:** Vercel AI SDK v4 (`ai@4.3.19`, `@ai-sdk/google@1`)
- **SW:** `@serwist/next` + webpack (`next build --webpack`)
- **Offline data:** IndexedDB (`idb`) cache-first in `src/lib/supabase/service.ts`
- **BYOK:** опц. свой ключ AI/поиска через `localStorage` (`prohikes.ai`/`prohikes.search`)
- **Hosting:** Vercel проект `hiker-app` → https://hiker-app.vercel.app, авто-деплой из GitHub `gray-od/hiker-app` (main). Локальный remote `origin` (`gray-od/prohikes`) — архивное репо, push туда не деплоится; рабочий remote — `hiker-app` (`https://github.com/gray-od/hiker-app.git`).

## Current State

Деплой: `https://hiker-app.vercel.app` (Vercel, авто-деплой из GitHub `gray-od/hiker-app` main).

**Работает:** Google-вход, email/пароль регистрация, сброс пароля (контрольный вопрос), смена пароля, AI-чат, CRUD gear/food/lists/meals, офлайн (SW: runtime-кэш документов + prewarm list, IndexedDB cache, mutation queue; навигация и F5 офлайн проверены владельцем на десктопе и Android), i18n, темы, SEO.

**НЕ работает:** подтверждение email при регистрации (SMTP). Workaround: `autoconfirm: true`. Сброс пароля — через контрольный вопрос (PBKDF2) без SMTP.

**Аудит R26 (2026-09-24):** C1–C3, M2, M4 и «ложные успехи» записи исправлены и задеплоены в R27–R33; офлайн-тест владельца (десктоп, Android) пройден. M1 (лимит AI 15/день) по-прежнему не работает: у `ai_usage` нет `GRANT` — нужна миграция. Оставшиеся дефекты и порядок работ — в `PLAN.md` (источник правды).

## Round History

| Round | Date | What | Files |
|---|---|---|---|
| R1 | 2026-06-29 | Scaffold + shared files copy | 40+ files copied from hiker-app |
| R2 | 2026-06-30 | Pages Router foundation | 11 files: _app, _document, middleware, globals.css, next.config, sw, cache, OfflineBanner + hook fixes |
| R3 | 2026-06-30 | Core pages + API routes | 9 files: auth callback, login, dashboard, chat API, error, 404, locales fix |
| R4 | 2026-06-30 | All remaining pages + APIs | 25 files: gear, food, lists, meals, settings, privacy + sub-pages + 2 APIs + 11 list/meal components |
| R5 | 2026-07-01 | Fix TS errors + Vercel deploy | ChatWidget.tsx — migrate ai/react→@ai-sdk/react v4, install @ai-sdk/react, tsc clean, build OK, pushed to Vercel |
| R6 | 2026-07-01 | Cleanup App Router artifacts (request.ts, createNavigation) — clean build | commit c6e4a19 |
| R7 | 2026-07-01 | Fix 404 on Vercel: custom middleware replaces next-intl/middleware | commit e5a5a61, src/middleware.ts |
| R8 | 2026-07-01 | Launch checklist created (LAUNCH.md, superseded by PLAN.md in R10) | commit 445be1b |
| R9 | 2026-07-17 | Supabase July 2026 update analysis (no code impact; keys already new sb_* format) + Supabase MCP setup: PAT `SUPABASE_ACCESS_TOKEN` + `supabase` server in global opencode.json, project-scoped `lcqsbjflososfglajydw` | global opencode.json, AGENTS.md |
| R10 | 2026-07-17 | Reality audit + docs sync: deploy confirmed at hiker-app.vercel.app, BYOK confirmed broken (client never sends keys), public/sw.js was tracked + build script lacked --webpack (deploy mine), LAUNCH.md → PLAN.md. Note: prohikes-ten repo archived — only hiker-app remote is active. | AGENTS.md, wiki_map_project.md, BRIDGE.md, PLAN.md, .gitignore, package.json |
| R11 | 2026-07-17 | BYOK fix: readByok hoisted to module level, wired via `body: () => readByok()` into DefaultChatTransport (ai@7 Resolvable, fresh per request); tsc clean, build+SW OK | src/components/ChatWidget.tsx |
| R12 | 2026-07-17 | Local offline test PASSED (banner, pages, F5) + fix-cycle: uuid "undefined" guards (5 [id] pages), manifest.json created + apple-touch-icon fixed + mobile-web-app-capable meta, React #418 hydration (two-pass locale in _app, dates→useEffect in 3 print pages). Re-test clean: all 3 bugs gone, full offline nav confirmed | _app, _document, 5×[id] pages, public/manifest.json |
| R13 | 2026-07-18 | AI fix: downgrade ai@7→ai@4, @ai-sdk/google@4→@1, @ai-sdk/react removed (ai/react used). chat.ts: inputSchema→parameters, stopWhen→maxSteps, pipeDataStreamToResponse. ChatWidget: msg.parts→msg.content. Git email fixed gray@multima.local→s.odessa0@gmail.com. Supabase: site_url + uri_allow_list patched. BYOK preserved. | package.json, chat.ts, ChatWidget.tsx, _document.tsx |
| R14 | 2026-07-18 | Email registration: autoconfirm on, signUp redirects to dashboard. SMTP investigation: Resend (needs domain), Brevo (SMTP not activated), Gmail (blocked), Supabase built-in (authorized only). SMTP BLOCKED — requires custom domain. | login.tsx, Supabase auth config |
| R15 | 2026-07-18 | IndexedDB cache: cache.ts wired to service.ts (9 functions with withCache). 12 mutation functions added to service.ts with invalidateCache. 4 pages (gear, food, lists, lists/[id]) now use service.ts for writes. | cache.ts, service.ts, gear.tsx, food.tsx, lists.tsx, lists/[id].tsx |
| R16 | 2026-07-18 | Favicon fix: added <link rel="icon"> to _document.tsx (override Vercel default icon) | _document.tsx |
| R17 | 2026-07-18 | Full audit parity: created gear/print + food/print pages (were 404). manifest.json theme_color→#75a93a. robots.txt added. Meta description on all 12 pages. | gear/print.tsx, food/print.tsx, manifest.json, robots.txt, 12 page files |
| R18 | 2026-07-19 | Password recovery without SMTP: security question during signUp (PBKDF2-hashed), forgot-password page, password change in settings. Supabase user_security table. No external services. | login.tsx, settings.tsx, forgot-password.tsx, i18n×3, api/auth/{security,recover,lookup}.ts, Supabase migration |
| R19 | 2026-07-19 | Deep audit — 14 bugs fixed: auth on byok/validate, getUser in chat, .catch() on 5 pages (infinite spinner fix), null guard in settings, security fetch try/catch in login, unified error messages, Promise.all→allSettled, weather-after-GPX, hydration fix on print pages, formatKbju localization, method guards on API routes, zod in deps, dead code cleanup, session cookie persistence | 24 files: all API routes, all pages, middleware, format.ts, package.json, deleted 5 dead files |
| R20 | 2026-07-19 | UX improvements: IndexedDB TTL (5min), forgot-password Google fallback, offline mutation queue (12 CRUD functions in service.ts wrapped with IndexedDB queue) | cache.ts, forgot-password.tsx, offline-queue.ts (new), service.ts, i18n×3 |
| R21 | 2026-08-01 | Fix setSaving(false) in catch blocks (5 locations) — prevents permanently disabled save buttons after errors | meals/[id].tsx, gear.tsx, food.tsx, lists.tsx |
| R22 | 2026-08-01 | Remaining bugfixes: userId guards + IndexedDB cache invalidation in 7 meals mutations, name.trim() on save, i18n for ConfirmDeleteModal, GPX error message fix, middleware auth redirect, meals handleCreate rollback. Supabase anti-pause scheduled task. | meals/[id].tsx, meals.tsx, gear.tsx, food.tsx, ConfirmDeleteModal.tsx, lists/[id].tsx, middleware.ts, cache.ts |
| R23 | 2026-08-01 | UX: validation hints below form inputs — 8 locations show why save button is disabled (i18n: enter_name, select_product, select_items). Docs: CONTRIBUTING.md added, README simplified. | meals.tsx, lists.tsx, gear.tsx, food.tsx, EditPlanModal.tsx, EntryModal.tsx, EditListModal.tsx, AddItemsModal.tsx, i18n×3, README.md, CONTRIBUTING.md |
| R24 | 2026-08-04 | Mobile fix + deep audit: viewport meta, SW rewrite (no IndexedDB, explicit runtime caching, catchHandler, 7d TTL), removed additionalPrecacheEntries (root cause of stale SW), cache invalidation order fix (12 funcs), open redirect fix, email enumeration fix, API guards (AbortController, .maybeSingle, null guard), 5 pages useEffect cleanup, i18n Deleting, offline-queue logging, manifest icons, 22 bugs total in 27 files | _document.tsx, manifest.json, sw.ts, next.config.ts, SWRegister.tsx, AppShell.tsx, service.ts, offline-queue.ts, cache.ts, gpx-weather.ts, callback.ts, lookup.ts, recover.ts, byok/validate.ts, chat.ts, index.tsx, login.tsx, gear.tsx, food.tsx, lists.tsx, meals.tsx, settings.tsx, TripWeightCard.tsx, _error.tsx, i18n×3 |
| R25 | 2026-09-24 | Разбор письма Supabase про explicit grants для новых таблиц public с 30.10.2026 (аудит только чтением: ProHikes уже на строгих default privileges, у `service_role` нет DML на таблицах public) + добавлен раздел Supabase Grants + исправлена идентичность проекта в документации (репо `gray-od/hiker-app`, локальный remote `origin` архивный, БД не «shared»). | AGENTS.md |
| R26 | 2026-09-24 | Аудит кода (только чтение, 4 способа: SQL по прод-БД, два независимых прохода по коду, эмпирическая проба supabase-js без сети) + создан `PLAN.md`: подтверждённые дефекты C1–C3 / M1–M5 и порядок исправлений; исправлена ошибочная запись про отсутствие `supabase/migrations` (папка есть, 9 файлов, в git). Код не менялся, деплоя не было. | PLAN.md, AGENTS.md |
| R27 | 2026-09-25 | Офлайн-сага, часть 1: сессия офлайн из cookie (`resolveUser`), middleware без сетевого вызова, реальный offline-fallback SW (вместо ERR_FAILED); деплой + офлайн-тесты владельца (десктоп, Android) | `src/middleware.ts`, `src/lib/supabase/resolveUser.ts`, `src/sw.ts`, `public/offline.html`, 13 страниц |
| R28 | 2026-09-25 | Офлайн-сага, часть 2: версионный кэш документов (`pages-<buildId>`), prewarm статических и динамических маршрутов, stale-while-revalidate документов, локальный ответ `/_next/data`; C1/C2 закрыты (replay проверяет `{error}`, `addListItems` — построчно в очередь) | `src/sw.ts`, `src/lib/cache.ts`, `src/lib/prewarmRoutes.ts`, `AppShell.tsx`, `SWRegister.tsx`, `service.ts` |
| R29 | 2026-09-25 | Миграции БД (MCP, записаны в историю миграций): `restrict_security_question_rpcs` — EXECUTE на RPC контрольного вопроса только у `service_role`, `search_path` зафиксирован; удалён оставшийся `public.verify_and_reset` | Supabase (история миграций) |
| R30 | 2026-09-25 | Запись без «ложных успехов»: `meals`/`settings` проверяют результат записи в БД и показывают ошибку вместо успеха; профиль инвалидируется после сохранения (M2) | `meals.tsx`, `meals/[id].tsx`, `settings.tsx` |
| R31 | 2026-09-26 | Сессия/логаут/регистрация: освежённая сессия в серверных роутах (`routeAuth.ts`), настоящий logout офлайн, проверка контрольного вопроса при регистрации, счётчик попыток восстановления | `routeAuth.ts`, `api/account/delete.ts`, `api/byok/validate.ts`, `api/auth/{recover,security}.ts`, `login.tsx`, `Navbar.tsx` |
| R32 | 2026-09-26 | Честная офлайн-очередь: queued-мутация сообщается как «в очереди», а не как ошибка | `service.ts`, `food.tsx`, `gear.tsx`, `lists.tsx`, `lists/[id].tsx` |
| R33 | 2026-09-26 | AI-план питания откатывается, если его содержимое не сохранилось | `api/chat.ts` |

## What's Done So Far

- [x] Next.js Pages Router scaffold (`create-next-app --no-app`)
- [x] All dependencies installed (mirror of hiker-app + `@serwist/next` + `idb`)
- [x] All shared files copied (components, lib, hooks, i18n, public, supabase, .env.local)
- [x] Pages Router foundation (_app.tsx, _document.tsx, middleware.ts)
- [x] Globals CSS copied from hiker-app
- [x] next.config.ts (withSerwistInit + webpack build; без precache страниц — SW кэширует документы в runtime + prewarm)
- [x] SW file created (`src/sw.ts`) — Serwist with precache + runtime caching
- [x] IndexedDB cache layer (`src/lib/cache.ts`) + wired to service.ts (R15) + TTL (R20)
- [x] OfflineBanner component
- [x] Offline mutation queue (`src/lib/offline-queue.ts`) — 12 CRUD functions (R20)
- [x] Auth callback adapted (`pages/api/auth/callback.ts`)
- [x] Chat API adapted (`pages/api/chat.ts`) — AI SDK v4
- [x] Login page adapted (`pages/login.tsx`) + autoconfirm + security question (R18)
- [x] Password recovery: forgot-password page + PBKDF2 security question (R18)
- [x] Password change in settings (R18)
- [x] Dashboard adapted (`pages/index.tsx`)
- [x] Error + 404 pages (`_error.tsx`, `404.tsx`)
- [x] All 17 pages (gear, food, lists, meals + sub-pages + print)
- [x] 7 API routes (account/delete, byok/validate, chat, auth/callback, auth/security, auth/recover, auth/lookup)
- [x] Vercel deploy: `https://hiker-app.vercel.app` (auto-deploy from GitHub main)
- [x] AI chat working (Gemma 4, BYOK, 8 tools)
- [x] Full offline: SW runtime-кэш документов + prewarm list + IndexedDB data cache + mutation queue (R20, R27–R28). Очередь покрывает gear/food/lists/list_items (replay проверяет `{error}`, пачка `addListItems` — построчно); `meals.tsx`/`settings.tsx` пишут напрямую, но больше не показывают ложный успех (R30)
- [x] SEO: favicon, robots.txt, meta descriptions, manifest.json
- [x] Full parity audit vs original hiker-app (R17)
- [x] Deep security audit + bug fixes (R19)
- [x] Supabase user_security table + SECURITY DEFINER functions
- [x] Аудит кода 2026-09-24 (R26, только чтение) + план исправлений `PLAN.md`
- [x] Офлайн-сага R27–R28: сессия офлайн (`resolveUser`), middleware без сети, SW offline-fallback, версионный кэш + prewarm + SWR документов; офлайн-тест владельца пройден (десктоп, Android)
- [x] Миграции БД R29: RPC контрольного вопроса — только `service_role` (+ `search_path`), удалён `verify_and_reset`
- [x] Запись без «ложных успехов» R30 и честная офлайн-очередь R32 (queued-запись сообщается как «в очереди»)
- [x] Сессия/логаут/регистрация R31: `routeAuth.ts`, настоящий logout офлайн, проверка контрольного вопроса при регистрации, счётчик попыток восстановления
- [x] AI R33: откат созданного плана питания, если содержимое не сохранилось

## Open Issues

- [ ] **SMTP:** email confirmation blocked — requires custom domain. All free options checked (Resend/Brevo/Gmail/Supabase-built-in). Workaround: `autoconfirm: true`. Password reset via security question (PBKDF2).
- [ ] **M1 — лимит AI 15/день:** у `ai_usage` нет `GRANT` — включается миграцией и только по отдельному явному подтверждению владельца.
- [ ] **Оставшиеся дефекты:** C1–C3, M2, M4 закрыты (R27–R33); актуальный список и порядок работ — в `PLAN.md`.
- [ ] **Не закоммичено:** актуализация документации (`AGENTS.md`, `README.md`, `wiki_map_project.md`, `CONTRIBUTING.md`) и `PLAN.md` — в рабочем дереве (там же незакоммиченные правки другой сессии). Коммит/push — только по отдельной просьбе (push в `hiker-app` запускает деплой Vercel).

## Как продолжать

Точка входа для новой сессии: `AGENTS.md` (этот файл) → `PLAN.md` (оставшиеся дефекты, порядок работ) → память проекта (`ProHikes:last_context`). Состояние кода — R27–R33 (Round History выше); в рабочем дереве, кроме этих docs и `PLAN.md`, — незакоммиченные правки другой сессии (`.gitignore`, код) — перед коммитом сверяться с `git status`.

## Page Migration Map

| App Router (source) | Pages Router (target) |
|---|---|
| `src/app/layout.tsx` | `src/pages/_app.tsx` + `_document.tsx` |
| `src/app/page.tsx` (dashboard) | `src/pages/index.tsx` |
| `src/app/gear/page.tsx` | `src/pages/gear.tsx` |
| `src/app/food/page.tsx` | `src/pages/food.tsx` |
| `src/app/lists/page.tsx` | `src/pages/lists.tsx` |
| `src/app/lists/[id]/page.tsx` | `src/pages/lists/[id].tsx` |
| `src/app/lists/[id]/print/page.tsx` | `src/pages/lists/[id]/print.tsx` |
| `src/app/lists/[id]/components/*` | `src/components/` (unchanged) |
| `src/app/meals/page.tsx` | `src/pages/meals.tsx` |
| `src/app/meals/[id]/page.tsx` | `src/pages/meals/[id].tsx` |
| `src/app/meals/[id]/print/page.tsx` | `src/pages/meals/[id]/print.tsx` |
| `src/app/meals/[id]/shopping/page.tsx` | `src/pages/meals/[id]/shopping.tsx` |
| `src/app/meals/[id]/components/*` | `src/components/` (unchanged) |
| `src/app/settings/page.tsx` | `src/pages/settings.tsx` |
| `src/app/login/page.tsx` | `src/pages/login.tsx` |
| `src/app/privacy/page.tsx` | `src/pages/privacy.tsx` |
| `src/app/error.tsx` | `src/pages/_error.tsx` |
| `src/app/not-found.tsx` | `src/pages/404.tsx` |
| `src/app/globals.css` | `src/styles/globals.css` |
| `src/app/api/chat/route.ts` | `src/pages/api/chat.ts` |
| `src/app/api/account/delete/route.ts` | `src/pages/api/account/delete.ts` |
| `src/app/api/byok/validate/route.ts` | `src/pages/api/byok/validate.ts` |
| `src/app/auth/callback/route.ts` | `src/pages/api/auth/callback.ts` |

## Page Adaptation Rules

1. **`'use client'`** — remove directive (Pages Router pages are always client-capable)
2. **`useTranslations`** — same API, no change
3. **`params: Promise<{ id }>` + `use()`** → `const { id } = router.query` (from `useRouter`)
4. **`tCommon, tGear` etc.** — same pattern, no change
5. **Server Components** → Pages Router has no server components; use `getServerSideProps` for SSR or `useEffect` for client fetch
6. **`loading.tsx`** → `router.events` for loading state or Suspense (limited)
7. **`generateMetadata()`** → `<Head>` from `next/head` in each page
8. **`notFound()`** → `return { notFound: true }` from `getServerSideProps` or `router.push('/404')`

## Key Patterns

- All components remain unchanged — only page wrappers change
- `getServerSideProps` can be used for online SSR, but for offline we rely on `useEffect` + IndexedDB (same as current App Router pattern)
- SW: статика — CacheFirst; документы страниц — stale-while-revalidate в `pages-<buildId>` + prewarm (`src/lib/prewarmRoutes.ts`) + offline catchHandler; `/_next/data` отвечается локально
- IndexedDB cache (cache-first, network-update) wraps all 9 service.ts functions
- `next build --webpack` forces webpack for production (Serwist webpack plugin compatible)

## External Changes Needed (after deploy)

1. **Google Cloud Console: НЕ ТРЕБУЕТСЯ** — вход через `signInWithOAuth` (Supabase-callback уже прописан у Google; проверено в R12/R13-планировании)
2. **Vercel:** Project `hiker-app` (domain `hiker-app.vercel.app`). Verify env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. **Supabase:** `uri_allow_list` += `https://hiker-app.vercel.app/**`; `site_url` → `https://hiker-app.vercel.app`
4. **SMTP (R14):** кастомный отправитель (Resend/Brevo) — email-регистрация обязательна для запуска (Европа)

## Supabase MCP (since R9)

- Global MCP server `supabase` (opencode.json) → Management API, scoped to project `lcqsbjflososfglajydw` (в дашборде Supabase — проект `hiker-app`) — это ПРОД-БД самого ProHikes. Отдельного живого приложения, делящего эту БД, нет: старая App Router версия выведена из эксплуатации, её репозиторий заархивирован (ссылка Vercel сохранена), поэтому БД никто, кроме ProHikes, не использует.
- **Rule: DDL via `apply_migration`/`execute_sql` — ONLY after explicit user confirmation per migration**

## Supabase Grants (правило с 30 октября 2026)

- **Что меняется:** с 30.10.2026 Supabase прекращает автоматически выдавать права Data API (`anon` / `authenticated` / `service_role`) на НОВЫЕ таблицы схемы `public` в существующих проектах. Существующие таблицы права сохраняют — ничего не ломается. Новая таблица без явного GRANT → Data API отвечает `permission denied` (SQLSTATE 42501). Касается миграций, SQL-редактора Dashboard, preview-веток и локального `supabase db reset`.
- **Обязательный блок для любого нового DDL**, создающего таблицу в `public` (grants — в том же скрипте/миграции, что создаёт таблицу):

  ```sql
  grant select on public.<table> to anon;            -- только если анонимный доступ реально нужен
  grant select, insert, update, delete on public.<table> to authenticated;
  grant select, insert, update, delete on public.<table> to service_role;
  ```

  Затем включить RLS и написать политики — grant без RLS не защищает данные.
- **Текущее состояние (проверено SQL, сентябрь 2026):** ProHikes УЖЕ на строгих default privileges (`pg_default_acl`, схема public, grantor `postgres` = `postgres=arwdDxtm, anon=Dxtm, authenticated=Dxtm, service_role=Dxtm` — DML никому). Доказательство: таблицы, созданные в июле (`user_security`, `ai_usage`, `keepalive`), не имеют DML ни у одной роли; старые таблицы (`gear_items`, `gear_lists`, `list_items`, `meal_*`, `profiles`, `user_food_items`) имеют `authenticated=arwdDxtm`, а `anon` — только `SELECT` на `profiles`. Значит, для ProHikes 30 октября ничего не меняет — правило действует с июля, новые таблицы нужно грантить явно.
- **Важное следствие:** у `service_role` в ProHikes нет прав SELECT/INSERT/UPDATE/DELETE ни на одной таблице `public` (подтверждено тремя способами). Серверный код не должен обращаться к таблицам сервисным ключом напрямую — только через `SECURITY DEFINER` RPC или GoTrue admin HTTP API; иначе `permission denied`.
- **Миграции и гранты в репозитории:** локальная папка `supabase/migrations` есть — 9 файлов (`00001`–`00009`), они в git. Практика уже смешанная: `00002_grant_authenticated.sql:2-11` выдаёт явные `GRANT` семи таблицам (+ `SELECT` на `profiles` для `anon`), а `00005_ai_usage_rate_limit.sql` создаёт `ai_usage` с RLS и тремя политиками, но БЕЗ единого GRANT — из-за этого таблица недоступна через Data API (это и есть причина неработающего лимита AI, см. `PLAN.md`). Файлов с такими именами в истории миграций проекта (`supabase_migrations.schema_migrations`) нет — часть DDL применялась вручную через SQL-редактор, отдельные изменения — через MCP `apply_migration` (под ролью `postgres`).

## Verification

- `npx tsc --noEmit` — must be clean
- `npx next build --webpack` — must succeed, SW must be generated (`public/sw.js`)
- Offline test: browse pages online → go offline → navigate between pages and reload (F5) → should work. **Статус:** пройден владельцем на десктопе и Android после R27–R28; C3 закрыт (cookie-сессия через `src/lib/supabase/resolveUser.ts`).
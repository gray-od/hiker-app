# ProHikes — Project Map

## Origin

Migrated from `D:\Projects\hiker-app` (Next.js 16 App Router + Supabase PWA) to Pages Router.

**GitHub:** https://github.com/gray-od/prohikes (private, branch `main`)

**Source context:** `D:\Projects\hiker-app\AGENTS.md` + `D:\Projects\hiker-app\wiki_map_project.md`

## Why Pages Router

App Router RSC-навигация требует сервер при каждом переходе между страницами. Без интернета — навигация ломается. 3 попытки исправить (R19, R51, R52) в исходном проекте провалились.

Pages Router делает SPA-переходы на клиенте (через `next/link` + JS-роутер). Без сервера. С IndexedDB для данных и Serwist SW для статики — полноценный офлайн.

## Architecture

| Слой | Технология |
|---|---|
| Роутер | Next.js 16 Pages Router |
| Стили | Tailwind v4 |
| БД + Auth | Supabase (тот же проект что и hiker-app) |
| i18n | next-intl v4 (uk/ru/en, middleware-based) |
| Темы | next-themes |
| AI | Gemma 4 26B (native @ai-sdk/google) + Exa + Open-Meteo |
| SW | @serwist/next + webpack |
| Офлайн-данные | IndexedDB (idb) cache-first в service.ts |
| Хостинг | Vercel (новый проект prohikes) |

## Current State

**Миграция завершена (R1–R8). Идёт доводка до запуска — план в `PLAN.md`.**

| Раунд | Сделано |
|---|---|
| R1–R4 | Миграция всех страниц, компонентов, хуков, i18n |
| R5 | Фикс TS-ошибок: `ai/react` → `@ai-sdk/react` v4 (ChatWidget) |
| R6 | Чистка App Router артефактов (request.ts, createNavigation) |
| R7 | Фикс 404 на Vercel: замена `next-intl/middleware` на свой middleware |
| R8 | `LAUNCH.md` — чеклист запуска (в R10 заменён на `PLAN.md`) |
| R9 | Supabase MCP подключён (PAT + opencode.json); July 2026 update — без влияния на код |
| R10 | Аудит реальности + синхронизация документации; `public/sw.js` убран из git; build script → `--webpack` |

**Деплой:** `https://prohikes-ten.vercel.app` — публичный, автодеплой из GitHub `main` (Vercel-проект подвязан к репо). Адрес `prohikes.vercel.app` занят чужим проектом и нашим не будет. Свободный кандидат на алиас: `hiker.vercel.app`. ENVIRONMENT_FALLBACK (косметика) остаётся.

**Осталось до запуска — см. `PLAN.md`:** BYOK-фикс (сломан: клиент не отправляет ключи), локальный офлайн-тест, деплой с рабочим SW, Google OAuth URI, запуск-QA.

⚠️ **Push embargo:** пуш в GitHub = автодеплой на Vercel. Пушить только с явного «да» пользователя (после локальной проверки офлайна).

## Gotchas

- **`next-intl/middleware` v4 не работает с Pages Router + Next.js 16** — вызывает 404 на всех страницах. Заменён на свой middleware в `src/middleware.ts`.
- **`ENVIRONMENT_FALLBACK`** — ошибка от `useTranslations()` при сборке, безвредна. Известный баг next-intl v4 + Next.js 16.
- **`@ai-sdk/react` v4 API** отличается от старого `ai/react` — `input`/`handleInputChange`/`handleSubmit` заменены на ручной `useState` + `sendMessage({ text })`.
- **`prohikes.vercel.app` — чужой сайт** («ProHikes - Digital Services»). Наш домен: `prohikes-ten.vercel.app`. Не путать в конфигах Google OAuth / Supabase.
- **Vercel собирает без `--webpack`, если build script его не указывает** → Serwist не запускается → SW нет/устаревший. `public/sw.js` — build-артефакт, в git ему не место (вычищен в R10).
- **BYOK после миграции на `@ai-sdk/react` v4** — `readByok()` читает ключи, но транспорт их не отправляет (`ChatWidget.tsx`: транспорт без `body`). Сервер ждёт `req.body.ai/search`. Чинится в R11 (PLAN.md).

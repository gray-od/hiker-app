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

**Миграция завершена.** Все страницы и API перенесены из hiker-app → Pages Router.

| Раунд | Сделано |
|---|---|
| R1–R4 | Миграция всех страниц, компонентов, хуков, i18n |
| R5 | Фикс TS-ошибок: `ai/react` → `@ai-sdk/react` v4 (ChatWidget) |
| R6 | Чистка App Router артефактов (request.ts, createNavigation) |
| R7 | Фикс 404 на Vercel: замена `next-intl/middleware` на свой middleware |
| R8 | `LAUNCH.md` — чеклист для публичного запуска |

**Деплой:** Vercel `https://prohikes.vercel.app` — собирается без ошибок. ENVIRONMENT_FALLBACK (косметика) остаётся.

**Не сделано (в LAUNCH.md):**
- [ ] Google OAuth redirect URI в Google Cloud Console
- [ ] BYOK миграция на новый API
- [ ] PWA/офлайн тестирование
- [ ] SEO, безопасность, мониторинг

## Gotchas

- **`next-intl/middleware` v4 не работает с Pages Router + Next.js 16** — вызывает 404 на всех страницах. Заменён на свой middleware в `src/middleware.ts`.
- **`ENVIRONMENT_FALLBACK`** — ошибка от `useTranslations()` при сборке, безвредна. Известный баг next-intl v4 + Next.js 16.
- **`@ai-sdk/react` v4 API** отличается от старого `ai/react` — `input`/`handleInputChange`/`handleSubmit` заменены на ручной `useState` + `sendMessage({ text })`.

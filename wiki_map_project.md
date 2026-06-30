# ProHikes — Project Map

## Origin

Migrated from `D:\Projects\hiker-app` (Next.js 16 App Router + Supabase PWA) to Pages Router.

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

**Round 2 — Фундамент Pages Router:** готовы все базовые файлы:
- `_app.tsx` — Providers (next-themes + next-intl + AppShell + Analytics)
- `_document.tsx` — PWA meta, theme-color, manifest, Plausible
- `middleware.ts` — цепочка Supabase auth + next-intl i18n
- `next.config.ts` — Serwist + webpack + Supabase images + PWA headers
- `src/sw.ts` — Serwist service worker
- `src/lib/cache.ts` — IndexedDB (idb v8) cache-first wrapper для 9 функций service.ts
- `src/components/OfflineBanner.tsx` — индикатор офлайн-режима
- Компоненты AppShell, Navbar, useAuth — адаптированы под Pages Router (next/router)
- `tsc --noEmit`: ошибок на новых файлах нет (2 предсуществующих в ChatWidget.tsx)

**Осталось:** адаптировать 16 страниц + 4 API routes + auth callback.

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

**Round 2 — Фундамент Pages Router:** готовы все базовые файлы.
**Round 3 — Core pages + API:** адаптированы auth callback, login, dashboard, chat API (AI SDK v7), error/404.
**Round 4 — All remaining pages:** адаптированы gear, food, lists (3), meals (4), settings, privacy + 2 API + 11 компонентов.

**Миграция завершена.** Все страницы и API перенесены. `tsc --noEmit`: 2 ошибки (ChatWidget — из R1, не регресс).

**Осталось:** деплой на Vercel + Google Cloud redirect URI.

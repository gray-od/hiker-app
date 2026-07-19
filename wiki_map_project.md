# ProHikes — Project Map

## Origin

Migrated from `D:\Projects\hiker-app` (Next.js 16 App Router + Supabase PWA) to Pages Router.

**GitHub:** https://github.com/gray-od/hiker-app (public, branch `main`)
**Supabase:** проект `lcqsbjflososfglajydw` (тот же что и hiker-app)

## Why Pages Router

App Router RSC-навигация требует сервер при каждом переходе. Без интернета — навигация ломается. Pages Router делает SPA-переходы на клиенте — офлайн-совместим.

## Architecture

| Слой | Технология |
|---|---|
| Роутер | Next.js 16 Pages Router |
| Стили | Tailwind v4 |
| БД + Auth | Supabase (тот же проект что и hiker-app) |
| i18n | next-intl v4 (uk/ru/en, middleware-based) |
| Темы | next-themes |
| AI | Gemma 4 26B (`ai@4.3.19` + `@ai-sdk/google@1.2.22`) + Exa + Open-Meteo |
| SW | @serwist/next + webpack |
| Офлайн-данные | IndexedDB (idb) cache-first + TTL 5мин в service.ts |
| Офлайн-очередь | IndexedDB queue для 12 CRUD мутаций |
| Хостинг | Vercel (проект hiker-app, домен hiker-app.vercel.app) |

## Current State

**Код готов (R1–R20). Деплой: `hiker-app.vercel.app`**

### Что работает

| Функция | Статус |
|---|---|
| Все 17 страниц + forgot-password | ✅ |
| Google-вход | ✅ |
| Email/пароль регистрация (autoconfirm) | ✅ |
| Сброс пароля через контрольный вопрос | ✅ PBKDF2-хеш, без SMTP |
| Смена пароля в настройках | ✅ |
| AI-чат (Gemma 4, BYOK, 8 инструментов) | ✅ |
| CRUD gear/food/lists/meals | ✅ |
| Офлайн: SW (precache всех страниц) + IndexedDB (TTL 5мин) + mutation queue | ✅ |
| i18n (uk/ru/en), тёмная тема | ✅ |
| favicon, robots.txt, SEO meta на всех страницах | ✅ |

### Что НЕ работает

| Функция | Причина |
|---|---|
| Подтверждение email при регистрации | Нет работающего SMTP |

### Блокер: SMTP

Проверены варианты без своего домена:
- **Resend** — требует домен
- **Brevo** — аккаунт не активирован для SMTP
- **Gmail SMTP** — Google блокирует отправку с серверов Supabase
- **Supabase встроенный** — только для авторизованных адресатов

**Вывод:** без своего домена SMTP не отправляет письма произвольным получателям (SPF/DKIM/DMARC).

### Деплой

`https://hiker-app.vercel.app` — автодеплой из GitHub `gray-od/hiker-app` main.

## Gotchas

- **`next-intl/middleware` v4 не работает с Pages Router + Next.js 16** — заменён на свой middleware
- **`ENVIRONMENT_FALLBACK`** — безвредная ошибка сборки, баг next-intl v4 + Next.js 16
- **`ai@4` vs `ai@7`** — используется `ai@4.3.19`. Обновление до v7 было ошибкой — откат в R13
- **Vercel собирает без `--webpack` → SW нет** — исправлено: build script = `next build --webpack`
- **Офлайн страницы** — добавлен `additionalPrecacheEntries` для всех URL страниц в next.config.ts
- **Google Cloud Console для входа НЕ нужен** — `signInWithOAuth` через Supabase-callback

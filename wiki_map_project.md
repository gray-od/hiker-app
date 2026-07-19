# ProHikes — Project Map

## Origin

Migrated from `D:\Projects\hiker-app` (Next.js 16 App Router + Supabase PWA) to Pages Router.

**GitHub:** https://github.com/gray-od/prohikes (private, branch `main`)
**Source context:** `D:\Projects\hiker-app\AGENTS.md` + `D:\Projects\hiker-app\wiki_map_project.md`

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
| Офлайн-данные | IndexedDB (idb) cache-first в service.ts (R15) |
| Хостинг | Vercel (проект prohikes) |

## Current State

**Код готов (R1–R17). Email-регистрация БЕЗ подтверждения (autoconfirm). Сброс пароля НЕ работает. SMTP — открытый вопрос.**

### Что работает (R1–R17)

| Функция | Статус |
|---|---|
| Все 17 страниц (полный паритет с hiker-app) | ✅ |
| Google-вход | ✅ |
| AI-чат (Gemma 4, BYOK, 8 инструментов) | ✅ |
| CRUD gear/food/lists/meals | ✅ |
| Офлайн: SW (Serwist) + IndexedDB (cache.ts → service.ts) | ✅ |
| i18n (uk/ru/en), тёмная тема | ✅ |
| favicon, robots.txt, SEO meta на всех страницах | ✅ |
| Email-регистрация (autoconfirm: true) | ✅ Без подтверждения |

### Что НЕ работает

| Функция | Причина |
|---|---|
| Подтверждение email при регистрации | Нет работающего SMTP |

### Что работает (R18)

| Функция | Статус |
|---|---|
| Сброс пароля через контрольный вопрос | ✅ Без SMTP — PBKDF2-хеш ответа в `user_security` |
| Смена пароля в настройках | ✅ `updateUser({ password })` |

### Блокер: SMTP

Проверены варианты без своего домена:
- **Resend** — требует домен (бесплатно только на свой email)
- **Brevo** — аккаунт не активирован для SMTP (нужен контакт с поддержкой)
- **Gmail SMTP** — Google блокирует отправку с серверов Supabase
- **Supabase встроенный** — только для авторизованных адресатов на бесплатном плане

**Вывод:** без своего домена никакой SMTP-провайдер не отправляет письма подтверждения произвольным получателям. Это индустриальный стандарт (SPF/DKIM/DMARC).

**Workaround сейчас:** пользователь забыл пароль → входит через Google (та же почта).

### Деплой

`https://prohikes-ten.vercel.app` — автодеплой из GitHub `main`.

### Push embargo

⚠️ Пуш = автодеплой на Vercel. Пушить только с явного «да» пользователя.

## Gotchas

- **`next-intl/middleware` v4 не работает с Pages Router + Next.js 16** — заменён на свой middleware.
- **`ENVIRONMENT_FALLBACK`** — ошибка при сборке, безвредна. Баг next-intl v4 + Next.js 16.
- **`ai@4` vs `ai@7`** — ProHikes использует `ai@4.3.19` (зеркало hiker-app). Обновление до v7 в R5 было ошибкой — откат в R13.
- **`prohikes.vercel.app` — чужой сайт.** Наш домен: `prohikes-ten.vercel.app`.
- **Vercel собирает без `--webpack` → SW нет.** Исправлено: build script = `next build --webpack`.
- **`gray@multima.local`** — git email исправлен на `s.odessa0@gmail.com` (R13).
- **Email-регистрация не работала в hiker-app тоже** — спящая поломка (все 3 юзера — Google).
- **Google Cloud Console для входа НЕ нужен** — `signInWithOAuth` через Supabase-callback.

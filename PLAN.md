# PLAN.md — ProHikes: путь до запуска

> Единственный источник правды по оставшейся работе. Обновлять после каждого раунда.
> Заменил LAUNCH.md (R10, 2026-07-17).

## Снимок реальности (2026-07-17, аудит R10)

- Код миграции полный: 21 страница/API, чистый middleware, Serwist подключён
- Деплой живёт: `https://prohikes-ten.vercel.app` (публичный, автодеплой из GitHub `main`)
- `prohikes.vercel.app` — чужой сайт. Свободный кандидат на алиас: `hiker.vercel.app`
- **BYOK сломан**: клиент читает ключи (`ChatWidget.tsx`), но не отправляет; сервер ждёт `req.body.ai/search`
- **SW на проде под вопросом**: build script был без `--webpack` (исправлено в R10), `public/sw.js` лежал в git артефактом (вычищен в R10). До перевыката SW на проде нерабочий/устаревший
- Офлайн ни разу не тестировался — ни локально, ни на проде

## ⚠️ Правила

1. **Push embargo:** `git push` = автодеплой на Vercel. Пушить ТОЛЬКО с явного «да» пользователя. До этого — коммиты локально
2. Миграции БД (`apply_migration`) — только после явного подтверждения (прод-БД общая с hiker-app)
3. После каждого раунда: обновить этот файл + Round History в AGENTS.md

---

## R11 — BYOK-фикс (код)

- [ ] `ChatWidget.tsx`: прокинуть `readByok()` в тело каждого запроса — `body`-опция `DefaultChatTransport` или кастомный `fetch` (проверить сигнатуру в `node_modules/ai`)
- [ ] Сверить контракт с `pages/api/chat.ts:38` (`{ messages, ai, search }`)
- [ ] `npx tsc --noEmit` чисто
- [ ] `npx next build --webpack` успешен, `public/sw.js` генерируется

**Выход:** ключи из localStorage доходят до API; сборка зелёная.

## R12 — Офлайн локально (суть проекта)

- [ ] `npx next build --webpack` → осмотреть precache manifest в `public/sw.js` (все ли статик-ассеты и JS-бандлы страниц)
- [ ] `npx next start` → залогиниться → обойти все страницы онлайн (прогрев IndexedDB + SW-кэша)
- [ ] DevTools → Offline → пройти все 13 страниц: dashboard, gear, food, lists, lists/[id], lists/[id]/print, meals, meals/[id], meals/[id]/print, meals/[id]/shopping, settings, privacy, login
- [ ] Данные из IndexedDB отображаются (gear, lists, meals)
- [ ] OfflineBanner показывается при потере сети
- [ ] Фикс-цикл при провалах (агенты), критерий — все страницы живы офлайн

**Выход:** полная офлайн-навигация с данными локально. **Ворота для push.**

## R13 — Деплой

- [ ] Подтверждение пользователя → `git push` (автодеплой prohikes-ten)
- [ ] Проверить на Vercel: build прошёл c webpack, `/sw.js` отдаётся, регистрация SW в HTML
- [ ] Проверить 6 env vars в Vercel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_GENERATIVE_AI_API_KEY, EXA_API_KEY, NEXT_PUBLIC_DONATE_URL
- [ ] **Google Cloud Console (пользователь):** добавить `https://prohikes-ten.vercel.app/api/auth/callback` в Authorized redirect URIs; проверить `http://localhost:3000/api/auth/callback` для dev
- [ ] **Supabase (я, Management API):** добавить `https://prohikes-ten.vercel.app` в Auth Redirect URLs
- [ ] Прод-smoke онлайн: email-вход, Google-вход, чат AI, CRUD gear/lists/meals
- [ ] Опционально: алиас `hiker.vercel.app` (свободен)

**Выход:** прод работает онлайн, оба входа живы.

## R14 — Прод-офлайн + запуск-QA

Офлайн на проде:
- [ ] Телефон: открыть сайт → авиарежим → навигация по страницам с данными

Финализация (из старого LAUNCH.md):
- [ ] Supabase Auth Settings: Confirm email (решить UX), Rate Limiting
- [ ] Vercel Analytics включить (`@vercel/analytics` уже в deps)
- [ ] Лимиты Serverless Functions (AI-чат долгий)
- [ ] SEO: `<Head>` на всех страницах (сейчас на dashboard нет `<title>`!), favicon/manifest/robots, sitemap по желанию
- [ ] Безопасность: SERVICE_ROLE_KEY только в API-роутах; RLS-политики (через MCP advisors); нет секретов в NEXT_PUBLIC_*; CSP-заголовки
- [ ] Мониторинг: Vercel Runtime Logs, алерты Supabase, логирование в `_error.tsx`
- [ ] README.md обновить (локальный запуск, env vars)

Финальная QA-матрица:
- [ ] Регистрация + email-вход | Google-вход | AI-чат | CRUD gear | CRUD lists | CRUD meals | uk/ru/en | тёмная/светлая тема | мобильная вёрстка | офлайн

**Выход:** проект запущен. hiker-app закрыть (репо + Vercel) — по решению пользователя.

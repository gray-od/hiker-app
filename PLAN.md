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

## R11 — BYOK-фикс (код) ✅ (2026-07-17)

- [x] `ChatWidget.tsx`: `readByok()` вынесен на уровень модуля, прокинут через `body: () => readByok()` в `DefaultChatTransport` (Resolvable — вычисляется на каждый запрос)
- [x] Контракт сверен: сервер ждёт `{ messages, ai, search }` — форма совпадает
- [x] `npx tsc --noEmit` чисто
- [x] `npx next build --webpack` успешен, `public/sw.js` генерируется (43 896 байт)

**Выход:** ключи из localStorage доходят до API; сборка зелёная. ✅

## R12 — Офлайн локально (суть проекта) ✅ (2026-07-17)

- [x] `npx next build --webpack` → precache manifest осмотрен: все чанки страниц (вкл. динамические `[id]` в URL-кодировке), framework/main, CSS, шрифты
- [x] `npx next start` → первый прогон пользователем: **OfflineBanner ✅, страницы открываются ✅, F5 офлайн выживает ✅**
- [x] Фикс-цикл №1 (2026-07-17):
  - [x] uuid "undefined" — guard `router.isReady + typeof id === 'string'` во всех 5 динамических страницах
  - [x] `manifest.json` создан (был 404 → PWA-установка не работала), apple-touch-icon починен (`/icons/…` → `/icon-180x180.png`), добавлен `mobile-web-app-capable`
  - [x] React #418 (гидрация): локаль — двухпроходный паттерн в `_app.tsx` (SSR/первый рендер = path-локаль или uk, cookie — после mount); даты в 3 print/shopping-страницах — в useEffect
- [x] Повторный прогон пользователем: uuid-ошибка ушла ✅, manifest 404 ушёл ✅, #418 ушёл ✅, офлайн-обход полный ✅ («страницы в офлайне работают, ошибка в программе не появлялась»)
- [x] Данные из IndexedDB отображаются офлайн

**Известное локальное «не-баг»:** `/_vercel/insights/script.js` (ERR_BLOCKED_BY_CLIENT онлайн = блокировщик рекламы; no-response офлайн = скрипт есть только на платформе Vercel). Шум «listener indicated…» и Adobe-шрифты — расширения браузера.

**Выход достигнут: полная офлайн-навигация с данными локально. Ворота для push ОТКРЫТЫ.** ✅

## R13 — Деплой (следующий шаг; ждёт подтверждения пользователя)

Порядок согласован 2026-07-17. Открытие: **Google Cloud Console НЕ нужен** — вход идёт `signInWithOAuth` через Supabase (`login.tsx:67-70`), Google видит только Supabase-callback, он уже прописан (hiker-app работает через него).

- [ ] **Я, PATCH auth-конфига** (Management API, одним вызовом): `uri_allow_list` += `https://prohikes-ten.vercel.app/**`; `site_url` → `https://prohikes-ten.vercel.app` (ссылки в письмах перестанут вести на localhost). Подтверждение почты НЕ отключаем
- [ ] Подтверждение пользователя → `git push` (уедут коммиты R9–R12, автодеплой prohikes-ten)
- [ ] Проверить деплой через GitHub API (state=success) + Vercel build с webpack: `/sw.js` отдаётся, precache свежий
- [ ] Проверить 6 env vars в Vercel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_GENERATIVE_AI_API_KEY, EXA_API_KEY, NEXT_PUBLIC_DONATE_URL
- [ ] Smoke пользователем: **Google-вход** (аккаунт s.odessa0 — общая БД, данные на месте), чат AI, CRUD, офлайн на телефоне
- [ ] Email-форма остаётся как есть (заработает в R14 после SMTP)
- [ ] Опционально: алиас `hiker.vercel.app` (свободен)

**Выход:** прод живой, Google-вход работает, офлайн на телефоне подтверждён.

## R14 — Email-регистрация (SMTP) + прод-QA + запуск

**Продуктовое решение (2026-07-17): регистрация email+пароль ОБЯЗАТЕЛЬНА для запуска** (Европа не доверяет Google-входу). Факт: в hiker-app она никогда не работала — спящая поломка (все 3 юзера — Google; site_url=localhost; встроенный SMTP 2 письма/час).

SMTP (путь B, согласован):
- [ ] Пользователь: завести бесплатный аккаунт Resend или Brevo (100–300 писем/день), получить SMTP-ключ (пошаговую инструкцию дам на месте)
- [ ] Я: вписать SMTP в Supabase через Management API + поднять rate limit писем
- [ ] Подтверждение почты остаётся ВКЛючённым (правильно для Европы)
- [ ] Тест end-to-end: регистрация свежей почтой → письмо дошло (не спам) → ссылка ведёт на прод → аккаунт подтверждён → вход
- [ ] Позже (опционально): свой домен для отправителя (`no-reply@…`) — лучшая доставляемость

Прод-офлайн:
- [ ] Телефон: открыть сайт → авиарежим → навигация по страницам с данными

Финализация (из старого LAUNCH.md):
- [ ] Supabase Auth Settings: Rate Limiting ревизия
- [ ] Vercel Analytics включить (`@vercel/analytics` уже в deps)
- [ ] Лимиты Serverless Functions (AI-чат долгий)
- [ ] SEO: `<Head>` на всех страницах (сейчас на dashboard нет `<title>`!), favicon/robots, sitemap по желанию
- [ ] Безопасность: SERVICE_ROLE_KEY только в API-роутах; RLS-политики (через MCP advisors); нет секретов в NEXT_PUBLIC_*; CSP-заголовки
- [ ] Мониторинг: Vercel Runtime Logs, алерты Supabase, логирование в `_error.tsx`
- [ ] README.md обновить (локальный запуск, env vars)

Финальная QA-матрица (перед «в свет»):
- [ ] Регистрация + email-вход | Google-вход | AI-чат | CRUD gear | CRUD lists | CRUD meals | uk/ru/en | тёмная/светлая тема | мобильная вёрстка | офлайн

**Выход:** проект запущен публично. hiker-app закрыть (репо + Vercel) — по решению пользователя.

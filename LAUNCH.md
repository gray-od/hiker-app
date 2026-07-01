# ProHikes — Launch Checklist

## 1. Auth Fixes
- [ ] **Google Cloud Console** — добавить `https://prohikes.vercel.app/api/auth/callback` в Authorized redirect URIs (OAuth 2.0 Client ID)
- [ ] **Google Cloud Console** — проверить, что `http://localhost:3000/api/auth/callback` тоже в списке (для dev)
- [ ] Протестировать Google-вход на Vercel и локально
- [ ] **Supabase Dashboard** → Authentication → Settings:
  - [ ] Отключить Confirm email (или включить — зависит от UX)
  - [ ] Проверить Rate Limiting
  - [ ] Настроить Redirect URLs: добавить `https://prohikes.vercel.app`

## 2. BYOK (Bring Your Own Key) — миграция на новый API
- [ ] `ChatWidget.tsx` — вернуть поддержку BYOK (AI/Search ключи через `localStorage`)
  - Старый код слал `{ body: readByok() }` с каждым сообщением
  - Новый API (`sendMessage`) требует кастомный `fetch` в `DefaultChatTransport`
- [ ] `pages/api/chat.ts` — проверить, что `req.body.ai` и `req.body.search` читаются корректно с новым клиентом

## 3. Offline (PWA) — тестирование
- [ ] Открыть сайт онлайн → перейти в офлайн → пройтись по страницам
- [ ] Проверить, что Service Worker (`/sw.js`) кэширует статику (CSS, JS, шрифты)
- [ ] Проверить IndexedDB-кэш (`src/lib/cache.ts`): gear, lists, meals загружаются без интернета
- [ ] Проверить OfflineBanner — показывается при потере сети

## 4. Vercel — финализация
- [ ] Убедиться, что продакшн-деплой проходит чисто (без ENVIRONMENT_FALLBACK в логах — опционально)
- [ ] Включить Vercel Analytics
- [ ] Установить лимиты на Serverless Functions (AI chat может быть долгим)
- [ ] Настроить кастомный домен (если нужен, например `prohikes.app`)

## 5. SEO & Мета
- [ ] Проверить `<Head>` на всех страницах (title, description, og:image)
- [ ] `public/` — проверить favicon, manifest.json, robots.txt
- [ ] Проверить `sitemap.xml` (если нужен — сгенерировать)

## 6. Безопасность
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — убедиться, что используется только в API-роутах (не на клиенте)
- [ ] Проверить RLS-политики в Supabase для всех таблиц
- [ ] `NEXT_PUBLIC_*` переменные — проверить, что нет секретов в публичных переменных
- [ ] Проверить CSP-заголовки (next.config.ts → `headers()`)

## 7. Мониторинг
- [ ] Vercel → Logs → включить Runtime Logs
- [ ] Supabase → настроить алерты на ошибки
- [ ] `_error.tsx` — добавить логирование ошибок (например, Sentry или Vercel Logs)

## 8. Документация
- [ ] `README.md` — обновить (как запустить локально, какие env vars нужны)
- [ ] `wiki_map_project.md` — обновить Current State

## 9. Финальное тестирование
- [ ] Регистрация + вход (email/пароль)
- [ ] Google-вход
- [ ] Чат с AI — задать вопрос про снаряжение
- [ ] Создать/редактировать gear item
- [ ] Создать/редактировать packing list
- [ ] Создать/редактировать meal plan
- [ ] Переключение языков (uk/ru/en)
- [ ] Тёмная/светлая тема
- [ ] Мобильная верстка (проверить на телефоне)
- [ ] Офлайн-режим

---

**Порядок выполнения:** 1 → 2 → 3 → 4 → 5/6/7 параллельно → 9

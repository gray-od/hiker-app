# PLAN.md — ProHikes: путь до запуска

> Состояние на: 2026-07-18

## Снимок реальности

| Функция | Статус |
|---|---|
| Google-вход | ✅ |
| AI-чат (Gemma 4, BYOK, 8 инструментов) | ✅ |
| CRUD gear/food/lists/meals | ✅ |
| Офлайн (SW Serwist + IndexedDB cache) | ✅ |
| i18n (uk/ru/en), тёмная/светлая тема | ✅ |
| SEO (favicon, meta, robots.txt, manifest) | ✅ |
| Полный паритет страниц с hiker-app (17 стр.) | ✅ |
| Email-регистрация (автоподтверждение) | ✅ |
| Подтверждение email письмом | ❌ Нет SMTP |
| Сброс пароля | ❌ Нет SMTP |

## Блокер: SMTP для подтверждения email и сброса пароля

### Что проверено

| Сервис | Причина отказа |
|---|---|
| Resend | Требует домен (бесплатно — только на свой email) |
| Brevo | Аккаунт создан, телефон подтверждён, но SMTP не активирован (требуется обращение в поддержку) |
| Gmail SMTP | Google блокирует отправку с серверов Supabase как подозрительную |
| Supabase встроенный | Только для авторизованных адресатов на бесплатном плане |

### Вывод

Все бесплатные SMTP требуют либо свой домен, либо личную почту. Это индустриальный стандарт (SPF/DKIM/DMARC).

### Workaround сейчас

Пользователь забыл пароль → входит через Google (та же почта). Для open-source hiking-PWA — приемлемо.

### Пути решения (на будущее)

| Вариант | Стоимость |
|---|---|
| Купить домен (.xyz ~$1/год) → любой SMTP | ~$1 |
| Brevo — написать в поддержку для активации SMTP | Бесплатно, но нужен домен для отправки |
| Maileroo — sandbox domain (не требует свой домен) | Бесплатно, 3000/мес |

## ⚠️ Правила

1. **Push embargo:** пуш = автодеплой на Vercel. Пушить только с явного «да» пользователя
2. **Никаких односторонних правок** — только диагностика без согласования
3. После каждого раунда: обновить этот файл + Round History в AGENTS.md

---

## Выполненные раунды

### R13 — AI-фикс + деплой ✅ (2026-07-18)
- Откат `ai@7` → `ai@4` (причина: «AI service temporarily unavailable»)
- `ChatWidget.tsx`: `msg.parts` → `msg.content` (формат ai@4)
- `chat.ts`: `inputSchema` → `parameters`, `stopWhen` → `maxSteps`, `pipeDataStreamToResponse`
- Git email исправлен: `gray@multima.local` → `s.odessa0@gmail.com`
- Supabase: `site_url` → prohikes-ten, `uri_allow_list` += prohikes-ten

### R15 — IndexedDB cache ✅ (2026-07-18)
- `cache.ts` подключён к `service.ts` (9 функций)
- 12 функций мутаций вынесены из страниц в `service.ts` с инвалидацией кеша
- 4 страницы (gear, food, lists, lists/[id]) теперь используют `service.ts` для всех записей

### R16 — Favicon ✅ (2026-07-18)
- `_document.tsx`: добавлены `<link rel="icon">` для переопределения иконки Vercel

### R17 — Полный аудит ✅ (2026-07-18)
- Созданы `/gear/print` и `/food/print` (отсутствовали, был 404)
- `manifest.json`: theme_color → `#75a93a`
- `robots.txt` создан
- Meta description на всех 12 страницах

---

## Осталось

### SMTP — единственный открытый вопрос
- [ ] Найти бесплатный SMTP-провайдер без требования домена
- [ ] Или купить домен (~$10/год) → любой SMTP

## Выполненные раунды (сверх списка выше)

### R18 — Восстановление пароля без SMTP ✅ (2026-07-19)
- Контрольный вопрос при регистрации (PBKDF2-хеш)
- Страница `/forgot-password` — 3 шага: email → вопрос → новый пароль
- Смена пароля в `/settings`
- Supabase: таблица `user_security` + SECURITY DEFINER функции
- 3 API-роута: security, recover, lookup

### R19 — Глубокий аудит и исправление 14 багов ✅ (2026-07-19)
- Безопасность: auth на byok/validate, `getUser` вместо `getSession` в chat
- `.catch()` на 5 страницах (бесконечный спиннер)
- `Promise.all` → `Promise.allSettled` в index.tsx
- Унификация сообщений об ошибках
- Hydration fix на print-страницах
- HTTP method guards на API-роутах
- Локализация formatKbju, zod в deps, удаление 5 мёртвых файлов
- Cookie persistence в middleware

### R20 — Улучшения ✅ (2026-07-19)
- IndexedDB TTL 5 минут
- Google-вход как fallback на forgot-password
- Офлайн-очередь мутаций (12 CRUD-функций в service.ts)

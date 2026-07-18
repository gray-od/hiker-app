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

### R18 — Замена hiker-app
- [ ] Force push ProHikes → репо `hiker-app` (код уже залит, ждёт проверки)
- [ ] Vercel авто-деплоит → `hiker-app.vercel.app` = ProHikes
- [ ] Проверить: Google-вход, AI, CRUD, офлайн, регистрация
- [ ] `site_url` → `hiker-app.vercel.app`
- [ ] Удалить Vercel-проект `prohikes`
- [ ] GitHub: архивировать/удалить `gray-od/prohikes`

⚠️ R18 заблокирован до решения SMTP.

# ProHikes

AI-first hiking planner — gear, packing lists, meals, and an AI partner that actually thinks.

**URL:** [hiker-app.vercel.app](https://hiker-app.vercel.app)

## Stack

- **Frontend:** Next.js 16 Pages Router + TypeScript + Tailwind v4
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **i18n:** next-intl v4 (uk/ru/en)
- **AI:** Gemma 4 26B via AI SDK v4 + Exa search + Open-Meteo weather
- **Offline:** Service Worker (Serwist) + IndexedDB
- **Auth:** Google OAuth + email/password with security-question recovery
- **Hosting:** Vercel

## Features

- Gear management with weight tracking
- Food products database
- Packing lists with GPX route import + weather
- Meal plans with day-by-day calories, templates, shopping list
- AI chat with live weather, web search, hiking knowledge, and full access to your gear, food, lists, and meals
- Dark/light theme, 3 languages (UA/RU/EN)

### Auth & Registration

- **Google OAuth** — sign in with Google in one click
- **Email + password** — sign up and sign in with your email address
- **Password recovery** — answer the security question you set at signup to reset a forgotten password
- **Google fallback** — if you can't answer your security question, sign in with Google using the same email and change your password in Settings
- **Password change** — available in `/settings` for signed-in users

### Offline (PWA)

- **Offline pages** — pages you have already visited stay available without a connection
- **Offline data** — gear, food, lists, and meals stay accessible offline and refresh in the background once you are back online
- **Offline edits** — changes made offline are queued and synced automatically when the connection returns
- **Page reload** — refreshing while offline works as expected

## Getting started

Prerequisites: **Node.js 22+** and npm.

```bash
npm install
npm run dev     # start the development server at http://localhost:3000
npm run build   # create a production build
npm run start   # serve the production build
```

Copy `.env.example` to `.env.local` and fill in your own values — the file lists the variable names only. Never commit real keys.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, architecture, project structure, and contribution guide.

## License

The source code is publicly available for viewing and reference. The project is not open for reuse or derivative works — see [LICENSE](LICENSE) for the full terms.

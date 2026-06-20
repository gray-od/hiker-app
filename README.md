# ProHikes

**AI-first hiking planner. Gear, meals, and an AI partner that actually thinks.**

Built by a hiker. Coded by AI. Open source.

[Live App](https://hiker-app.vercel.app) · [Report Bug](https://github.com/gray-od/hiker-app/issues)

---

## The Shift

Every hiking app gives you CRUD and a pie chart. You stare at a circle that says "shelter is 40% of your pack weight" — and then what? You still have to figure out what to do about it.

ProHikes takes a different approach:

| Old way | ProHikes way |
|---|---|
| Pie chart shows weight distribution | AI says "your tent is 2.4 kg — swap to X, save 800 g" |
| CSV import with column mapping dialogs | Paste your spreadsheet into chat — AI imports it |
| 7-step onboarding tutorial | AI sees an empty list and asks "packing for the Carpathians?" |
| Filter dropdowns to find gear | Tell AI "show me clothing over 200 g" in plain language |
| Static meal plan templates | AI builds a custom plan for your trip, season, and group size |

The AI isn't a chatbot bolted onto a database. It reads your gear, lists, and meal plans. It has tools to create, import, and analyze your data. It searches the web for current trail conditions, weather, and emergency contacts. It's a hiking partner that lives inside your planner.

## Features

**Gear Hub** — full inventory of your hiking gear. Weight tracking, 16 categories, season tags. Print your full gear list to PDF.

**Packing Lists** — create trip-specific lists from your gear library. Track packed/worn/consumable items. Progress bar. Weight breakdown with explanations. Print with checkboxes for paper.

**Meal Plans** — 75 built-in hiking products with calories, protein, fat, carbs. 3 plan types (comfort, standard, ultralight). Cyclic templates. Group calculations. Custom food library. Print detailed nutrition tables.

**AI Assistant** — powered by DeepSeek with Tavily web search. 5 levels of expertise: app navigator, data analyst, gear consultant, route specialist, survival expert. 4 tools: create meal plans, add gear items, create packing lists, add items to lists. Upload CSV/TXT files directly into chat. 15 free messages per day.

**Mobile-first PWA** — 44px touch targets, 17px base font, safe-area support, card layouts on mobile, tables on desktop. Install as app on any device.

**i18n** — Ukrainian (default), Russian, English. Cookie-based locale, no URL prefixes.

**Dark mode** — Light, Dark, System. Class-based via next-themes.

## Data Transparency

Your data, your rules. Here's exactly what goes where:

| Data | Where it goes | Stored? |
|---|---|---|
| Gear, lists, meals, food items | Supabase (PostgreSQL, EU) | Yes, your account |
| Google/Email auth | Supabase Auth | Email + name only |
| AI chat messages | DeepSeek API (processing) | Not stored by provider |
| AI web search queries | Tavily API (search) | Not stored |
| Page view analytics | Vercel Analytics | Anonymous, no cookies |

**What we don't do:** sell data, share with advertisers, track across sites, use cookies for tracking.

Don't trust us? Read the code. The AI route is at [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) — every byte sent to external APIs is right there.

## Built by a Hiker, Coded by AI

I'm not a programmer. I'm a hiker who needed a tool that didn't exist.

70% of Ukrainian hikers plan trips in Google Sheets. Zero dedicated apps in the Ukrainian market. The international apps (LighterPack, PackWizard) don't do meal planning and don't speak Ukrainian.

So I built one. Every line of code in this project was written by AI — DeepSeek, orchestrated through [OpenCode](https://opencode.ai). 21 rounds of development in 4 days. From zero to a deployed product with AI assistant, three languages, and a mobile-first PWA.

This isn't a limitation — it's the point. In 2026, you don't need to know how to code. You need to see a problem, understand the domain, and have the persistence to iterate until it works.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind v4 |
| Backend | Supabase (PostgreSQL, Auth, RLS) |
| AI | DeepSeek API (chat + function calling), Tavily API (web search) |
| AI SDK | Vercel AI SDK v4 |
| i18n | next-intl v4 |
| Theme | next-themes |
| Hosting | Vercel |
| Analytics | Vercel Analytics |

## Getting Started

```bash
# Clone
git clone https://github.com/gray-od/hiker-app.git
cd hiker-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# DEEPSEEK_API_KEY, TAVILY_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations from `supabase/migrations/` in order (00001 through 00006)
3. Enable Google OAuth and/or Email auth in Authentication → Providers
4. Copy the project URL and anon key to `.env.local`

## Contributing

This is an open source project. PRs, issues, and ideas are welcome.

The codebase is clean TypeScript with no comments (by design). See the tech stack table above and explore `src/` to understand the architecture.

## License

MIT

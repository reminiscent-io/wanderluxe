<div align="center">

# ✈️ WanderLuxe

### *Where Wanderlust Meets Luxury*

**The intelligent travel companion that transforms complex itineraries into seamless journeys.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com/)

[wanderluxe.io](https://wanderluxe.io) • [Explore Public Trips](https://wanderluxe.io/explore) • [Report Bug](https://github.com/reminiscent-io/wanderluxe/issues) • [Request Feature](https://github.com/reminiscent-io/wanderluxe/issues)

</div>

---

## 🌍 About WanderLuxe

Planning extraordinary travel shouldn't feel like work. WanderLuxe is built for the **group organizer** — the person collecting flight confirmations in their inbox, juggling everyone's preferences, and keeping a shared trip from devolving into a thread of *"wait, where are we staying again?"*

WanderLuxe collapses that coordination tax into a single, beautiful, shared picture. Every booking, reservation, and activity finds its place on a timeline the whole group can see and contribute to in real time. AI does the grunt work — paste a confirmation and get a timeline event; ask the assistant for a restaurant and watch it appear on the right day. The core planner is free; a Pro subscription unlocks unlimited AI.

## ✨ What Makes WanderLuxe Special

### 🗺️ **Intelligent Trip Orchestration**
Design your journey with precision and ease, in the view that fits the moment:
- **Timeline view** — day-by-day itinerary with drag-and-drop activity ordering, automatic day generation as dates change, and per-day weather badges
- **Calendar view** — a FullCalendar time grid (3-day default, dense 7am–10pm layout) where you can drag and resize events to reschedule, click to edit, and hover for glanceable peek cards
- **Google Places everywhere** — destinations, hotels, restaurants, and activity locations are all backed by Places autocomplete with photos, ratings, and contact details

### 🏨 **All-in-One Booking Management**
Say goodbye to scattered confirmations and spreadsheet chaos:
- **🏨 Accommodations** — Track every hotel or resort with check-in/check-out precision and automatic night-to-day mapping
- **✈️ Transportation** — Flights, trains, car services, shuttles, ferries, and rental cars. Type a flight number and WanderLuxe auto-fills the airline, airports, and scheduled times via live AeroDataBox lookup
- **🎭 Activities** — Schedule experiences with time blocks, locations, and cost tracking
- **🍽️ Dining** — Reservations with party size, confirmation numbers, and restaurant details
- **👥 Traveler assignment** — Tag exactly who's on each booking, so partial-group plans stay clear

### 🌐 **Timezone-Aware Itineraries**
Built for trips that cross borders. Every item can carry its own IANA timezone — auto-resolved from its location via the Google Time Zone API — with per-leg departure/arrival zones on transportation, zone badges on timeline rows and calendar chips, and zone labels in PDF exports and calendar feeds. Times stay as wall-clock values; nothing gets silently converted.

### 🤖 **Your AI Assistant**
Powered by Google Gemini 2.5 Flash and grounded in your trip's context:
- **Chat with tools** — live Google Places lookup (`find_place`) and web search (`search_web` via Serper) for current, bookable recommendations with verified links
- **Rich place cards** — photos, ratings, and prices with one-tap **Add to trip** (and **Book on Expedia** for hotels)
- **Chat-to-itinerary** — the assistant can create accommodations, transportation, activities, and reservations directly on your timeline
- **Document extraction** — upload a confirmation screenshot or PDF and Gemini vision turns it into structured itinerary items (up to 10 per document), ready to review and import
- **Streaming UX** — buffered SSE responses in a docked desktop panel (collapsible to a floating button) or a full-screen mobile drawer
- **Try before signing up** — anonymous visitors get a 5-message trial on public trips; free accounts get 10 messages + 5 document imports per day; **Pro ($3.99/mo via Stripe) is unlimited**

### 🛎️ **Book Without Leaving**
The trip's **Book** tab embeds an Expedia Group affiliate search widget for stays and flights, AI hotel cards deep-link to Expedia searches, and a human travel advisor (Fora Travel) is one click away for white-glove planning.

### 📅 **Calendar Sync**
Put the itinerary where the group already lives: each trip can serve a **token-gated iCal feed** you can subscribe to from Google Calendar, Apple Calendar, or Outlook — or download as a one-off `.ics`. Feed links can be rotated or disabled anytime, and event times carry destination-zone labels.

### ☀️ **Weather at a Glance**
Per-day forecast badges on the timeline with a detail modal, powered by OpenWeatherMap (current conditions + 5-day forecast, server-side cached so it's fast and cheap).

### 🔌 **Bring Your Trips to Claude (MCP)**
WanderLuxe ships a built-in **Model Context Protocol** server, so Claude and other MCP clients can work with your trips using OAuth-authenticated access to your own data. It's a full read/**write** surface — 21 tools covering trip listing, budgets, and create/update/delete for trips, activities, dining, accommodations, transportation, and expenses — timezone-aware, with confirmation guards before destructive date changes.

### 👥 **Real-Time Collaboration**
Travel planning is better together:
- **Share by email** with view or edit permissions, delivered with notification emails
- **Invite links** with per-link permissions and optional expiry — plus rich link previews when pasted into chats
- **Live sync** over WebSockets: when one person adds an activity, everyone sees it instantly
- **Presence** — avatars show who's viewing the trip right now
- **Trip reminders** — every traveler automatically gets an email 3 days before departure

### 📄 **Professional PDF Exports**
Transform your itinerary into a beautifully formatted, print-ready PDF with one click — with toggles for pictures and prices, Letter/A4 paper sizes, timezone-labeled times, and identical output from mobile or desktop.

### 💰 **Smart Budget Tracking**
Track expenses across accommodations, transportation, activities, dining, and everything else — with paid/unpaid status, multi-currency support, and exchange rates refreshed automatically.

### 🧭 **Explore**
A public, SEO-friendly showcase gallery of real trips — currently traveling, on the horizon, and past adventures — each with a shareable prerendered itinerary page.

## 🏗️ Built With Excellence

WanderLuxe leverages modern, battle-tested technologies to deliver a fast, secure, and delightful experience:

<table>
<tr>
<td width="50%">

### Frontend
- ⚛️ **React 19** + **TypeScript** — Type-safe, component-driven UI
- ⚡ **Vite 8** — Lightning-fast builds and HMR
- 🎨 **Tailwind CSS** — Warm editorial palette with DM Serif Display & DM Sans typography
- 🧩 **Shadcn/ui** + **Radix UI** — Accessible, composable components
- 🗓️ **FullCalendar** + **dnd-kit** — Calendar editing & drag-and-drop
- 🔄 **TanStack Query** — Intelligent server state management

</td>
<td width="50%">

### Backend & Infrastructure
- 🗄️ **Supabase** — PostgreSQL database + Auth + Realtime
- 🚂 **Express** — Node server (API routes, MCP server, iCal feed)
- 🔒 **Row Level Security** — Database-level access control
- ⚡ **Edge Functions** — 13 serverless Deno functions
- 🔌 **WebSocket Subscriptions** — Live collaboration magic
- 💳 **Stripe** — Pro subscription billing
- 📧 **Mailgun** — Share notifications & trip reminder emails

</td>
</tr>
</table>

### 🌐 External APIs & Integrations
**Google Places** • **Google Time Zone** • **Google Gemini 2.5 Flash** • **OpenWeatherMap** (weather) • **AeroDataBox** (flight status) • **Expedia Group Affiliate** (booking) • **Serper** (web search) • **Stripe** • **Mailgun** • **Unsplash** • **ExchangeRate-API** • **PostHog + Google Analytics** (consent-gated) • **Model Context Protocol**

---

## 💎 Technical Highlights

### Real-Time Magic ✨
Live collaboration powered by Supabase's WebSocket subscriptions. When one user adds an activity, everyone sees it instantly—no polling, no delays. A trip-wide subscription keeps the calendar view fresh, and viewing presence is broadcast live.

### Type Safety First 🛡️
End-to-end TypeScript with auto-generated types from the database schema. If it compiles, it (probably) works.

### Optimistic Updates ⚡
React Query's optimistic updates make the UI feel instant. Mutations update the cache immediately, then reconcile with the server in the background.

### Smart State Management 🧠
- **Server State**: TanStack Query handles caching, refetching, and background sync
- **UI State**: Local React hooks keep components lean and focused
- **Global Auth**: React Context with automatic token refresh

### Timezone Engine 🌐
Nullable per-item IANA timezone columns with lazy self-healing resolution: locations resolve to zones through a cached `timezone-proxy` Edge Function (Google Time Zone API → permanent `timezone_cache`), items inherit the trip default unless overridden, and pure label helpers render consistent zone badges across timeline, calendar, PDF, and iCal.

### PDF Generation 📄
Fully client-side PDF generation using `pdfmake`, organized into a modular pipeline (`src/services/pdf/` — theme tokens, image cropping, a pure doc builder, and locale-pinned formatters). No server-side rendering, no external services — and device-independent output, so a trip looks identical exported from mobile or desktop.

### Model Context Protocol 🔌
A built-in MCP server (`server/routes/mcp.ts`) exposes your trips to Claude and other MCP clients over streamable HTTP, authenticated with Supabase OAuth 2.1 (with RFC 9728 discovery). 21 tools: `list_trips`, `get_trip`, `get_trip_budget`, `create_trip`, `update_trip`, and add/update/delete for activities, dining, accommodations, transportation, and expenses.

### SEO & Prerendering 🔍
The build pipeline generates a sitemap covering every public trip, prerenders marketing and showcase pages with Puppeteer, emits JSON-LD structured data (Organization, TouristTrip, breadcrumbs), and 301-redirects legacy UUID URLs to canonical slugs.

### Database Security 🔐
Row Level Security (RLS) policies enforce access control at the PostgreSQL level. Users physically cannot query data they don't own—even with direct database access.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** — Modern JavaScript runtime (Node 24 recommended)
- **Supabase Account** — For database and authentication
- **API Keys** — Google Places, Google Gemini, and friends (see below)

### Installation

```bash
# Clone the repository
git clone https://github.com/reminiscent-io/wanderluxe.git
cd wanderluxe

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys (see configuration below)

# Launch development server (Express + Vite)
npm run dev
```

Visit **http://localhost:8080** and start planning your next adventure! 🌴

> Database migrations live in `supabase/migrations/` and are applied via the Supabase dashboard or CLI.

### ⚙️ Configuration

Create a `.env` file in the project root for the app and Express server:

```env
# Supabase (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # Server-only; bypasses RLS — never expose to the client

# Google Places (Required for location search)
VITE_GOOGLE_MAPS_API_KEY=your-google-api-key

# Gemini (Required for AI assistant + travel-doc OCR)
# Model is hardcoded to gemini-2.5-flash; no env override.
GEMINI_API_KEY=your-gemini-api-key

# Stripe (Required for Pro subscriptions)
STRIPE_SECRET_KEY=sk_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Optional
VITE_UNSPLASH_ACCESS_KEY=your-unsplash-access-key # Trip imagery (placeholders used if missing)
VITE_ADMIN_EMAIL=you@example.com                  # Grants admin dashboard access
VITE_PARSE_TRAVEL_DOC_URL=your-fn-url             # Travel-doc parsing endpoint override
MCP_PUBLIC_BASE_URL=https://wanderluxe.io         # Public base URL for the MCP server
```

Edge Functions read their secrets from Supabase (set via dashboard or `supabase secrets set`):

```env
GEMINI_API_KEY=...            # ai-chat + parse-travel-doc
GOOGLE_PLACES_API_KEY=...     # google-places-proxy, timezone-proxy
OPENWEATHERMAP_API_KEY=...    # weather-proxy (5-day forecasts)
AERODATABOX_API_KEY=...       # flight-status-proxy (flight-number lookup; free tier: 600 calls/mo)
SERPER_API_KEY=...            # ai-chat web search (bookable restaurant links)
MAILGUN_API_KEY=...           # share notifications + trip reminders
MAILGUN_DOMAIN=...
EXCHANGE_RATE_API=...         # update-exchange-rates (multi-currency budgets)
CRON_SECRET=...               # auth for scheduled functions (reminders, exchange rates)
```

<details>
<summary><b>🔑 How to get API keys</b></summary>

- **Supabase**: Sign up at [supabase.com](https://supabase.com) and create a new project
- **Google Places / Time Zone**: Enable the APIs in [Google Cloud Console](https://console.cloud.google.com)
- **Google Gemini**: Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)
- **OpenWeatherMap**: Free tier at [openweathermap.org/api](https://openweathermap.org/api)
- **Stripe**: Get your keys from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
- **Mailgun**: Create an account at [mailgun.com](https://www.mailgun.com)
- **Serper**: Sign up at [serper.dev](https://serper.dev)
- **AeroDataBox**: Subscribe via [RapidAPI](https://rapidapi.com/aedbx-aedbx/api/aerodatabox) (free tier: 600 calls/mo)
- **ExchangeRate-API**: Free key at [exchangerate-api.com](https://www.exchangerate-api.com)
- **Unsplash**: Register as a developer at [unsplash.com/developers](https://unsplash.com/developers)

</details>

## 📁 Project Structure

```
wanderluxe/
├── 📱 src/
│   ├── components/
│   │   ├── trip/              # 16 trip feature modules
│   │   │   ├── accommodation/ # Hotel & lodging management
│   │   │   ├── ai-assistant/  # AI chat + document extraction + paywall
│   │   │   ├── budget/        # Expense tracking & currencies
│   │   │   ├── calendar/      # FullCalendar view + iCal sync sheet
│   │   │   ├── timeline/      # Visual itinerary display
│   │   │   ├── transportation/# Flights (AeroDataBox lookup), trains, cars
│   │   │   ├── weather/       # Forecast badges & detail modal
│   │   │   └── ...           # Activities, dining, travelers, hero, stats
│   │   ├── admin/            # Admin dashboard (metrics + AI insights)
│   │   ├── layout/           # AppLayout, Sidebar, Navigation
│   │   └── ui/               # 50+ Shadcn/ui components
│   ├── pages/                # Routes (MyTrips, TripDetails, Explore, Profile, InviteRedeem, etc.)
│   ├── hooks/                # Custom hooks (useTripQuery, useAIAssistant, useWeather, etc.)
│   ├── services/             # Business logic (pdf/ export pipeline, flightStatus, sharing, etc.)
│   ├── contexts/             # React Context (AuthContext, ConsentContext)
│   ├── integrations/supabase/# Supabase client & auto-generated types
│   └── types/                # TypeScript definitions
├── ⚙️ server/
│   ├── index.ts             # Express server (CSP, canonical redirects, static serving)
│   └── routes/              # stripe, mcp, ai-chat, calendar (iCal), account (GDPR),
│                            # admin-insights, invite-preview
├── 🗄️ supabase/
│   ├── functions/           # 13 Edge Functions (Deno runtime)
│   │   ├── ai-chat/         # Gemini chat + find_place/search_web tools
│   │   ├── parse-travel-doc/# AI-powered document parsing
│   │   ├── google-places-proxy/  # Autocomplete, details, photo proxy
│   │   ├── timezone-proxy/  # Place → IANA timezone (cached)
│   │   ├── flight-status-proxy/  # AeroDataBox flight lookup
│   │   ├── weather-proxy/   # OpenWeatherMap forecasts
│   │   └── ...             # emails, reminders, exchange rates, Unsplash
│   ├── migrations/          # SQL schema migrations
│   └── config.toml         # Supabase configuration
├── 🧪 evals/                # On-demand eval harness (chat, parsing, MCP)
├── 🔧 scripts/              # Build scripts (sitemap, prerender)
└── 📦 Other
    ├── .env                # Environment variables
    ├── vite.config.ts      # Vite configuration
    ├── tailwind.config.ts  # Design system configuration
    └── CLAUDE.md           # AI assistant instructions
```

## 📸 See It In Action

<div align="center">

<!-- Add your screenshots here -->
<img src="docs/screenshots/dashboard.png" alt="WanderLuxe Dashboard" width="800" />
<p><em>Trip dashboard with real-time collaboration</em></p>

<img src="docs/screenshots/timeline.png" alt="Timeline View" width="800" />
<p><em>Day-by-day timeline with drag-and-drop scheduling</em></p>

<img src="docs/screenshots/ai-chat.png" alt="AI Assistant" width="800" />
<p><em>AI-powered travel assistant with contextual recommendations</em></p>

</div>

> 💡 **Coming soon:** Interactive demo and video walkthrough

## 🎨 Design Philosophy

WanderLuxe's aesthetic is inspired by **1980s–90s editorial travel magazines** — warm, sophisticated, and intentional:

- 🎨 **Color Palette** — Warm cream backgrounds, sand/earth neutrals, sunset-orange accents, and bronze primary tones — no cold grays
- ✍️ **Typography** — DM Serif Display for editorial headings, DM Sans for clean body text, with careful tracking and hierarchy
- 🧩 **Components** — Rounded cards (`0.75rem`), brown-tinted warm shadows, grain texture overlays on hero sections
- 📱 **Responsive** — Mobile-first design that scales beautifully to desktop
- ✨ **Animations** — Delicate fade-in/slide-up transitions, parallax hero scroll, subtle image warmth filters

## 🔒 Security & Privacy

WanderLuxe is built with security at its core:

- 🔐 **Row Level Security (RLS)** — PostgreSQL policies enforce access control at the database level
- 🔑 **Supabase Auth** — Secure authentication with Google OAuth and auto-refresh tokens
- 🛡️ **Input Validation** — Zod schemas validate all user input on frontend and backend
- 🚫 **CORS & CSP Protection** — Strict API access controls and a content security policy on the Express server
- 🔒 **Session Management** — Automatic session refresh with tab visibility detection
- 👥 **Permission System** — Granular view/edit permissions for shared trips; revocable, expiring invite links
- 🍪 **Consent-Gated Analytics** — PostHog and Google Analytics only run after cookie consent
- 📦 **Your Data, Portable** — One-click GDPR-style JSON export and permanent account deletion from the Profile page

*Your travel data stays yours—accessible only to you and those you explicitly invite.*

## 🧪 Development Scripts

```bash
# 🚀 Development
npm run dev              # Start dev server — Express + Vite (http://localhost:8080)
npm run dev:frontend     # Vite only (no Express backend)
npm run dev:server       # Express server only
npm run type-check       # TypeScript type checking
npm run lint             # ESLint code quality checks

# 🏗️ Building
npm run build            # Production build (sitemap → vite build → prerender → server bundle)
npm run build:dev        # Development build
npm run preview          # Preview production build (port 8080)

# 🧪 Testing
npm run test             # Run tests (Vitest)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# 📊 Evals (on-demand only, never CI)
npm run evals:seed       # Seed eval-user fixtures (run first)
npm run evals            # Full eval harness (chat + parsing + MCP)
```

## 📱 User Experience Highlights

<table>
<tr>
<td width="50%">

### 🖥️ Desktop Experience
- **Fixed Sidebar** — Persistent navigation with expandable trip sections
- **Timeline ⇄ Calendar Toggle** — Switch between editorial timeline and a drag-to-reschedule time grid
- **Assistant Dock** — AI panel docked beside the timeline, collapsible to a floating button, overlaying the full-width calendar
- **Hover Peek Cards** — Glance at event essentials without opening a dialog

</td>
<td width="50%">

### 📱 Mobile Experience
- **Touch-Optimized** — Large tap targets, bottom-sheet dialogs, full-screen AI drawer
- **Installable PWA** — Home-screen app with "Create Trip" / "My Trips" shortcuts and update toasts
- **Adaptive Layout** — Content reflows beautifully on all screens
- **Offline-Ready PDFs** — Take your itinerary anywhere

</td>
</tr>
</table>

## 🚀 Deployment

WanderLuxe runs as a full-stack Express app (serving the built Vite frontend, API routes, the iCal feed, and the MCP server) and is deployed via **Replit Autoscale** targeting **Google Cloud Run**.

### Deployment Steps
```bash
# 1. Build the production bundle
#    (sitemap → vite build → prerender → server bundle)
npm run build

# 2. Set environment variables in your hosting platform
#    (same variables as .env, including the server-only SUPABASE_SERVICE_ROLE_KEY)

# 3. Start the production server
npm run start          # NODE_ENV=production node dist/server/index.js
```

Cloud Run injects `PORT` at runtime (local default 5001). Any platform that can run a Node server works — the build output is a standard Node bundle.

**Note:** Supabase Edge Functions and database migrations are deployed separately via the Supabase dashboard or CLI.

## 🤝 Contributing

We welcome contributions from developers who share our passion for elegant travel technology!

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** with clear messages: `git commit -m 'Add amazing feature'`
4. **Push** to your branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Write meaningful commit messages
- Add TypeScript types for new features
- Test your changes thoroughly
- Update documentation as needed

**Found a bug?** Open an issue with reproduction steps.
**Have an idea?** Start a discussion in GitHub Discussions.

## 📄 License

Copyright © 2026 WanderLuxe. All rights reserved.

This is proprietary software; the source is available for reference and contribution under the terms set by the maintainers.

## 💬 Support & Community

- 🐛 **Bug Reports** — [Open an issue](https://github.com/reminiscent-io/wanderluxe/issues)
- 💡 **Feature Requests** — [Start a discussion](https://github.com/reminiscent-io/wanderluxe/discussions)
- 📧 **Contact** — Reach out to the maintainers
- 🌟 **Star** this repo if WanderLuxe helps you plan better trips!

---

<div align="center">

### ✨ *"The world is a book, and those who do not travel read only one page."* — St. Augustine

**WanderLuxe** — Where every journey begins with intention and ends with inspiration.

Made with ☕ and ✈️ by travelers, for travelers.

[Back to Top ↑](#-wanderluxe)

</div>

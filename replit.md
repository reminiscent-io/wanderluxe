# WanderLuxe - Travel Planning Application

## Overview
WanderLuxe is an AI-powered travel planning platform for the group organizer — the person collecting flight confirmations, juggling everyone's preferences, and keeping a shared trip coherent. It combines real-time collaboration, booking management, AI-assisted recommendations and document parsing, three itinerary views, calendar sync, a built-in MCP server, and print/PDF output on a single editorial timeline.

## User Preferences
Preferred communication style: Simple, everyday language.

## Business Model
- **Free** — unlimited trips, unlimited AI chat, sharing, all three itinerary views, PDF export, and calendar sync. Chat is rate-limited to 15 messages/minute as a human-pace guard, and document imports (OCR) are capped at 20/day. Both limits apply to every tier.
- **Pro ($3.99/mo via Stripe)** — unlocks the **Print Studio** only. AI limits are identical on both tiers; the subscription does not buy more AI.

## System Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 8
- **UI Library**: Shadcn/ui (built on Radix UI, ~55 primitives)
- **Styling**: Tailwind CSS with a warm sand/earth/sunset editorial palette; `darkMode: 'class'`
- **State Management**: TanStack Query (server state) + React Context (auth, consent) + hooks (UI state)
- **Routing**: React Router
- **Forms**: React Hook Form with Zod validation
- **PWA**: service worker + manifest, with build-time version stamping

### Backend
- **Database**: PostgreSQL via Supabase (30 tables, RLS on all user-facing tables)
- **Authentication**: Supabase Auth (supports Google OAuth)
- **Real-time**: Supabase real-time subscriptions over WebSocket
- **API**: Express server with custom routes (`server/index.ts` → `server/routes/`)
- **Edge Functions**: 14 Deno functions in `supabase/functions/`
- **Payments**: Stripe for the Pro subscription
- **AI**: Google Gemini 2.5 Flash for chat and document OCR (hardcoded, no env override); OpenAI (default `gpt-4.1`) for Print Studio design generation only

### Development Setup
- **Package manager**: npm (Node 18+, Node 24 on Replit). `.npmrc` sets `legacy-peer-deps=true`.
- **Combined**: `npm run dev` runs Vite (port 8080) and the Express server concurrently; Vite proxies `/api/*` to the backend
- **Separate**: `npm run dev:frontend` (Vite only) or `npm run dev:server` (Express only)
- **Replit workflow**: `PORT=5000 NODE_ENV=development npx tsx server/index.ts`
- **Production**: `npm run build` then `npm run start` → `node dist/server/index.js`. Cloud Run injects `PORT`; the local fallback is 5001.
- **Note**: `dev.sh` and `start-dev.sh` are legacy Bun-based scripts and are not the supported path.

### API Endpoints (Express Server)
- `/api/health` — health check
- `/api/stripe/create-checkout`, `/api/stripe/webhook`, `/api/stripe/create-portal`, `/api/stripe/subscription`, `/api/stripe/cancel-subscription`, `/api/stripe/reactivate-subscription`
- `/api/trips/:tripId/assistant` — AI chat (streaming SSE), plus `/anon`, `/messages`, `/usage`
- `/api/ai-imports/usage` — document import usage
- `/api/trips/:tripId/calendar.ics` — token-gated iCal feed
- `/api/trips/:tripId/print-design` — Print Studio design generation (Pro-gated)
- `/api/admin/insights` — admin dashboard AI insights
- `/api/account`, `/api/account/export` — GDPR-style export and account deletion
- `/api/send-share-notification` — trip share emails
- `/mcp` + `/.well-known/oauth-protected-resource` — MCP server and OAuth 2.1 discovery
- `/invite/:code` — invite link preview

> PDF export is **fully client-side** via pdfmake (`src/services/pdf/`). There is no PDF endpoint.

### Database Design
Normalized PostgreSQL. Core entities: `trips`, `trip_days`, `day_activities`, `accommodations`, `transportation`, `reservations`, plus `*_travelers` join tables. Sharing via `trip_shares` and `trip_invite_links`. Supporting tables include `profiles`, `ai_chat_threads`/`ai_chat_messages`, `user_ai_usage`, `trip_print_designs`, `currencies`/`exchange_rates`, and caches for weather, timezones, place coordinates, and flight status.

### Key Features
- **Trip Management** — creation, sharing with granular permissions, day-by-day timeline
- **Three itinerary views** — Timeline, FullCalendar time grid, and an interactive Google Map with route playback, switched via a `?view=` query param
- **Timezone-aware** — times are floating wall-clock values, never converted; per-item IANA overrides inherit a trip default, with zone badges across timeline, calendar, map, PDF, and iCal
- **AI Integration** — conversational assistant with Google Places and web-search tool calling, chat-to-itinerary creation, and travel-document OCR
- **Calendar Sync** — token-gated iCal feed for Google/Apple/Outlook, with rotate and disable
- **MCP Server** — 20 read/write tools exposing trips to Claude and other MCP clients over OAuth 2.1
- **Print Studio (Pro)** — a model art-directs a keepsake printed edition (palette, font pairing, motif, per-day copy) while every itinerary item is drawn from the database, so generation can degrade styling but never content
- **Sharing & Collaboration** — permission-based sharing, live updates, presence avatars, reminder emails
- **Budgeting** — multi-currency expense tracking, categorization, and visualization

### System Design Choices
- **Real-time Updates**: subscriptions for all entity types, updating the React Query cache directly. `useRealtimeSubscription` dedupes by channel key, so two views must not share a key.
- **Unified Dialogs**: consolidated add/edit components across trip element types to reduce duplication and keep UX consistent.
- **Click = read, not edit**: clicking a timeline event opens a read-only detail dialog with an explicit Edit button.
- **Time Period Grouping**: activities grouped into Early Morning / Morning / Afternoon / Evening / Night sections.
- **Daily Cost Summary**: per-day cost breakdown by category on the day card.
- **Smart Day Expansion**: past days auto-collapse; current and future days stay open.
- **AI as art director, not author**: the Print Studio model returns only a design spec through a strict JSON schema, sanitized for contrast and length before render.
- **Mobile Responsiveness**: mobile-first throughout — responsive date pickers, dialogs, drawers, and layouts.
- **Error Handling & Validation**: Zod + React Hook Form, with double-click prevention on submissions.

### UI/UX Decisions
- **Color Scheme**: warm sand/earth neutrals with a sunset accent scale; brown-tinted shadows. `DESIGN.md` / `DESIGN.json` are the spec.
- **Typography**: DM Serif Display for headings, DM Sans for body and UI.
- **Navigation**: fixed collapsible sidebar on desktop, sheet drawer on mobile.
- **Component Design**: consistent interaction patterns — clickable list items, uniform delete affordances.
- **Accessibility**: WCAG 2.1 AA as the baseline; `prefers-reduced-motion` respected in map playback and animations.

## External Dependencies

### Core Services
- **Supabase** — database, authentication, real-time, storage, edge functions
- **Google Gemini 2.5 Flash** — AI chat assistant and travel-document OCR
- **OpenAI** — Print Studio design generation only
- **Google Places / Time Zone / Maps** — location search, timezone resolution, map view (accessed via proxies)
- **OpenWeatherMap** — per-day forecasts
- **AeroDataBox** — flight-number lookup
- **Serper** — web search for bookable recommendations
- **Stripe** — Pro subscription billing
- **Expedia Group Affiliate** — in-trip booking widget and hotel deep links
- **SendGrid / Mailgun** — share notifications and trip reminder emails
- **ExchangeRate-API** — multi-currency budgets
- **Unsplash** — stock photography for trip imagery
- **PostHog + Google Analytics** — consent-gated analytics

### UI Components & Utilities
- **Radix UI** — accessible component primitives
- **Lucide React** — icon library
- **Framer Motion** — animation library
- **FullCalendar** — calendar time grid
- **@vis.gl/react-google-maps** — map view
- **pdfmake** — client-side PDF generation
- **ical-generator** — iCal feed
- **React Hook Form** — form state management
- **Date-fns** — date manipulation utilities

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WanderLuxe** is an AI-powered travel planning platform that combines real-time trip collaboration, comprehensive booking management, AI-assisted recommendations, three itinerary views (timeline, FullCalendar, interactive map), calendar sync (iCal feed), a built-in MCP server, and professional PDF export. It's a full-stack React/TypeScript application with a PostgreSQL backend via Supabase.

## Quick Start Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start dev server (Express + Vite, http://localhost:8080)
npm run dev:frontend    # Vite only (no Express backend)
npm run dev:server      # Express server only
npm run type-check      # TypeScript type checking
npm run lint            # ESLint code quality check
```

> **Note**: The project uses **npm** (Node 18+, Node 24 recommended). `.npmrc` sets `legacy-peer-deps=true` so installs resolve. You can also run binaries directly via `npx` (e.g. `npx tsc --noEmit`, `npx vitest run`).

### Building & Testing
```bash
npm run build           # Full pipeline: build:sitemap → vite build → prerender (puppeteer) → build:server
npm run build:dev       # Development build
npm run preview         # Preview production build (port 8080)
npm run test            # Run tests (Vitest)
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run evals           # Eval harness (LLM + integration; on-demand only, never CI)
npm run evals:seed      # Create/reset eval-user fixture data (run before evals)
npm run evals:chat      # One suite at a time: evals:chat | evals:parsing | evals:mcp
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS
- **State Management**: React Context (auth) + TanStack Query (server state) + React hooks (UI state)
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Real-time**: Supabase real-time subscriptions via WebSocket
- **Backend**: Express.js + Supabase Edge Functions (Deno)
- **AI**: Google Gemini 2.5 Flash for chat + doc parsing (hardcoded in Edge Function + Express; no env override); OpenAI (default `gpt-4.1`, `OPENAI_MODEL` override) for Print Studio design generation
- **Calendar**: FullCalendar (trip calendar view) + ical-generator (token-gated iCal feed)
- **MCP**: built-in Model Context Protocol server (`server/routes/mcp.ts`, OAuth 2.1 via Supabase)
- **Payments**: Stripe (Pro subscription, $3.99/mo — gates the Print Studio; AI chat is unlimited on every tier)
- **External APIs**: Google Places, Google Time Zone, OpenWeatherMap (weather), AeroDataBox (flights), Serper (web search), Expedia Group affiliate (booking), SendGrid (share emails), Mailgun (trip reminders), Unsplash, ExchangeRate-API
- **Analytics**: PostHog + Google Analytics/GTM, consent-gated via `ConsentContext`
- **Testing**: Vitest
- **PWA**: Service worker + manifest for installable app

### Directory Structure

```
src/
├── components/
│   ├── trip/              # Trip feature components (17 subdirs)
│   │   ├── _shared/       # Shared trip utilities
│   │   ├── accommodation/ # Hotel management
│   │   ├── ai-assistant/  # AI assistant components
│   │   ├── budget/        # Expense tracking
│   │   ├── calendar/      # FullCalendar view + iCal sync sheet
│   │   ├── create/        # Trip creation flow
│   │   ├── dashboard/     # Trip dashboard cards
│   │   ├── day/           # Day-by-day components
│   │   ├── details/       # Trip detail views
│   │   ├── dining/        # Restaurant reservations
│   │   ├── hero/          # Trip hero/header
│   │   ├── map/           # Interactive trip map (Google Maps + route playback)
│   │   ├── stats/         # Trip statistics
│   │   ├── timeline/      # Itinerary display
│   │   ├── transportation/# Flight/train/car bookings
│   │   ├── travelers/     # Collaborator management
│   │   └── weather/       # Weather display components
│   ├── admin/             # Admin dashboard components
│   ├── discovery/         # One-time first-run hints (DiscoverHint)
│   ├── layout/            # Sidebar, Navigation, AppLayout
│   ├── navigation/        # Navigation components
│   ├── landing/           # Landing page sections (WhySignUp, etc.)
│   └── ui/                # Shadcn/ui primitive components (~55)
├── pages/                 # Route pages (MyTrips, TripDetails, Budget, Profile, Explore, Settings, InviteRedeem,
│                          #   Guide `/guide`, LLMTraining `/about`, OauthConsent `/oauth/consent`, etc.)
├── hooks/                 # Custom hooks (useSidebarState, useAIAssistant, useTripQuery, etc.)
├── services/              # Business logic (pdfmake-export, travelers, tripDaysService, etc.)
├── contexts/              # React Context (AuthContext, ConsentContext)
├── config/                # Environment config (env.ts)
├── constants/             # Shared constants (unsplash.ts)
├── lib/                   # Theme, utilities
├── integrations/supabase/ # Supabase client & auto-generated types
├── test/                  # Test setup & mocks
├── types/                 # TypeScript definitions
└── utils/                 # Utility functions

server/
├── index.ts              # Express server setup (CSP, canonical-host redirects, static serving)
├── dev-server.ts         # Development server config
├── lib/                  # icalFeed (iCal builder), mcpTools (MCP tool registry), tripWrites, tripDates, budgetSummary,
│                         #   printDesign (Print Studio OpenAI call + trip payload)
└── routes/               # API routes (Stripe, AI chat, MCP server, iCal calendar feed, admin insights,
                          #   invite preview, share notification, account export/deletion,
                          #   Print Studio design generation)

supabase/
├── functions/            # Serverless Deno functions (14 functions + _shared)
│   ├── ai-chat/                  # AI chat via Gemini 2.5 Flash
│   ├── fetch-unsplash-metadata/  # Unsplash image metadata
│   ├── fetch-url-metadata/       # URL metadata extraction
│   ├── flight-status-proxy/      # AeroDataBox flight lookup (30-min cache)
│   ├── generate-image/           # Unsplash photo search (NOT AI image generation, despite the name)
│   ├── google-places-proxy/      # Google Places API proxy (autocomplete, details, photo proxy)
│   ├── parse-travel-doc/         # Travel document parsing (Gemini vision OCR)
│   ├── place-coordinates-proxy/  # Batch place → lat/lng for the map view (cached, soft-fail)
│   ├── send-email/               # Share notification email via SendGrid
│   ├── send-share-notification/  # Trip share notifications (SendGrid; legacy path)
│   ├── send-trip-reminders/      # Scheduled trip reminder emails (Mailgun, pg_cron + CRON_SECRET)
│   ├── timezone-proxy/           # place_id → IANA timezone (Google Time Zone API, cached)
│   ├── update-exchange-rates/    # Currency exchange updates (ExchangeRate-API)
│   └── weather-proxy/            # Weather data proxy (OpenWeatherMap)
├── migrations/           # SQL migration files
└── config.toml          # Supabase configuration
```

### Core Concepts

#### 1. **State Management Strategy**
- **Global Auth**: `AuthContext` (React Context) - authentication state with auto session refresh
- **Server State**: `TanStack Query` - data fetching, caching, real-time subscriptions
- **UI State**: React hooks (`useState`) - dialogs, forms, selected items
- **Complex UI State**: `useSidebarState` hook - manages sidebar panels and dialog states

#### 2. **Real-Time Collaboration**
All real-time updates via Supabase subscriptions:
```
useAccommodationsRealtime() → .channel() → .on('postgres_changes')
 ├─ Initial data via useQuery()
 ├─ Subscribe to accommodations table INSERT/UPDATE/DELETE
 ├─ Update React Query cache with .setQueryData()
 └─ Component auto-re-renders
```

Real-time hooks exist for: accommodations, activities, reservations, trip details, the calendar view (trip-wide `useCalendarRealtime`), exchange rates, invite links, and live viewing presence (`trip_view_status`). AI chat streams over SSE, not a realtime subscription.

#### 3. **Data Flow Pattern**
```
Component (Page/Feature)
  ↓
useQuery / useRealtime Hook
  ↓
React Query Cache
  ↓
Supabase client (auto-generated types from database)
  ↓
PostgreSQL database
```

#### 4. **Trip Architecture**
- Root entity: `trips` table (destination, dates, budget, default IANA `timezone`, `calendar_feed_token`/`calendar_feed_enabled`, etc.)
- Sub-entities: `trip_days`, `day_activities`, `accommodations`, `transportation`, `reservations`
- Relationships: `*_travelers` tables link users to bookings
- Sharing: `trip_shares` (email shares, view/edit) + `trip_invite_links` (link invites with permission and optional expiry, redeemed at `/invite/:code`)
- Timezones: all times are floating wall-clock values, never converted between zones. Items carry nullable `timezone` columns (transportation: `departure_timezone`/`arrival_timezone`); NULL inherits the trip default (see §17)
- Security: RLS policies enforce trip ownership and share permissions

#### 5. **AI Chat Integration**
- Chat interface: `AIAssistantPanel` (`src/components/trip/ai-assistant/`) — combined chat + document extraction surface, mounted via `AIAssistantDrawer` (mobile full-screen) and `AssistantDock` (desktop: docked beside the timeline, collapsible to a floating button, floating overlay over the full-width calendar)
- Backend: client calls Express (`POST /api/trips/:id/assistant`, streaming SSE via `useAIAssistant`), which drives Gemini 2.5 Flash with `find_place` (Google Places) + `search_web` (Serper) function calling; the `ai-chat` Edge Function mirrors this. Strict link policy: only tool-returned URLs are allowed, others are rewritten to Google Search
- Structured outputs: ` ```create_items ` blocks add accommodations/transportation/activities/reservations to the itinerary; ` ```place_cards ` render rich cards with "Add to trip" and, for stays, "Book on Expedia" affiliate links
- Document extraction: `parse-travel-doc` Edge Function (Gemini vision OCR, images/PDFs ≤15 MB, up to 10 items per document)
- Data: `ai_chat_threads` + `ai_chat_messages` tables; `user_ai_usage` tracks usage
- Limits: anonymous visitors get a 5-message trial on public trips (`/assistant/anon`). Signed-in chat is **unlimited on every tier** but rate-limited to **15 messages/minute** (429 `RATE_LIMITED` with `retryAfter`) as a human-pace guard; doc imports (OCR) are capped at **20/day for every tier** (429 `DAILY_LIMIT_REACHED`), enforced inside `parse-travel-doc` itself. Both enforced via the `increment_ai_usage`/`increment_ai_import_usage` RPCs (single source of truth; profile columns `ai_messages_limit`/`ai_imports_limit` remain per-user operator overrides — `-1` = unlimited, and a non-negative message limit re-enables a daily cap as a kill-switch). `PaywallModal` now pitches the Print Studio
- Context: Includes trip details in system prompt for location-specific recommendations

#### 6. **Component Patterns**

**Sidebar (Fixed Layout)**
- `useSidebarState()` manages complex nested dialog states
- Secondary panels for accommodation/activity/dining details
- Responsive: Fixed on desktop, drawer on mobile

**Trip Details Page**
- Wrapper component routes to top-level tabs: Timeline, Budget, Booking (Expedia affiliate widget), Chat
- The Timeline tab carries its own three-way **Timeline ⇄ Calendar ⇄ Map** switch, persisted in the `?view=` query param (`timeline` is the absent state, so old bookmarks keep working)
- Each view fetches its own data via React Query
- Real-time subscriptions keep data fresh
- Shared trip permissions checked via `useTripPermissions()`

**Forms**
- `react-hook-form` for state management
- `zod` for validation schemas
- `Shadcn/ui` form components for consistent styling

**Dialogs**
- `Shadcn/ui` Dialog primitive (Radix UI based)
- Controlled via `useSidebarState()` or local `useState()`
- Mutation handling with optimistic updates via React Query

#### 7. **PDF Export**
- **Fully client-side** via pdfmake (no server endpoint; the old `/api/export-pdf` note was stale)
- **Modules**: `src/services/pdf/` — `theme.ts` (type scale/spacing/colors/page tokens — all sizes and colors MUST come from here), `images.ts` (cover-crop + supersampled data URIs), `builder.ts` (pure `buildDocDefinition(data, opts)`), `data.ts` (Supabase fetch), `format.ts` (locale-pinned formatters), `pagination.ts` (orphan-heading rule)
- **Orchestrator**: `src/services/pdfmake-export.ts` (fonts → fetch → build → download)
- **Fonts**: DM Sans + DM Serif Display TTFs lazy-loaded by `src/services/pdf-fonts.ts`; these fonts have no glyph for emoji/dingbats (e.g. ✈) — never put such characters in doc content
- **Layout is device-independent**: same output on mobile/desktop; Letter/A4 is a user option
- **Tests**: `npx vitest run src/services/pdf` (snapshots + theme invariants); `PDF_PREVIEW=1 npx vitest run src/services/pdf/render.test.ts` writes `node_modules/.cache/wanderluxe-pdf-preview.pdf`

#### 8. **Database Schema** (30 tables)
Key tables:
- `trips` - Trip records with dates, budget, destination, default timezone, calendar-feed token
- `trip_days` - Days within a trip
- `day_activities` / `day_activity_travelers` - Activities and assignments
- `accommodations` / `accommodations_days` / `accommodation_travelers` - Hotel bookings
- `transportation` / `transportation_travelers` - Flight/train/car bookings
- `reservations` / `reservation_travelers` - Dining reservations (`reservation_time` + optional `end_time`; a NULL end is read as 90 minutes by duration-shaped surfaces — see `src/utils/timeUtils.ts`)
- `trip_shares` - Trip sharing & permissions
- `trip_invite_links` - Link-based invites (permission + optional expiry)
- `profiles` - User profiles (auto-created on signup; holds `subscription_tier` + AI limits)
- `ai_chat_threads` / `ai_chat_messages` - AI conversation history
- `user_ai_usage` - AI usage tracking (daily message/import counts + per-minute rate-limit window)
- `trip_print_designs` - Print Studio design specs (AI palette/fonts/motif/copy per trip; written only by the Express route)
- `currencies` / `exchange_rates` - Multi-currency support
- `weather_cache` - Cached weather data (6h TTL)
- `timezone_cache` - place_id → IANA timezone (permanent)
- `place_coordinates` - place/text → lat,lng cache for the map view (shared across trips; cache keys are derived server-side only)
- `flight_status_cache` - AeroDataBox lookups (30-min TTL)
- `expenses` / `other_expenses` - Expense tracking
- `trip_reminder_sends` - Reminder-email dedup
- `admin_insights` - Saved Gemini-generated admin insights
- `user_engagement_events` / `trip_view_status` - Analytics & live viewing presence

All tables have RLS policies: users can only access their own trips or shared trips.

#### 9. **Key Custom Hooks**
- `useSidebarState()` - Complex sidebar UI state management
- `useAIAssistant()` - AI chat state: SSE streaming, threads, place cards, anon trial
- `useTripQuery()` - Trip data fetching
- `useAccommodationsRealtime()` - Real-time accommodations
- `useActivitiesRealtime()` - Real-time activities
- `useReservationsRealtime()` - Real-time dining
- `useTravelers()` - Collaborator management
- `useTripPermissions()` - Permission checking
- `useSessionKeepAlive()` - Session management with tab visibility detection
- `useTripTimezone()` / `useResolveTimezone()` - Trip default timezone + place→IANA resolution (lazy, self-healing)
- `useCalendarEvents()` / `useCalendarRealtime()` / `useCalendarFeed()` - Calendar event adapter, trip-wide realtime, iCal feed token (live in `components/trip/calendar/`)
- `useTripSubscription()` - Trip-wide realtime for detail views (lives in `components/trip/details/`)
- `useAdminMetrics()` / `useAdminInsights()` - Admin dashboard metrics + AI insights
- `usePublicTrips()` - Explore showcase trips (`CopyTripButton` copies one into your own account via the `copy_public_trip` Postgres function — the whole deep copy runs in a single transaction; see `services/copyTripService.ts`)
- `useIsAdmin()` - Admin role checking
- `usePWAInstall()` - PWA install prompt
- `useWeather()` - Weather data fetching
- `useDocumentExtraction()` - Travel document parsing
- `useTravelStats()` - Travel statistics
- `useTripViewingStatus()` - Trip viewing analytics
- `useInviteLinks()` - Invite link management
- `useVersionCheck()` - App version update detection
- `useBufferedStreaming()` - Buffered AI streaming responses
- `useVisualViewport()` - Mobile viewport handling
- `useRealtimeSubscription()` - Generic real-time subscription helper (**dedupes by `channelKey` in a module-level Set** — two views sharing a key means the second one gets no events)
- `useTripMapData()` / `usePlaceCoordinates()` / `usePlayback()` / `useMapRealtime()` - Map view data, geocoding, route playback, realtime (live in `components/trip/map/`)
- `useFirstRun()` - One-time discovery hints (`map-view`, `calendar-sync`, `doc-import`, `live-collab`)

#### 10. **Styling System**
- **Framework**: Tailwind CSS with custom config
- **Typography**: DM Serif Display (headings h1-h3, `font-display`), DM Sans (body/UI, `font-sans`) via Google Fonts
- **Colors**: Warm editorial travel palette via CSS custom properties + Tailwind scales
  - Sand/Earth: warm neutrals for text and backgrounds
  - Sunset (50-600): orange accent scale for CTAs and highlights
  - Navy (800-950): dark tones
  - CSS vars (`--background`, `--foreground`, `--border`, etc.) in `src/index.css` control semantic tokens
  - `--destructive-ink` is the **text** step of destructive red (5.6:1 on cream); `--destructive` is tuned as a *fill* and reaches only 3.7:1 as ink — use `text-destructive-ink` for small red text, never `text-destructive`
- **Dark mode**: `darkMode: 'class'` in `tailwind.config.ts`; the `.dark` block in `index.css` redefines the same token set
- **Shadows**: Brown-tinted warm shadows (`shadow-warm-sm`, `shadow-warm`, `shadow-warm-lg`, `shadow-warm-xl`)
- **Border Radius**: `rounded-card` (0.75rem) for cards
- **Button Variants**: `sunset` variant for primary CTAs (gradient orange)
- **Components**: Shadcn/ui (~55 Radix UI primitives)
- **Animations**: Custom fade-up, fade-down, slide-up, slide-down
- **Responsive**: Mobile-first with Tailwind breakpoints
- **Utilities**: `bg-grain` (subtle noise texture, parent must be positioned), `img-warm` (subtle saturation filter for photos)
- **Gotcha**: Custom `@layer utilities` in `index.css` override Tailwind built-in utilities (e.g. `position: relative` overrides `fixed`) — avoid setting `position` in custom utility classes

#### 11. **Stripe Integration**
- Pro subscription billing via `server/routes/stripe.ts` — checkout, webhook, billing portal, cancel-at-period-end + reactivate (UI in `Profile.tsx`)
- **WanderLuxe Pro = $3.99/mo** and gates the **Print Studio** (see §23). The webhook sets `profiles.subscription_tier`; AI limits are identical on both tiers (`ai_messages_limit=-1`, `ai_imports_limit=20`) — chat is free product-wide, the OCR cap is universal abuse protection
- Stripe SDK v20+ in dependencies

#### 12. **Admin Dashboard**
- Components in `src/components/admin/` — single-scroll sections: AI Insights, Pulse KPIs, sign-in trend, action breakdown, engagement frequency, sharing
- **AI Insights**: `server/routes/admin-insights.ts` streams Gemini-generated platform analysis (admin-only, rate-limited 10/hr, saved to `admin_insights`)
- Data via `useAdminMetrics()` + `useAdminInsights()`; protected via `useIsAdmin()` hook (`VITE_ADMIN_EMAIL`)

#### 13. **PWA Support**
- `public/manifest.json` + `public/sw.js` for installable app
- PWA icons at multiple resolutions (144, 192, 384, 512)
- `usePWAInstall()` hook for install prompt
- **Version stamping**: `vite.config.ts` emits `dist/version.json` and injects `__APP_SHA__` into `sw.js` at build time; `useVersionCheck()` polls `version.json` to detect updates

#### 14. **Weather Integration**
- Provider: **OpenWeatherMap** (`weather-proxy` Edge Function: geocoding + current conditions + 5-day/3-hour forecast condensed to daily highs/lows)
- Caching: 6h server-side in `weather_cache`; 30-min client staleTime in `useWeather()`
- UI: `DayWeatherBadge` on timeline days + `WeatherDetailModal` (`src/components/trip/weather/`)

#### 15. **Eval Harness** (`evals/`)
- **On-demand only**: `npm run evals` (never in CI; `npm test` excludes `evals/` — eval files use the `.eval.ts` suffix, helper logic uses `.test.ts` and DOES run in CI)
- **Suites**: `evals/mcp` (deterministic MCP tool + auth/RLS/discovery checks, no LLM cost), `evals/chat` (hybrid: deterministic asserts + Gemini-as-judge, pass ≥ 3.5/5, N=1 so judge scores vary run-to-run — the scorecard records raw scores for drift), `evals/parsing` (golden-file grading vs the **deployed** `parse-travel-doc`, pass ≥ 90% field accuracy; text fixtures are wrapped in PDFs via `evals/helpers/textToPdf.ts` since the function rejects non-image/non-PDF uploads)
- **Fixtures**: dedicated eval user (`EVAL_USER_EMAIL`/`EVAL_USER_PASSWORD` in `.env`) in the prod Supabase project with two fixed-UUID trips (`evals/fixtures/trips.ts`); `npm run evals:seed` is idempotent (ownership-guarded) and resets chat history + AI usage
- **Server**: `evals/globalSetup.ts` spawns Express from the working tree on port 8090 (override with `EVALS_SERVER_URL`); chat cases proxy to the **deployed** ai-chat Edge Function, so Edge Function changes need a redeploy before chat evals reflect them
- **Results**: `evals/results/<timestamp>.json` (gitignored) + console summary table; status `error` = infra flake (retried once), distinct from `fail` = quality regression
- **Helper unit tests** (`evals/helpers/*.test.ts`, node-env via `// @vitest-environment node`) run in the main CI suite — SSE parsing, scorecard math, field comparison, retry, text-to-PDF

#### 16. **Calendar View & iCal Feed**
- `src/components/trip/calendar/` — `TripCalendarView` (lazy-loaded FullCalendar time grid), one arm of the three-way view switch in `TimelineView.tsx`
- Defaults: 3-day view anchored at trip start (today if mid-trip); dense 7am–10pm slot window with a show-full-day toggle (`slotWindow.ts`)
- `eventMapping.ts` maps trip entities → events; drag/resize applies minimal mutations (`calendarMutations.ts`); click-to-edit opens entity dialogs; `AddEntityPicker` for empty-slot adds
- Warm-themed chips (`CalendarEventChip` + `calendarTheme.css`, with timezone badges), desktop hover peek (`CalendarEventPeek`/`peekFacts.ts`)
- **Rental cars in the feed**: a `rental_car` leg is emitted as two short bookends (`-pickup` 60 min, `-return` 30 min UIDs) rather than one pickup→return block — a multi-day span would sit "in progress" all week and read as the current/next event on a phone. Other multi-day legs (red-eyes, overnight trains) stay a single timed event; you really are on them. Mirrors the timeline's rental split in `useDayTimeline.ts`
- **iCal feed**: `server/routes/calendar.ts` serves `GET /api/trips/:tripId/calendar.ics?token=…` built by `server/lib/icalFeed.ts` (ical-generator; floating times, stable UIDs, zone text in summaries). Gated by `trips.calendar_feed_token`/`calendar_feed_enabled`; `CalendarSyncSheet` + `useCalendarFeed` handle subscribe URL (Google/Apple/Outlook), `.ics` download, token reset, and disable

#### 17. **Timezone System**
- Times are floating wall-clock values (`HH:MM`) — **never convert them between zones**. Each trip has a default IANA `timezone`; items carry nullable overrides (`day_activities.timezone`, `reservations.timezone`, `accommodations.timezone`, `transportation.departure_timezone`/`arrival_timezone`); NULL = inherit trip default
- Resolution: `timezone-proxy` Edge Function (place_id → geometry → Google Time Zone API → IANA id, with an offline boundary-lookup fallback via `tz-lookup` when the Time Zone API is refused/unavailable), cached permanently in `timezone_cache`; client side `useResolveTimezone()` + `useTripTimezone()` (lazy self-healing)
- UI: searchable IANA `TimezoneSelect` combobox; forms auto-fill the zone from the chosen place; label helpers in `src/utils/timezoneLabel.ts` (`effectiveTz`, `tzAbbrev`, `shouldShowBadge`, `transportTzLabels`, `getTimezoneOptions`) drive badges on timeline rows, calendar chips, map stops, PDF times, and iCal summaries

#### 18. **MCP Server**
- `server/routes/mcp.ts`: streamable-HTTP, stateless; OAuth 2.1 via Supabase (ES256 JWT, RFC 9728 discovery); `MCP_PUBLIC_BASE_URL` sets the public base URL
- Tools in `server/lib/mcpTools.ts` — **20 total**: `list_trips`, `get_trip`, `get_trip_budget`, `create_trip`, `update_trip`, plus add/update/delete for activity, dining, accommodation, transportation, and expense
- Timezone-aware (times stay wall-clock); `update_trip` returns at-risk days and requires `confirm_remove_days: true` before dropping days that contain items; writes go through `server/lib/tripWrites.ts`
- Covered by `evals/mcp` (full read+write lifecycle, auth/RLS/discovery)

#### 19. **Booking Tab (Expedia Affiliate)**
- `src/components/trip/BookingView.tsx` + `src/lib/expedia.ts` — embedded Expedia Group affiliate search widget (stays + flights, Partnerize network), fallback deep link, and a human travel-advisor CTA (Fora Travel)
- AI-chat hotel place cards (`is_stay`) get "Book on Expedia" deep links (`buildExpediaHotelSearchUrl`)
- Affiliate click tracking via gtag (`trackExpediaClick`); CSP/COEP in `server/index.ts` is tuned so the widget iframe loads — don't re-enable COEP

#### 20. **Trip Map View**
- `src/components/trip/map/` — `TripMapView` (lazy-loaded), the third arm of the itinerary view switch. Google Maps via `@vis.gl/react-google-maps`
- **Data**: `useTripMapData` composes the same five sources as `useCalendarEvents` (days, stays, transportation, reservations, + the `day_id → date` join), then projects them through the pure `buildStops.ts` ordering engine into `MapStop[]` / per-day `DayFrame[]` with lead/trail "ghost" stops so a day never appears to start from nowhere
- **Geocoding**: `usePlaceCoordinates` batches places (≤100/request) to the `place-coordinates-proxy` Edge Function → `place_coordinates` table. Soft-fail contract like `timezone-proxy`: a bad item yields `null`, never a non-200. **Cache keys are derived server-side only** — if the client sent them, a caller could point a well-known place at arbitrary coordinates in a table every trip reads
- **Playback**: `usePlayback` + `useCameraTween` animate day-by-day through stops; honours `prefers-reduced-motion`, and any user gesture interrupts the camera
- **Realtime**: `useMapRealtime` uses channel key `map:${tripId}` — deliberately *not* `calendar:${tripId}`. `useRealtimeSubscription` dedupes by key through a module-level Set, so a shared key would leave whichever view mounted second permanently dead
- **Editing**: clicking a stop opens the same entity dialogs as the timeline (activity, dining, accommodation, transportation)
- **Config**: needs `VITE_GOOGLE_MAPS_API_KEY` (renders a "Map unavailable" panel without it). `VITE_GOOGLE_MAPS_MAP_ID` is optional — `resolveMapId()` falls back to a demo map ID. Note a Cloud map ID disables inline marker styles
- Camera fitting uses a **bounds literal**, not `new google.maps.LatLngBounds()`, so a render before the Maps script settles cannot throw and take the view down

#### 21. **Timeline & Day Card**
The timeline is the default itinerary view; each day renders as a `CompactDayCard`.
- **Engine**: `day/components/useDayTimeline.ts` turns the four entity types into ordered rows; `timeline-utils.ts` holds the pure logic — time periods (`getTimePeriod` → early-morning…night), `groupSimilarEvents` for collapsible clusters, and event categories (`ocean`/`clay`/`sage`/`slate`/`lodging`) that drive row icons
- **Rows**: `TimelineRow` / `SortableTimelineRow` / `GroupedEventCard`, sectioned by `TimePeriodHeader`, with `NowIndicator` on today and `LayoverHintRow` for layover / free-time / overlap hints
- **Click = read, not edit**: clicking any event opens `EventDetailDialog`, a read-only view of every populated field with an explicit **Edit** button. One tagged union covers activities, stays, transport and dining; empty fields drop out. Dates are built **from their parts, never `Date.parse`** — these are floating wall-clock values (see §17)
- **Design invariants** (from the redesign; changing them re-breaks what was fixed):
  - No resting category wash on rows — at 4% over cream those hues only muddy the paper. Category is carried at full strength by the row icon; hover keeps the wash
  - Overlap hints never fire on lodging rows — a check-in is a window you pass through, not an appointment, and a false alarm in red teaches people to ignore the real ones
  - A missing end time renders as *absence*, not a "tbd" placeholder in real-time weight
  - Past events recede by **ink level**, not `opacity-50`, which had crushed the meta line to 2.1:1. Every text element must clear AA
  - The rail hairline terminates at the first and last node (`railStart`/`railEnd`); a single-row day draws a node and no line

#### 22. **First-Run Discovery Hints**
- `src/components/discovery/DiscoverHint.tsx` + `useFirstRun` — a single dismissible line that appears once, in place, beside the feature it describes. Deliberately not a tour
- Keys (`DiscoveryKey`): `map-view`, `calendar-sync`, `doc-import`, `live-collab`. State mirrors to `localStorage` (`wl.discovery`) and reads synchronously on first render so a dismissed hint never flashes back

#### 23. **Print Studio (Pro feature)**
- The paid feature: an AI-art-directed printable keepsake itinerary. Entry: "Print Studio" button in the TimelineView toolbar → `PrintStudioDialog` (`src/components/trip/print-studio/`) — Pro members enter an optional theme and generate; free users see the upsell (checkout); anyone with trip access can open existing editions
- **Division of labor is the design invariant**: the model (ChatGPT API) is creative director only — it returns a `PrintDesignSpec` (palette, font-pairing id, motif id, editorial copy incl. per-day captions) through a strict json_schema; the renderer draws **every itinerary item from the DB** via the same `fetchPdfTripData` module the PDF export uses, so model output can degrade style, never content
- **Shared contract**: `src/lib/printDesign/spec.ts` (dependency-free; imported by both client and server) — registries (`FONT_PAIRINGS` → Google Fonts pairs, `MOTIFS`) + `sanitizePrintDesign`, which clamps model output: hex normalization, light-background + WCAG contrast enforcement (ink ≥ 4.5:1, muted/primary ≥ 3:1, falling back to `FALLBACK_PALETTE` members), registry-id fallbacks, copy length clamps, captions restricted to real trip dates
- **Server**: `server/routes/print-design.ts` (`POST /api/trips/:tripId/print-design`) — JWT auth + trip access + `subscription_tier === 'pro'` + 10 generations/user/day (counted from `trip_print_designs`); `server/lib/printDesign.ts` serializes the full trip server-side (clamped: ≤40 days, ≤20 activities/day), calls OpenAI chat completions with `response_format: json_schema (strict)`, sanitizes, stores the row. User theme text is quoted and pinned as "styling preference only" (prompt-injection blast radius = copy text, which is length-clamped)
- **Output page**: `/trip/:tripId/print/:designId` (`src/pages/PrintItinerary.tsx`, lazy) — loads the design row (RLS: `can_access_trip`) + trip data, injects the pairing's Google Fonts, renders `PrintDocument` (`print-studio/PrintDocument.tsx` + `printDocument.css`, stroke-based SVG `motifs.tsx`). Printing = native browser dialog (`window.print()`); **AppLayout deliberately renders no nav/footer on `/trip/*/print/*`** so app chrome never reaches the printed page. Layout carries structure in type + hairline rules, not background fills, so it survives printers that drop backgrounds
- Rollout note: designs are stored, so an edition stays openable even if generation is later disabled; deleting is creator-only (RLS)

## Common Development Tasks

### Adding a New Trip Feature
1. Create component in `src/components/trip/[feature]/`
2. Create service layer in `src/services/` if needed
3. Use `useQuery()` or custom real-time hook for data
4. Handle mutations with React Query invalidation
5. Add dialog state to `useSidebarState()` if sidebar integration needed
6. Update trip details route in `App.tsx` if new tab needed

### Adding API Endpoint
1. Create route in `server/routes/`
2. Add endpoint to Express server in `server/index.ts`
3. Handle CORS and error responses
4. Call Supabase client for database operations
5. Use Edge Functions for external API calls (Google Places, Gemini, OpenWeatherMap, SendGrid/Mailgun)

### Adding Database Table/Migration
1. Create SQL file in `supabase/migrations/`
2. Define RLS policies for security
3. Apply migration via Supabase dashboard or CLI
4. Auto-generated types appear in `src/integrations/supabase/types/database.ts`
5. Update TypeScript models in `src/integrations/supabase/types/models.ts`

### Adding Form
1. Use `react-hook-form` + `zod` schema
2. Use Shadcn/ui form components from `src/components/ui/`
3. Handle submission with React Query mutation
4. Use optimistic updates for better UX
5. Show error toasts via Sonner toast library

### Working with Real-Time Data
1. Use existing real-time hook or create new one following pattern in `src/hooks/`
2. Hook fetches initial data with `useQuery()`
3. Subscribe to table changes with `.channel()` and `.on('postgres_changes')`
4. Update React Query cache with `.setQueryData()`
5. No manual re-render needed - React Query triggers it

## Important Files & Patterns

| File/Pattern | Purpose |
|---|---|
| `hooks/useSidebarState.ts` | Sidebar UI state management (largest hook) |
| `services/pdfmake-export.ts` | PDF export orchestrator (see `src/services/pdf/` for builder/theme) |
| `contexts/AuthContext.tsx` | Global authentication state |
| `pages/TripDetails.tsx` | Trip detail page wrapper |
| `components/trip/*/` | Feature-specific components |
| `hooks/use*Realtime.ts` | Real-time data hooks |
| `integrations/supabase/` | Supabase types & client (auto-generated) |
| `services/` | Business logic layer |
| `server/routes/stripe.ts` | Stripe payment routes |
| `server/routes/mcp.ts` + `server/lib/mcpTools.ts` | MCP server & 20-tool registry |
| `server/routes/calendar.ts` + `server/lib/icalFeed.ts` | Token-gated iCal feed |
| `server/routes/print-design.ts` + `server/lib/printDesign.ts` | Print Studio generation (OpenAI, Pro-gated) |
| `src/lib/printDesign/spec.ts` | Print Studio design-spec contract + sanitizer (shared client/server) |
| `components/trip/print-studio/` | Print Studio dialog, document renderer, motifs |
| `components/trip/calendar/` | FullCalendar view, sync sheet, calendar hooks |
| `components/trip/map/` | Trip map view — stop model, route playback, geocoding |
| `components/trip/day/components/timeline-utils.ts` | Pure timeline logic (periods, grouping, categories) |
| `components/trip/day/components/useDayTimeline.ts` | Builds a day's rows from the four entity types |
| `utils/timezoneLabel.ts` | Timezone label/badge helpers |
| `DESIGN.md` + `DESIGN.json` | Full design-system spec (palette hexes, type scale, component rules) — **read before visual work** |
| `vitest.config.ts` | Test configuration |
| `sonar-project.properties` | SonarQube scan config (`reminiscent-io_wanderluxe`) |

## Performance Considerations

- **React Query Caching**: Server state cached aggressively; use `refetchInterval` or invalidation for updates
- **Real-time Subscriptions**: Cheaper than polling; multiple subscriptions per page are normal
- **Code Splitting**: Vite handles automatic chunking; routes lazy-loaded
- **Image Optimization**: Use Unsplash for images (no local asset bloat)
- **Database Queries**: RLS policies enforce filtering at database level (efficient)
- **Optimistic Updates**: Use React Query's `setQueryData()` for instant UI feedback

## Security Notes

- **RLS Policies**: All user-facing tables have RLS; database enforces access control
- **Trip Ownership**: Verified in RLS policies; can't access others' trips directly
- **Shared Trips**: `trip_shares` table with view/edit permission levels
- **Auth**: Supabase Auth with Google OAuth; token auto-refresh via AuthContext
- **Validation**: Zod schemas on frontend; backend re-validates with RLS
- **Session Keep-Alive**: `useSessionKeepAlive()` handles tab visibility and token refresh

## Environment Variables

Required in `.env`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-only service-role key used by Express routes (`server/routes/*`). Bypasses RLS, so those routes do their own authorization checks (e.g. `canAccessTrip` in `ai-chat.ts`). Never expose to the client. The server reuses `VITE_SUPABASE_URL` for the project URL.
- `VITE_GOOGLE_MAPS_API_KEY` - Google Places API + the trip Map view (map renders "Map unavailable" without it)
- `GEMINI_API_KEY` - Google Gemini API key (used by both the chat Edge Function and `parse-travel-doc`). Model is hardcoded to `gemini-2.5-flash` in each function; no env override.
- `SERPER_API_KEY` - (optional, Edge Function secret) Serper API for web search when recommending restaurants; enables direct Resy/OpenTable booking links
- `AERODATABOX_API_KEY` - (Edge Function secret) RapidAPI key for AeroDataBox; consumed by the `flight-status-proxy` Edge Function. Required for the flight-number lookup button in the transportation dialog. Free tier: 600 calls/month.
- `STRIPE_SECRET_KEY` - Stripe payment processing
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
- `VITE_UNSPLASH_ACCESS_KEY` - Trip images (optional)
- `VITE_ADMIN_EMAIL` - Admin user email
- `VITE_PARSE_TRAVEL_DOC_URL` - Travel document parsing endpoint
- `MCP_PUBLIC_BASE_URL` - Public base URL advertised by the MCP server (OAuth discovery)
- `OPENAI_API_KEY` - (server) ChatGPT API key for Print Studio design generation (`server/routes/print-design.ts`); the route 503s without it
- `OPENAI_MODEL` - (optional, server) overrides the Print Studio model (default `gpt-4.1`)
- `VITE_GOOGLE_MAPS_MAP_ID` - (optional) Cloud map ID for the map view; `resolveMapId()` falls back to a demo ID. A Cloud map ID disables inline marker styles
- `VITE_PLACE_PHOTO_CACHE_TTL_MS` - (optional) TTL for the client-side place-photo cache
- `SITE_URL` - (server) canonical site URL used by sitemap/prerender/share links
- `ALLOWED_ORIGINS` - (server, comma-separated) CORS allowlist for Express (distinct from the Edge Functions' singular `ALLOWED_ORIGIN`)
- `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` - (optional) PostHog analytics

Edge Function secrets (set via `supabase secrets set`, not `.env`):
- `GOOGLE_PLACES_API_KEY` - `google-places-proxy` + `timezone-proxy` + `place-coordinates-proxy`
- `OPENWEATHERMAP_API_KEY` - `weather-proxy` (5-day forecasts)
- `SENDGRID_API_KEY` - `send-email` / `send-share-notification` (share emails)
- `MAILGUN_API_KEY` / `MAILGUN_DOMAIN` - `send-trip-reminders` (reminder emails; domain defaults to `mail.wanderluxe.io`)
- `EXCHANGE_RATE_API` - `update-exchange-rates` (ExchangeRate-API key)
- `UNSPLASH_ACCESS_KEY` - `generate-image` / `fetch-unsplash-metadata` (server-side counterpart of `VITE_UNSPLASH_ACCESS_KEY`)
- `CRON_SECRET` - auth for scheduled functions (`send-trip-reminders`, `update-exchange-rates`)
- `ALLOWED_ORIGIN` - CORS origin for Edge Functions (defaults to `https://wanderluxe.io`)

## Debugging Tips

- **React Query DevTools**: Not included; can be added for development
- **Supabase Studio**: Direct database inspection and RLS testing
- **Console Logs**: Check for real-time subscription errors
- **Network Tab**: Verify Supabase API calls and WebSocket connections
- **TypeScript**: `strict` is **off** (`strict: false` in `tsconfig.app.json`, `strictNullChecks: false` in `tsconfig.json`); only `noImplicitAny` is on
- **`npm run type-check` is not a clean baseline**: `tsc -b` currently exits with ~300 pre-existing errors across `src/` and `supabase/functions/`. A red run does not mean your change broke something — compare against a pre-change run, or grep the output for the files you touched
- **ESLint**: Run `npm run lint` to catch code quality issues

## Deployment

Deployed via Replit Autoscale targeting Cloud Run (`deploymentTarget = "cloudrun"` in `.replit`):

1. Build: `npm run build` → sitemap + Vite build + prerender + server bundle (`server/build.js` runs esbuild: `server/index.ts` → `dist/server/index.js`)
2. Run: `npm run start` → `NODE_ENV=production node dist/server/index.js`; Cloud Run injects `PORT` (local default 5001)
3. Set environment variables in the Replit deployment, including the server-only `SUPABASE_SERVICE_ROLE_KEY`
4. Database migrations applied via Supabase dashboard/CLI; Edge Functions deployed via Supabase

## Browser Support

Modern browsers with ES2020+ support. Mobile-first responsive design works on all device sizes.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WanderLuxe** is an AI-powered travel planning platform that combines real-time trip collaboration, comprehensive booking management, AI-assisted recommendations, and professional PDF export. It's a full-stack React/TypeScript application with a PostgreSQL backend via Supabase.

## Quick Start Commands

### Development
```bash
bun install              # Install dependencies
bun run dev             # Start dev server (Express + Vite, http://localhost:8080)
bun run dev:frontend    # Vite only (no Express backend)
bun run dev:server      # Express server only
bun run type-check      # TypeScript type checking
bun run lint            # ESLint code quality check
```

> **Note**: If `bun` is not on PATH, use `npx` equivalents: `npx tsc --noEmit` (type-check), `npx vitest run` (tests).

### Building & Testing
```bash
bun run build           # Full pipeline: build:sitemap → vite build → prerender (puppeteer) → build:server
bun run build:dev       # Development build
bun run preview         # Preview production build (port 8080)
bun run test            # Run tests (Vitest)
bun run test:watch      # Watch mode
bun run test:coverage   # Coverage report
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS
- **State Management**: React Context (auth) + TanStack Query (server state) + React hooks (UI state)
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Real-time**: Supabase real-time subscriptions via WebSocket
- **Backend**: Express.js + Supabase Edge Functions (Deno)
- **AI**: Google Gemini 2.5 Flash (hardcoded in Edge Function + Express; no env override)
- **Payments**: Stripe
- **External APIs**: Google Places, SendGrid, Unsplash
- **Testing**: Vitest
- **PWA**: Service worker + manifest for installable app

### Directory Structure

```
src/
├── components/
│   ├── trip/              # Trip feature components (15 subdirs)
│   │   ├── _shared/       # Shared trip utilities
│   │   ├── accommodation/ # Hotel management
│   │   ├── ai-assistant/  # AI assistant components
│   │   ├── budget/        # Expense tracking
│   │   ├── create/        # Trip creation flow
│   │   ├── dashboard/     # Trip dashboard cards
│   │   ├── day/           # Day-by-day components
│   │   ├── details/       # Trip detail views
│   │   ├── dining/        # Restaurant reservations
│   │   ├── hero/          # Trip hero/header
│   │   ├── stats/         # Trip statistics
│   │   ├── timeline/      # Itinerary display
│   │   ├── transportation/# Flight/train/car bookings
│   │   ├── travelers/     # Collaborator management
│   │   └── weather/       # Weather display components
│   ├── admin/             # Admin dashboard components
│   ├── layout/            # Sidebar, Navigation, AppLayout
│   ├── navigation/        # Navigation components
│   ├── landing/           # Landing page sections (WhySignUp, etc.)
│   └── ui/                # Shadcn/ui primitive components (~53)
├── pages/                 # Route pages (MyTrips, TripDetails, Budget, Profile, Explore, Settings, InviteRedeem, etc.)
├── hooks/                 # Custom hooks (useSidebarState, useChat, useTripQuery, etc.)
├── services/              # Business logic (pdfmake-export, travelers, tripDaysService, etc.)
├── contexts/              # React Context (AuthContext, ConsentContext)
├── config/                # Environment config (env.ts)
├── lib/                   # Theme, utilities
├── integrations/supabase/ # Supabase client & auto-generated types
├── test/                  # Test setup & mocks
├── types/                 # TypeScript definitions
└── utils/                 # Utility functions

server/
├── index.ts              # Express server setup
├── dev-server.ts         # Development server config
└── routes/               # API routes (Stripe, AI chat, admin insights, invite preview, share notifications, account)

supabase/
├── functions/            # Serverless Deno functions (12 functions)
│   ├── ai-chat/                  # AI chat via Gemini 2.5 Flash
│   ├── fetch-unsplash-metadata/  # Unsplash image metadata
│   ├── fetch-url-metadata/       # URL metadata extraction
│   ├── flight-status-proxy/      # AeroDataBox flight lookup
│   ├── generate-image/           # AI image generation
│   ├── google-places-proxy/      # Google Places API proxy
│   ├── parse-travel-doc/         # Travel document parsing
│   ├── send-email/               # Email via SendGrid
│   ├── send-share-notification/  # Trip share notifications
│   ├── send-trip-reminders/      # Scheduled trip reminder emails
│   ├── update-exchange-rates/    # Currency exchange updates
│   └── weather-proxy/            # Weather data proxy
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

Real-time hooks exist for: accommodations, activities, reservations, chat messages, and trip details.

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
- Root entity: `trips` table (destination, dates, budget, etc.)
- Sub-entities: `trip_days`, `day_activities`, `accommodations`, `transportation`, `reservations`
- Relationships: `*_travelers` tables link users to bookings
- Sharing: `trip_shares` table with permission levels (view/edit)
- Security: RLS policies enforce trip ownership and share permissions

#### 5. **AI Chat Integration**
- Chat interface: `AIAssistantPanel` (`src/components/trip/ai-assistant/`) — combined chat + document extraction surface, mounted via `AIAssistantDrawer`
- Backend: Calls Gemini 2.5 Flash via `ai-chat` Edge Function (with `find_place` + `search_web` function calling); document extraction via `parse-travel-doc`
- Data: `ai_chat_threads` + `ai_chat_messages` tables; `user_ai_usage` tracks usage
- Real-time: Subscription to chat messages for instant updates
- Context: Includes trip details in system prompt for location-specific recommendations

#### 6. **Component Patterns**

**Sidebar (Fixed Layout)**
- `useSidebarState()` manages complex nested dialog states
- Secondary panels for accommodation/activity/dining details
- Responsive: Fixed on desktop, drawer on mobile

**Trip Details Page**
- Wrapper component routes to different views (Timeline, Budget, Booking, Chat)
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
- **Tests**: `npx vitest run src/services/pdf` (snapshots + theme invariants); `PDF_PREVIEW=1 npx vitest run src/services/pdf/render.test.ts` writes `/tmp/wanderluxe-pdf-preview.pdf`

#### 8. **Database Schema** (~22 tables)
Key tables:
- `trips` - Trip records with dates, budget, destination
- `trip_days` - Days within a trip
- `day_activities` / `day_activity_travelers` - Activities and assignments
- `accommodations` / `accommodations_days` / `accommodation_travelers` - Hotel bookings
- `transportation` / `transportation_travelers` - Flight/train/car bookings
- `reservations` / `reservation_travelers` - Dining reservations
- `trip_shares` - Trip sharing & permissions
- `profiles` - User profiles (auto-created on signup)
- `ai_chat_threads` / `ai_chat_messages` - AI conversation history
- `user_ai_usage` - AI usage tracking
- `currencies` / `exchange_rates` - Multi-currency support
- `weather_cache` - Cached weather data
- `other_expenses` - Non-booking expenses
- `user_engagement_events` / `trip_view_status` - Analytics

All tables have RLS policies: users can only access their own trips or shared trips.

#### 9. **Key Custom Hooks**
- `useSidebarState()` - Complex sidebar UI state management
- `useChat()` - Chat history + real-time subscriptions
- `useTripQuery()` - Trip data fetching
- `useAccommodationsRealtime()` - Real-time accommodations
- `useActivitiesRealtime()` - Real-time activities
- `useReservationsRealtime()` - Real-time dining
- `useTravelers()` - Collaborator management
- `useTripPermissions()` - Permission checking
- `useSessionKeepAlive()` - Session management with tab visibility detection
- `useAIAssistant()` - AI assistant integration
- `useAdminMetrics()` - Admin dashboard data
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
- `useRealtimeSubscription()` - Generic real-time subscription helper

#### 10. **Styling System**
- **Framework**: Tailwind CSS with custom config
- **Typography**: DM Serif Display (headings h1-h3, `font-display`), DM Sans (body/UI, `font-sans`) via Google Fonts
- **Colors**: Warm editorial travel palette via CSS custom properties + Tailwind scales
  - Sand/Earth: warm neutrals for text and backgrounds
  - Sunset (50-600): orange accent scale for CTAs and highlights
  - Navy (800-950): dark tones
  - CSS vars (`--background`, `--foreground`, `--border`, etc.) in `src/index.css` control semantic tokens
- **Shadows**: Brown-tinted warm shadows (`shadow-warm-sm`, `shadow-warm`, `shadow-warm-lg`, `shadow-warm-xl`)
- **Border Radius**: `rounded-card` (0.75rem) for cards
- **Button Variants**: `sunset` variant for primary CTAs (gradient orange)
- **Components**: Shadcn/ui (~53 Radix UI primitives)
- **Animations**: Custom fade-up, fade-down, slide-up, slide-down
- **Responsive**: Mobile-first with Tailwind breakpoints
- **Utilities**: `bg-grain` (subtle noise texture, parent must be positioned), `img-warm` (subtle saturation filter for photos)
- **Gotcha**: Custom `@layer utilities` in `index.css` override Tailwind built-in utilities (e.g. `position: relative` overrides `fixed`) — avoid setting `position` in custom utility classes

#### 11. **Stripe Integration**
- Payment processing via `server/routes/stripe.ts`
- Stripe SDK v20+ in dependencies
- Database columns for Stripe data on trips

#### 12. **Admin Dashboard**
- Components in `src/components/admin/`
- Admin page with engagement, users, and overview tabs
- Protected via `useIsAdmin()` hook

#### 13. **PWA Support**
- `public/manifest.json` + `public/sw.js` for installable app
- PWA icons at multiple resolutions (144, 192, 384, 512)
- `usePWAInstall()` hook for install prompt
- **Version stamping**: `vite.config.ts` emits `dist/version.json` and injects `__APP_SHA__` into `sw.js` at build time; `useVersionCheck()` polls `version.json` to detect updates

#### 14. **Weather Integration**
- `weather_cache` table for caching
- `weather-proxy` Edge Function
- `useWeather()` hook for trip weather data

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
5. Use Edge Functions for external API calls (Google Places, Gemini, SendGrid)

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
| `vitest.config.ts` | Test configuration |

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
- `VITE_GOOGLE_MAPS_API_KEY` - Google Places API
- `GEMINI_API_KEY` - Google Gemini API key (used by both the chat Edge Function and `parse-travel-doc`). Model is hardcoded to `gemini-2.5-flash` in each function; no env override.
- `SERPER_API_KEY` - (optional, Edge Function secret) Serper API for web search when recommending restaurants; enables direct Resy/OpenTable booking links
- `AERODATABOX_API_KEY` - (Edge Function secret) RapidAPI key for AeroDataBox; consumed by the `flight-status-proxy` Edge Function. Required for the flight-number lookup button in the transportation dialog. Free tier: 600 calls/month.
- `STRIPE_SECRET_KEY` - Stripe payment processing
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
- `VITE_UNSPLASH_ACCESS_KEY` - Trip images (optional)
- `VITE_ADMIN_EMAIL` - Admin user email
- `VITE_PARSE_TRAVEL_DOC_URL` - Travel document parsing endpoint

## Debugging Tips

- **React Query DevTools**: Not included; can be added for development
- **Supabase Studio**: Direct database inspection and RLS testing
- **Console Logs**: Check for real-time subscription errors
- **Network Tab**: Verify Supabase API calls and WebSocket connections
- **TypeScript**: Strict mode enabled; type errors catch bugs early
- **ESLint**: Run `bun run lint` to catch code quality issues

## Deployment

1. `bun run build` - Creates optimized production bundle
2. Set environment variables in deployment platform
3. Database migrations auto-applied via Supabase
4. Edge Functions deployed automatically
5. Express server deployed to Node.js hosting

## Browser Support

Modern browsers with ES2020+ support. Mobile-first responsive design works on all device sizes.

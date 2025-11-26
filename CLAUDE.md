# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WanderLuxe** is an AI-powered travel planning platform that combines real-time trip collaboration, comprehensive booking management, AI-assisted recommendations, and professional PDF export. It's a full-stack React/TypeScript application with a PostgreSQL backend via Supabase.

## Quick Start Commands

### Development
```bash
bun install              # Install dependencies
bun run dev             # Start development server (Vite on http://localhost:5173)
bun run type-check      # TypeScript type checking
bun run lint            # ESLint code quality check
```

### Building & Testing
```bash
bun run build           # Production build
bun run build:dev       # Development build
bun run preview         # Preview production build (port 8080)
```

### Database
```bash
bun run db:push         # Apply Supabase migrations
bun run db:reset        # Reset database (development only)
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS
- **State Management**: React Context (auth) + TanStack Query (server state) + React hooks (UI state)
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Real-time**: Supabase real-time subscriptions via WebSocket
- **Backend**: Express.js + Supabase Edge Functions (Deno)
- **AI**: OpenAI GPT-4o-mini
- **External APIs**: Google Places, SendGrid, Unsplash

### Directory Structure

```
src/
├── components/
│   ├── trip/              # Trip feature components (14 subdirs)
│   │   ├── accommodation/ # Hotel management
│   │   ├── budget/        # Expense tracking
│   │   ├── chat/          # AI assistant
│   │   ├── create/        # Trip creation flow
│   │   ├── day/           # Day-by-day components
│   │   ├── dining/        # Restaurant reservations
│   │   ├── timeline/      # Itinerary display
│   │   ├── transportation/# Flight/train/car bookings
│   │   ├── travelers/     # Collaborator management
│   │   ├── vision-board/  # Inspiration gallery
│   │   └── ...            # Other trip features
│   ├── layout/            # Sidebar, Navigation, AppLayout
│   └── ui/                # Shadcn/ui primitive components (~40)
├── pages/                 # Route pages (MyTrips, TripDetails, Budget, Profile, etc.)
├── hooks/                 # Custom hooks (useSidebarState, useChat, useTripQuery, etc.)
├── services/              # Business logic (pdfmake-export, travelers, tripDaysService, etc.)
├── contexts/              # React Context (AuthContext)
├── integrations/supabase/ # Supabase client & auto-generated types
├── types/                 # TypeScript definitions
└── utils/                 # Utility functions

server/
├── index.ts              # Express server setup
└── routes/               # API routes (PDF export, notifications, etc.)

supabase/
├── functions/            # Serverless Deno functions
│   ├── send-share-notification/
│   ├── google-places-proxy/
│   ├── parse-travel-doc/
│   └── ...
├── migrations/           # SQL migration files
└── config.toml          # Supabase configuration
```

### Core Concepts

#### 1. **State Management Strategy**
- **Global Auth**: `AuthContext` (React Context) - authentication state with auto session refresh
- **Server State**: `TanStack Query` - data fetching, caching, real-time subscriptions
- **UI State**: React hooks (`useState`) - dialogs, forms, selected items
- **Complex UI State**: `useSidebarState` hook (688 lines) - manages ~40 state variables for sidebar panels and dialogs

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
- Chat interface: `ChatView` component in trip details
- Backend: Calls OpenAI via Edge Function
- Data: `chat_logs` table stores history with embeddings
- Real-time: Subscription to chat_logs for instant message updates
- Context: Includes trip details in system prompt for location-specific recommendations

#### 6. **Component Patterns**

**Sidebar (Fixed Layout)**
- `useSidebarState()` manages complex nested dialog states
- Secondary panels for accommodation/activity/dining details
- Responsive: Fixed on desktop, drawer on mobile
- 365 lines, handles 40+ state variables

**Trip Details Page**
- Wrapper component routes to different views (Timeline, Budget, Booking, Chat, VisionBoard)
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
- **File**: `/src/services/pdfmake-export.ts` (18,085 lines - largest file)
- **Endpoint**: `/api/export-pdf` (Express backend)
- **Data**: Collects trips, days, activities, accommodations, transportation, budget
- **Format**: Professional itinerary with logos, formatting, mobile-aware layout
- **Library**: pdfmake (no external PDF service)

#### 8. **Database Schema** (17 tables)
Key tables:
- `trips` - Trip records with dates, budget, destination
- `trip_days` - Days within a trip
- `day_activities` - Activities scheduled for days
- `accommodations` / `transportation` / `reservations` - Bookings
- `*_travelers` - User assignments to bookings
- `trip_shares` - Trip sharing & permissions
- `profiles` - User profiles (auto-created on signup)
- `chat_logs` - AI conversation history
- `vision_board_items` - Travel inspiration
- `currencies` / `exchange_rates` - Multi-currency support

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

#### 10. **Styling System**
- **Framework**: Tailwind CSS 3.4.11 with custom config
- **Colors**: Sand/earth palette (luxury travel aesthetic)
  - Sand: #FAF9F7 → #7B715F (light to dark)
  - Earth: #F5F3F2 → #5C544A (light to dark)
- **Components**: Shadcn/ui (40+ Radix UI primitives)
- **Animations**: Custom fade-up, fade-down, slide-up, slide-down
- **Responsive**: Mobile-first with Tailwind breakpoints

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
5. Use Edge Functions for external API calls (Google Places, OpenAI, SendGrid)

### Adding Database Table/Migration
1. Create SQL file in `supabase/migrations/`
2. Define RLS policies for security
3. Run `bun run db:push`
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

| File/Pattern | Purpose | Size |
|---|---|---|
| `useSidebarState.ts` | Sidebar UI state management | 688 lines |
| `pdfmake-export.ts` | PDF itinerary generation | 18,085 lines |
| `AuthContext.tsx` | Global authentication state | - |
| `pages/TripDetails.tsx` | Trip detail page wrapper | 164 lines |
| `components/trip/*/` | Feature-specific components | varies |
| `hooks/use*Realtime.ts` | Real-time data hooks | 100-200 lines |
| `integrations/supabase/` | Supabase types & client | auto-generated |
| `services/` | Business logic layer | - |

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
- `OPENAI_API_KEY` - OpenAI API for chat
- `SENDGRID_API_KEY` - Email service
- `VITE_UNSPLASH_ACCESS_KEY` - Trip images (optional)

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

# WanderLuxe - Travel Planning Application

## Overview
WanderLuxe is a comprehensive web application for creating, managing, and sharing detailed travel itineraries. It aims to simplify travel planning with features for accommodation booking, activity planning, expense tracking, and AI-powered assistance. The platform offers personalized travel experiences, fosters collaboration, and streamlines the entire planning process.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with a sand/earth color palette
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router
- **Forms**: React Hook Form with Zod validation

### Backend
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (supports Google OAuth)
- **Real-time**: Supabase real-time subscriptions
- **API**: Express server with custom routes (`server/index.ts`)
- **Payments**: Stripe integration for Pro subscriptions
- **File Storage**: Supabase Storage

### Development Setup
- **Combined Server**: Run `./start-dev.sh` or `bun run server/dev-server.ts` to start both Express backend and Vite frontend in a single process on port 5000
- **Separate Servers**: Alternatively, run `bun run server/index.ts` (port 5000) and `vite` (port 8080) - Vite proxies `/api/*` requests to the backend
- **Production**: Run `bun run start` to serve the built frontend and API from port 5000

### API Endpoints (Express Server)
- `/api/health` - Health check
- `/api/stripe/create-checkout` - Create Stripe checkout session (requires auth)
- `/api/stripe/webhook` - Stripe webhook handler
- `/api/stripe/create-portal` - Create Stripe billing portal session (requires auth)
- `/api/ai-chat` - AI assistant chat endpoint
- `/api/share-notification` - Email notifications for trip sharing
- `/api/trip-pdf` - Generate trip PDF exports

### Database Design
The schema is normalized PostgreSQL, including entities for `trips`, `trip_days`, `day_activities`, `accommodations`, `transportation`, `reservations`, `trip_shares`, and `profiles`.

### Key Features
- **Trip Management**: Creation, sharing (with granular permissions), and day-by-day timeline management.
- **Activity Planning**: Time-based scheduling for activities, accommodations, transportation, and dining.
- **AI Integration**: Conversational AI assistant, content generation (descriptions, recommendations), and cover image generation.
- **Sharing & Collaboration**: Permission-based sharing with real-time updates and email notifications.
- **Budgeting**: Comprehensive expense tracking, categorization, and visualization with interactive elements and filtering.

### System Design Choices
- **Real-time Updates**: Comprehensive real-time subscriptions for all data types (activities, accommodations, transportation, dining) with query invalidation for immediate UI updates.
- **Unified Dialogs**: Consolidated component architecture for adding/editing various trip elements (activities, accommodations, etc.) to reduce code duplication and ensure consistent UX.
- **Luxury Date Pickers**: Integration of premium, responsive `LuxuryDateTimeRangePicker` for consistent and polished date selection across the application.
- **Standardized Dialogs**: Uniform styling, responsive width settings, scroll functionality, and consistent interaction patterns across all dialog types.
- **Timeline Redesign**: Streamlined, compact day cards replacing image-based designs, featuring a unified chronological timeline view of all timed events, quick-add buttons, and direct edit functionality.
- **Time Period Grouping**: Daily activities grouped by time periods (Early Morning 🌅, Morning ☀️, Afternoon 🌤️, Evening 🌆, Night 🌙) with emoji headers for visual clarity.
- **Daily Cost Summary**: Enhanced day cards with cost breakdown by category (Activities, Accommodations, Transportation, Dining) displayed as a quick-reference card.
- **Smart Day Expansion**: Past days auto-collapse in timeline view while future and current days remain expanded, improving visual focus and reducing clutter.
- **Mobile Responsiveness**: Designed for seamless experience across mobile, tablet, and desktop, including responsive date pickers, dialogs, and layout adjustments.
- **Error Handling & Validation**: Robust form validation using Zod and React Hook Form, with double-click prevention on submissions.
- **Currency Formatting**: Timeline costs display with currency symbols ($#,###) for clarity, matching international formatting standards.

### UI/UX Decisions
- **Color Scheme**: Consistent sand/earth color palette across the application.
- **Navigation**: Fixed, collapsible left-hand sidebar for trip-specific navigation on desktop, with a mobile sheet drawer. Includes primary and secondary sidebar panels.
- **Component Design**: Emphasis on consistent interaction patterns, such as clickable list items to open edit dialogs, and uniform delete functionality.
- **Date Pickers**: Calendar components are centrally positioned in dialogs and themed.
- **Form Validation**: Robust validation and double-click prevention for form submissions.
- **Budget Page Design**: Sophisticated interface matching "My Trips" aesthetics, with gradient background, tabbed navigation (Overview, Expenses, Categories, Analytics), interactive expense cards with animations, category-based color coding, search/filter, currency selector, progress visualizations, and skeleton/empty states.

## External Dependencies

### Core Services
- **Supabase**: Database, authentication, real-time capabilities, storage, edge functions.
- **Google Places API**: Location search and geocoding (accessed via proxy).
- **OpenAI API**: AI chat assistant and content generation.
- **Perplexity AI**: Enhanced search and travel recommendations.
- **SendGrid**: Email notifications.
- **Unsplash API**: Stock photography for trip imagery.

### UI Components & Utilities
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **Framer Motion**: Animation library.
- **React Hook Form**: Form state management.
- **Date-fns**: Date manipulation utilities.
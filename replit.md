# WanderLuxe - Travel Planning Application

## Overview
WanderLuxe is a comprehensive travel planning web application built to enable users to create, manage, and share detailed travel itineraries. It includes features for accommodation booking, activity planning, expense tracking, and AI-powered travel assistance. The vision is to offer a seamless and intelligent platform for personalized travel experiences, simplifying the planning process and fostering collaboration among travelers.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

**January 16, 2025** - Enhanced Activity Dialog Date Selection + Fixed Dining Edit Issue
- Fixed missing date selection functionality in activity editing from compact day cards
- Added tripDates prop to EditActivityDialog and AddActivityDialog in TimelineContent
- Enhanced date selection now works consistently from both side panel and compact day cards
- Upgraded activity form date selection to match dining reservation sophistication
- Replaced basic HTML select with shadcn Select component for better UX
- Added full date formatting showing "Wednesday, January 16, 2025" instead of abbreviated formats
- Enhanced currency selection with consistent styling and improved dropdown behavior
- Improved z-index handling and visual consistency across all form dialogs
- Resolved critical bug where existing dining reservation data wasn't populating correctly in edit forms
- Added database lookup to convert day_id back to reservation_date when editing reservations
- Implemented useEffect hook in RestaurantReservationForm to fetch date from trip_days table
- Fixed form initialization to properly handle reservation data without reservation_date field
- Enhanced data flow between DiningList and RestaurantReservationForm components

**January 15, 2025** - Enhanced Trip Sharing UX and Mobile Keyboard Stability
- Moved Share button from hero section to timeline toolbar, positioned left of Export PDF button
- Created EmailCombobox component combining manual typing with dropdown suggestions
- Added getPreviouslySharedEmails service to fetch user's sharing history from trip_shares table
- Implemented smart filtering to exclude emails already shared with current trip
- Enhanced ShareTripDialog with previous email suggestions for improved user experience
- Maintained ability to manually type email addresses alongside dropdown functionality
- Fixed dropdown visibility with z-index adjustments (z-[9999]) and modal={false} configuration
- Resolved mobile keyboard resizing issues by updating viewport meta tag and CSS stable height properties
- Fixed TypeScript and CSS syntax errors for production readiness
**January 14, 2025** - Standardized Dialog Components for Consistent UX
- Unified styling across all four dialog types (accommodations, transportation, activities, dining)
- Implemented consistent responsive width settings (w-[95vw] max-w-[95vw] sm:max-w-[600px])
- Added clean scroll functionality without visible scrollbar using overflow-y-auto with scrollbar-none CSS utility
- Applied onPointerDownOutside prevention for all dialogs to maintain Google Places dropdown functionality
- Fixed dialog header positioning with flex-shrink-0 for stable scrolling experience
- Resolved type mismatches between database and form data (cost field conversion)
- Fixed transportation form date loading in edit mode - now properly uses trip dates as fallback when transportation record lacks complete date information
- Added DialogDescription components to all dialogs for better accessibility compliance
- Fixed transportation dialog width overflow issues with proper flex constraints and min-width settings
- Enhanced transportation times loading - now handles null end_date while preserving time values
- Applied mobile-responsive padding and width constraints to all dialog components (p-4 sm:p-6)
- Added proper input width constraints with max-w-full and truncate for date/time fields
- Fixed location search input overflow with proper flex container constraints
- Cleaned up all debugging console.log statements for production readiness
- Standardized dialog content structure across all form types for consistent mobile behavior
- Redesigned DateTimeRangeField to stack date and time vertically on mobile, preventing horizontal overflow
- Enhanced date/time picker button with proper flex column layout and text truncation

**January 14, 2025** - Completed Real-time Updates for CompactDayCard
- Implemented comprehensive real-time subscriptions for all data types (activities, accommodations, transportation, dining)
- Added proper query invalidation for immediate UI updates without page refreshes
- Cleaned up console logging for production-ready experience
- Removed obsolete DayCard.tsx file - fully migrated to CompactDayCard component
- All CRUD operations now trigger live updates across all connected clients

**January 14, 2025** - Redesigned Timeline Day Cards for improved usability
- Replaced hero image-based day cards with compact, streamlined design
- Implemented unified timeline view showing all timed events in chronological order
- Removed empty accordion sections, showing one-line summaries instead
- Combined all timed items (activities, hotels, transportation, dining) into single ordered list
- Improved mobile responsiveness with compact navigation controls
- Simplified day card interaction with quick-add buttons for each entry type
- Made all timeline items clickable to open their respective edit dialogs
- Added proper edit functionality for activities, accommodations, transportation, and dining reservations
- Removed sticky Day Navigator based on user feedback for cleaner interface
- Made Add buttons more compact to fit all 4 on one line for mobile devices
- Set all day cards to be expanded by default for immediate timeline visibility
- Added "All Day" section showing accommodations for days between check-in and check-out

**January 13, 2025** - Integrated authentic Fora Travel advisor profile
- Updated BookingView component to replace placeholder text with Kevin Lowe's professional Fora Travel advisor profile
- Added authentic profile data including photo, expertise areas, travel style, and contact information
- Implemented proper Fora Travel branding and compliance with advisor title requirements
- Added direct link to Fora Travel profile page for professional booking assistance
- Enhanced UI with value proposition section explaining benefits of booking with a Fora Travel advisor

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
- **API**: Supabase Edge Functions (serverless logic)
- **File Storage**: Supabase Storage

### Database Design
The schema is normalized PostgreSQL, including entities for `trips`, `trip_days`, `day_activities`, `accommodations`, `transportation`, `reservations`, `trip_shares`, and `profiles`.

### Key Features
- **Trip Management**: Creation, sharing (with granular permissions), and day-by-day timeline management.
- **Activity Planning**: Time-based scheduling for activities, accommodations, transportation, and dining.
- **AI Integration**: Conversational AI assistant, content generation (descriptions, recommendations), and cover image generation.
- **Sharing & Collaboration**: Permission-based sharing with real-time updates and email notifications.

### Data Flows
- **Authentication**: JWT-based session management with Row Level Security (RLS).
- **Trip Creation**: Form-driven creation, integrating Google Places API for location data, and optional AI image generation.
- **Sharing**: Permission record creation, email notifications via SendGrid Edge Function, and RLS enforcement.
- **Real-time Updates**: Supabase subscriptions broadcast database changes to connected clients, enabling live collaboration.

### UI/UX Decisions
- **Color Scheme**: Consistent sand/earth color palette across the application.
- **Navigation**: Fixed, collapsible left-hand sidebar for trip-specific navigation on desktop, with a mobile sheet drawer. Includes primary and secondary sidebar panels for detailed component management.
- **Component Design**: Emphasis on consistent interaction patterns, such as clickable list items to open edit dialogs, and uniform delete functionality with trash icons within dialogs.
- **Date Pickers**: Calendar components are centrally positioned in dialogs and themed with the application's color scheme.
- **Form Validation**: Robust validation and double-click prevention for form submissions.

## External Dependencies

### Core Services
- **Supabase**: Database, authentication, real-time capabilities, storage, edge functions.
- **Google Places API**: Location search and geocoding (accessed securely via a proxy edge function).
- **OpenAI API**: AI chat assistant and content generation.
- **Perplexity AI**: Used for enhanced search and travel recommendations.
- **SendGrid**: Email notifications.
- **Unsplash API**: Stock photography for trip imagery.

### Development Tools
- **Bun**: JavaScript runtime and package manager.
- **ESLint**: Code linting.
- **TypeScript**: Static type checking.
- **Tailwind CSS**: Utility-first CSS framework.

### UI Components & Utilities
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **Framer Motion**: Animation library.
- **React Hook Form**: Form state management.
- **Date-fns**: Date manipulation utilities.
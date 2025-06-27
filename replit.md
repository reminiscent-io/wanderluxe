# WanderLuxe - Travel Planning Application

## Overview

WanderLuxe is a comprehensive travel planning web application built with React, TypeScript, and Supabase. The application enables users to create, manage, and share detailed travel itineraries with features including accommodation booking, activity planning, expense tracking, and AI-powered travel assistance.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system (sand/earth color palette)
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: React Router for client-side navigation
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth with Google OAuth integration
- **Real-time**: Supabase real-time subscriptions for live updates
- **API**: Supabase Edge Functions for serverless backend logic
- **File Storage**: Supabase Storage for images and attachments

### Database Design
The application uses a normalized PostgreSQL schema with the following core entities:
- **trips**: Main trip records with destinations and date ranges
- **trip_days**: Individual days within trips
- **day_activities**: Activities scheduled for specific days
- **accommodations**: Hotel/lodging information
- **transportation**: Travel arrangements between locations
- **reservations**: Restaurant and dining reservations
- **trip_shares**: Permission-based trip sharing system
- **profiles**: User profile information

## Key Components

### Trip Management
- **Trip Creation**: Form-based trip creation with destination search via Google Places API
- **Trip Sharing**: Granular permission system (read/edit) for sharing trips with other users
- **Trip Timeline**: Day-by-day itinerary management with drag-and-drop functionality

### Activity Planning
- **Day Activities**: Time-based activity scheduling with cost tracking
- **Accommodations**: Hotel booking management with check-in/check-out dates
- **Transportation**: Travel arrangement tracking between locations
- **Dining**: Restaurant reservation management

### AI Integration
- **Travel Assistant**: Conversational AI powered by OpenAI GPT-4 and Perplexity AI
- **Content Generation**: AI-generated trip descriptions and recommendations
- **Image Generation**: AI-powered cover image generation for trips

### Sharing & Collaboration
- **Permission Levels**: Read-only and edit permissions for shared trips
- **Email Notifications**: SendGrid integration for sharing notifications
- **Real-time Updates**: Live collaboration with instant updates across users

## Data Flow

### Authentication Flow
1. User signs in via Supabase Auth (email/password or Google OAuth)
2. Session established with JWT tokens
3. Row Level Security (RLS) policies enforce data access permissions
4. User profile created/updated in profiles table

### Trip Creation Flow
1. User fills trip creation form with destination and dates
2. Google Places API provides location suggestions and validation
3. Trip record created in trips table
4. Trip days automatically generated based on date range
5. Cover image optionally generated via AI or selected manually

### Sharing Flow
1. Trip owner enters email address and permission level
2. Trip share record created in trip_shares table
3. Email notification sent via SendGrid Edge Function
4. Shared user gains access based on permission level
5. RLS policies enforce read/edit permissions at database level

### Real-time Updates
1. Supabase real-time subscriptions established for active trips
2. Database changes broadcast to all connected clients
3. UI updates automatically without page refresh
4. Optimistic updates for improved user experience

## External Dependencies

### Core Services
- **Supabase**: Database, authentication, real-time, storage, edge functions
- **Google Places API**: Location search and geocoding
- **OpenAI API**: AI chat assistant and content generation
- **Perplexity AI**: Enhanced search and travel recommendations
- **SendGrid**: Email notifications for trip sharing
- **Unsplash API**: Stock photography for trip imagery

### Development Tools
- **Bun**: Fast JavaScript runtime and package manager
- **ESLint**: Code linting and quality enforcement
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework

### UI Components
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **Framer Motion**: Animation library
- **React Hook Form**: Form state management
- **Date-fns**: Date manipulation utilities

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with Vite dev server on port 8080
- **Production**: Cloud Run deployment via Replit
- **Database**: Hosted PostgreSQL via Supabase
- **CDN**: Static assets served via Replit/Cloud Run

### Build Process
1. TypeScript compilation and type checking
2. Vite bundling with code splitting
3. CSS optimization and minification
4. Asset optimization and compression
5. Environment variable injection

### Security Considerations
- Row Level Security (RLS) policies enforce data access
- JWT-based authentication with automatic token refresh
- CORS configuration for API security
- Environment variables for sensitive credentials
- Input validation and sanitization

## Changelog

- June 19, 2025. Initial setup
- June 19, 2025. Fixed multiple development errors:
  - Resolved Framer Motion prop conflicts by properly wrapping components with motion elements
  - Fixed Supabase subscription lifecycle issues causing "tried to subscribe multiple times" errors
  - Added error boundary protection to prevent component crashes
  - Improved component stability and error handling throughout the application
- June 20, 2025. Optimized component rendering performance:
  - Fixed excessive re-rendering in Hero component by replacing state-based parallax with direct DOM manipulation
  - Optimized TripCard components with React.memo and removed debug logging
  - Added useMemo to trip filtering in MyTrips page to prevent unnecessary recalculations
  - Cleaned up console logging across Timeline, Budget, and reservation components
  - Significantly improved scroll performance and eliminated console spam throughout the application
- June 20, 2025. Fixed reservation insertion issues:
  - Identified RLS policy mismatch - policies were checking trip_id directly but reservations table lacked this column
  - Updated database schema to add trip_id column to reservations table with proper foreign key constraints
  - Fixed NOT NULL constraint violations by ensuring order_index field is included in all reservation insertions
  - Added comprehensive error logging throughout reservation submission chain to track data flow
  - Made all submission handlers async to properly handle database operations
- June 23, 2025. Fixed reservation real-time updates and Google Places integration:
  - Fixed query key mismatch between reservation hooks causing real-time updates to fail
  - Re-enabled Supabase real-time subscriptions for reservations that were disabled for debugging
  - Added trip data invalidation to reservation saves matching activity behavior for immediate UI updates
  - Fixed form validation schema making cost and number_of_people optional instead of required
  - Resolved Google Places restaurant search functionality preventing save operations
- June 26, 2025. Stabilized AI Chat functionality with enhanced edge functions:
  - Fixed nested button HTML error in chat code blocks by properly handling inline vs block code rendering
  - Added chat_logs database table integration with proper TypeScript interfaces
  - Improved edge function stream processing with better error handling and recovery
  - Enhanced real-time chat subscriptions with proper cleanup and connection stability
  - Added comprehensive type safety for chat messages with fallback error handling
  - Improved Perplexity API stream parsing to handle malformed JSON chunks gracefully
  - Optimized chat performance with debounced stream buffer updates to eliminate slow typing interface
  - Added batch processing to edge function streaming to reduce excessive chunk emissions and improve responsiveness
  - Fixed persistent DOM exceptions by replacing nested Button components with accessible span elements in RestaurantCard
  - Enhanced event handling with proper stopPropagation to prevent interactive element conflicts
  - Resolved chat authentication issues causing unhandled rejection errors
  - Improved edge function error handling and database insertion resilience
  - Restored working non-streaming JSON response functionality by reverting to user's proven architecture
  - Fixed response parsing compatibility between frontend and deployed edge function
  - Eliminated unhandled rejection errors by removing streaming dependency conflicts
  - Added comprehensive trip context integration to provide AI with destination, dates, and accommodation details
  - Enhanced chat prompting to deliver location-specific travel recommendations and authentic local insights
  - Optimized chat input performance by memoizing expensive operations and preventing unnecessary re-renders
  - Fixed slow typing responsiveness through strategic React optimization patterns
  - Resolved restaurant reservation subscription startup issues by implementing global subscription tracking to prevent duplicates
  - Enhanced subscription lifecycle management with proper cleanup and stable React hook dependencies
  - Eliminated multiple subscription creation through component re-render protection and reference stability
  - Fixed Perplexity API 400 errors by switching to OpenAI GPT-4o-mini as primary chat service due to persistent API issues
  - Resolved Deno runtime compatibility issues by simplifying edge function and updating standard library version
  - Added proper authentication error handling with user-friendly messages for chat failures
  - Implemented robust fallback mechanism ensuring chat functionality remains reliable
  - Resolved React Syntax Highlighter TypeScript errors with proper type definitions and style imports
  - Stabilized chat functionality with working code block syntax highlighting and reliable AI responses
  - Fixed nested button HTML hydration error in DayHeader component by replacing button with accessible span element
- June 26, 2025. Fixed Perplexity API token overflow errors in chat system:
  - Identified token limit issue where conversation history exceeded 218,701 tokens vs 0 allowed limit
  - Switched chat system from Perplexity API back to OpenAI GPT-4o-mini for better reliability
  - Implemented proper token management by limiting conversation history to last 5 messages
  - Added conversation message truncation (200 chars max per message) to prevent overflow
  - Reduced system prompt length by condensing travel assistant instructions
  - Truncated trip context to 1500 characters maximum to stay within API limits
- Fixed duplicate chat responses by removing edge function database insertions and handling persistence in frontend
- Added proper user message persistence before API calls to ensure messages are saved
- Removed optimistic UI updates that were conflicting with real-time subscriptions
- June 26, 2025. Completed chat system fixes and restored full functionality:
  - Fixed chat responses not displaying in UI despite successful edge function processing
  - Added proper query invalidation to force chat data refresh after API responses
  - Enhanced real-time subscription with duplicate message prevention and error handling
  - Confirmed chat-summariser edge function is actively used for conversation memory management
  - Restored edge function database insertions while preventing frontend duplicates
  - Chat system now fully operational with OpenAI GPT-4o-mini, proper token limits, and reliable UI updates
- June 26, 2025. Fixed PDF export functionality with complete data inclusion:
  - Resolved TypeScript syntax error in pdfmake-export.ts preventing compilation
  - Corrected database table names from transportations→transportation and restaurant_reservations→reservations
  - Enhanced date matching logic with flexible string comparison for better item inclusion
  - Added comprehensive debugging logs to track data matching between items and days
  - Verified data fetching works correctly (3 transportation, 4 dining, 8 activities items)
  - PDF export now fully functional with all sections (accommodation, transportation, activities, dining) appearing correctly
- June 26, 2025. Enhanced transportation and dining dialogs with Google Places integration:
  - Fixed Google Maps JavaScript API performance warning by adding missing loading=async parameter
  - Created RestaurantContactInfo component displaying address, phone, website, and rating information
  - Enhanced dining reservation dialog to show restaurant details when selected from search results
  - Implemented LocationSearchInput component for transportation From/To fields with Google Places search
  - Added smart filtering: flights prioritize airports with codes, other transport searches general locations
  - Enhanced transportation dialog supports both Google Places results and custom text input
  - Fixed TypeScript enum constraints by removing unsupported "other" transportation type
  - All location search components now provide consistent user experience across dining and transportation
- June 26, 2025. Fixed transportation dialog field clearing and interaction issues:
  - Resolved issue where selecting Google Places results in one field would clear the other field
  - Added dialog interaction protection to prevent accidental closing during autocomplete selection
  - Improved state management with proper React state updates to preserve field values
  - Fixed TypeScript compilation errors in form field components
  - Enhanced form stability and user experience for transportation entry/editing
  - Transportation dialog now properly maintains both From and To locations during Google Places selection
- June 27, 2025. Successfully upgraded Vite from 5.4.14 to 6.3.5:
  - Updated Vite to version 6.3.5 with full compatibility verification
  - Updated @vitejs/plugin-react-swc to version 3.10.2 for Vite 6 compatibility
  - Confirmed development server runs properly on new version without issues
  - Verified build process works correctly with enhanced performance
  - No breaking changes or deprecation warnings detected in existing codebase
  - All existing functionality remains intact with improved build performance
  - Build system now benefits from Vite 6's improved tree-shaking and faster cold starts
- June 27, 2025. Implemented fixed, collapsible left-hand sidebar for trip view:
  - Created responsive Sidebar component with 280px width on desktop and mobile sheet drawer
  - Integrated trip-specific navigation (Timeline, AI Assistant, Vision Board, Budget, Booking)
  - Added proper tab switching functionality connected to existing TripTabs component
  - Implemented "Back to Trips" navigation and user profile/settings links
  - Added localStorage persistence for sidebar open/closed state
  - Used sand/earth color palette with proper z-index positioning and accessibility features
  - Created placeholder pages for new navigation destinations (Accommodations, Budget, Timeline, PackingList, Settings)
  - Updated Navigation component to include mobile hamburger menu trigger for trip pages
  - Sidebar appears fixed at left on desktop, hidden by default on mobile with swipe/tap access
  - Fixed sidebar disappearing issue by adding always-visible floating toggle button
  - Added expandable Timeline subsections with Trip Dates, Accommodations, and Transportation
  - Implemented hierarchical navigation with collapsible sections and chevron indicators
  - Enhanced TripTabs component to display detailed views for each subsection with real trip data
- June 27, 2025. Modified sidebar to be permanently visible on trip pages:
  - Removed main sidebar collapsible behavior for trip views - sidebar now always visible on desktop
  - Maintained collapsible functionality only for subcomponents (Timeline sections like Accommodations, Transportation)
  - Preserved mobile sheet drawer functionality for smaller screens
  - Kept original collapsible behavior for non-trip pages (like My Trips)
  - Fixed TypeScript errors and improved state management for mobile interactions
  - Sidebar now provides persistent navigation context throughout trip planning workflow
- June 27, 2025. Enhanced sidebar layout and added secondary sidebar functionality:
  - Added WanderLuxe logo to top of sidebar when in trip context for better branding
  - Modified navigation bar to avoid overlap with sidebar logo and center content properly
  - Implemented secondary sidebar that extends from main sidebar when clicking subcomponents
  - Added relevant content panels for Accommodations, Transportation, and Trip Dates subcomponents
  - Secondary sidebar displays at 320px width with Add buttons and existing item management
  - Includes close functionality and proper z-index layering for seamless user experience
  - Content area now centers properly in remaining space between sidebar(s) and screen edge
  - Subcomponent clicks keep main content on Timeline view instead of switching tabs
- June 27, 2025. Completed functional sidebar integration with existing dialog components:
  - Connected all Add/Edit buttons to existing AccommodationDialog and TransportationDialog components
  - Integrated proper state management for dialog opening/closing with sidebar interactions
  - Added placeholder Edit Dates dialog with proper modal structure for future implementation
  - Enhanced sidebar with full CRUD functionality for accommodations and transportation
  - Maintained consistent user experience between sidebar quick actions and main timeline interface
  - All sidebar buttons now provide immediate access to full-featured editing dialogs
  - Preserved existing form validation, Google Places integration, and database operations

## User Preferences

Preferred communication style: Simple, everyday language.
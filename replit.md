# WanderLuxe - Travel Planning Application

## Overview
WanderLuxe is a comprehensive travel planning web application built to enable users to create, manage, and share detailed travel itineraries. It includes features for accommodation booking, activity planning, expense tracking, and AI-powered travel assistance. The vision is to offer a seamless and intelligent platform for personalized travel experiences, simplifying the planning process and fostering collaboration among travelers.

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
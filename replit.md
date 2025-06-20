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

## User Preferences

Preferred communication style: Simple, everyday language.
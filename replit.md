# WanderLuxe - Travel Planning Application

## Overview

WanderLuxe is a comprehensive travel planning application built with React, TypeScript, and Supabase. The application enables users to create, manage, and share detailed trip itineraries with features including accommodation booking, restaurant reservations, activity planning, and AI-powered travel assistance. The platform uses a modern tech stack with real-time collaboration capabilities and granular permission management.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Tailwind CSS with Radix UI components for consistent design
- **State Management**: TanStack Query (React Query) for server state and caching
- **Routing**: React Router for client-side navigation
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Database**: PostgreSQL via Supabase with Row Level Security (RLS) policies
- **Authentication**: Supabase Auth with Google OAuth integration
- **Real-time**: Supabase subscriptions for live collaboration
- **Edge Functions**: Supabase Edge Functions for server-side logic
- **File Storage**: Supabase Storage for image uploads and attachments

### Data Storage Solutions
- **Primary Database**: Supabase PostgreSQL with comprehensive trip data model
- **Real-time Subscriptions**: Live updates for shared trips and collaborative editing
- **File Storage**: Supabase buckets for logos, trip images, and chat attachments
- **Caching**: TanStack Query for intelligent client-side caching

## Key Components

### Trip Management
- Trip creation with destination, dates, and cover images
- Multi-day itinerary planning with activities, accommodations, and dining
- Real-time collaboration with granular permission levels (read/edit)
- Trip sharing via email with notification system

### Activity Planning
- Day-by-day activity scheduling with drag-and-drop reordering
- Restaurant reservations with Google Places integration
- Transportation planning with cost tracking
- Hotel accommodation management with check-in/check-out handling

### User Experience
- AI-powered travel assistant using Perplexity API
- Google Maps integration for location search and place details
- Responsive design optimized for mobile and desktop
- Comprehensive form validation and error handling

### Collaboration Features
- Trip sharing with email-based invitations
- Permission-based access control (read-only vs edit access)
- Real-time updates across all shared users
- SendGrid email notifications for trip sharing

## Data Flow

### Trip Creation Flow
1. User creates trip with basic details (destination, dates, cover image)
2. System generates trip days automatically based on date range
3. Trip data stored in PostgreSQL with RLS policies applied
4. User can add activities, accommodations, and reservations to specific days

### Sharing Flow
1. Trip owner invites users via email with specified permission level
2. SendGrid sends notification email to invited user
3. Shared user gains access based on permission level
4. Real-time updates propagate to all users with access

### Real-time Updates
1. Supabase subscriptions monitor changes to trip-related tables
2. TanStack Query invalidates relevant queries on data changes
3. UI updates automatically without page refresh
4. Optimistic updates provide immediate feedback

## External Dependencies

### Third-Party Services
- **Supabase**: Database, authentication, real-time subscriptions, edge functions
- **Google Maps/Places API**: Location search and place details
- **SendGrid**: Email notifications for trip sharing
- **Perplexity AI**: Travel recommendations and AI assistance
- **Unsplash**: Stock photography for trip covers

### Key Libraries
- **@supabase/supabase-js**: Supabase client for database operations
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/react-***: Accessible UI components
- **framer-motion**: Smooth animations and transitions
- **date-fns**: Date manipulation and formatting
- **zod**: Schema validation for forms and API responses

## Deployment Strategy

### Production Environment
- **Hosting**: Replit with Cloud Run deployment target
- **Build Process**: Vite production build with TypeScript compilation
- **Environment Variables**: Supabase credentials managed through Replit Secrets
- **Domain**: wanderluxe.io with www subdomain support

### Development Environment
- **Local Development**: Vite dev server on port 8080
- **Database**: Supabase cloud instance with development environment
- **Hot Reload**: Vite HMR for instant feedback during development
- **TypeScript**: Strict type checking with comprehensive type definitions

### Database Management
- **Migrations**: SQL migration files for schema changes
- **RLS Policies**: Comprehensive row-level security for data protection
- **Indexes**: Optimized database indexes for performance
- **Backup**: Supabase automated backups and point-in-time recovery

## Changelog
- June 17, 2025. Switched from Bun to npm package manager due to dev server issues. Updated all packages to latest versions. Fixed security vulnerabilities. Created proper npm-based workflow configuration.
- June 15, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.
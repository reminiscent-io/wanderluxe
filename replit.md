# WanderLuxe Travel Planning Application

## Overview
WanderLuxe is a comprehensive travel planning platform built with React, TypeScript, and Supabase. The application enables users to create, manage, and share detailed travel itineraries with AI-powered assistance, real-time collaboration features, and sophisticated trip management capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theming
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: React Router v6 for client-side navigation
- **Authentication**: Supabase Auth with Google OAuth integration

### Backend Architecture
- **Database**: PostgreSQL via Supabase
- **Real-time Updates**: Supabase real-time subscriptions
- **Authentication**: Row-level security (RLS) policies
- **File Storage**: Supabase Storage for images and attachments
- **Edge Functions**: Supabase Functions for server-side logic

### Data Storage Solutions
- **Primary Database**: PostgreSQL with comprehensive schema including:
  - Users and profiles management
  - Trip creation and management
  - Day-by-day itinerary planning
  - Accommodations, transportation, and activities
  - Restaurant reservations and expenses
  - Trip sharing with granular permissions
- **File Storage**: Supabase Storage buckets for logos and chat attachments
- **Real-time Synchronization**: Automatic updates across shared trips

## Key Components

### Trip Management System
- **Trip Creation**: Multi-step form with destination, dates, and cover images
- **Itinerary Planning**: Day-by-day breakdown with activities, meals, and accommodations
- **Collaboration**: Real-time sharing with read/edit permission levels
- **Expense Tracking**: Multi-currency support with automatic conversion

### AI Integration
- **Travel Assistant**: Conversational AI powered by Perplexity AI and OpenAI
- **Content Generation**: Automated trip descriptions and recommendations
- **Image Generation**: AI-powered destination imagery
- **Smart Suggestions**: Context-aware travel recommendations

### Permission System
- **Granular Access Control**: Read-only vs edit permissions for shared trips
- **Email-based Sharing**: Share trips via email with automatic notifications
- **Real-time Synchronization**: Changes reflected instantly across all users

### External Service Integrations
- **Google Maps/Places**: Location search and place details
- **Unsplash**: High-quality destination photography
- **SendGrid**: Email notifications for trip sharing
- **Multiple AI Providers**: Perplexity AI and OpenAI for different use cases

## Data Flow

### Trip Creation Flow
1. User inputs destination and dates via form
2. AI generates trip content and suggested cover image
3. Trip days are automatically created based on date range
4. User can add accommodations, activities, and reservations
5. Real-time updates sync across all shared users

### Sharing Flow
1. Trip owner initiates sharing via email
2. Permission level is set (read/edit)
3. Email notification sent via SendGrid
4. Recipient gains access based on permission level
5. All changes sync in real-time via Supabase subscriptions

### AI Assistant Flow
1. User initiates conversation in trip context
2. Messages processed through AI providers
3. Responses include travel recommendations and suggestions
4. Context maintained throughout conversation
5. Integration with trip data for personalized advice

## External Dependencies

### Core Services
- **Supabase**: Database, authentication, real-time subscriptions, storage
- **Google Maps API**: Location services and place details
- **Perplexity AI**: Travel-specific AI assistance
- **OpenAI**: General AI capabilities and chat
- **SendGrid**: Transactional email delivery
- **Unsplash**: Stock photography API

### Development Tools
- **Vite**: Development server and build tool
- **ESLint**: Code linting and formatting
- **TypeScript**: Type safety and development experience
- **Tailwind CSS**: Utility-first styling framework

## Deployment Strategy

### Replit Environment
- **Primary Platform**: Replit with Node.js 20 runtime
- **Database**: PostgreSQL 16 module for local development
- **Package Manager**: Bun for improved performance
- **Development Server**: Vite dev server on port 8080
- **Preview Deployment**: Bun preview build

### Build Configuration
- **Production Build**: `bun run build` generates optimized assets
- **Preview Mode**: `bun run preview` for production testing
- **Environment Variables**: Managed through Replit Secrets
- **CORS Configuration**: Allowlist for multiple domains including production

### Security Considerations
- Row-level security policies for all database operations
- API key management through environment variables
- Secure authentication flow with proper session management
- Input validation and sanitization throughout the application

## Changelog
- June 17, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.
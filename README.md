# WanderLuxe - AI-Powered Travel Planning Platform

A comprehensive travel planning web application that transforms trip preparation into an engaging, personalized experience with intelligent insights and dynamic user interactions.

## ✨ Features

### 🗺️ Trip Planning & Management
- **Interactive Trip Creation**: Create detailed itineraries with destination search via Google Places API
- **Day-by-Day Timeline**: Visual trip timeline with drag-and-drop functionality
- **Smart Date Management**: Flexible arrival/departure date editing with automatic day generation
- **Real-time Collaboration**: Share trips with read/edit permissions and live updates

### 🏨 Comprehensive Booking Management
- **Accommodations**: Hotel booking tracking with check-in/check-out management
- **Transportation**: Flight, train, and ground transport organization with location search
- **Activities**: Time-based activity scheduling with cost tracking
- **Dining Reservations**: Restaurant booking management with Google Places integration

### 🤖 AI-Powered Assistant
- **Intelligent Chat**: OpenAI GPT-4o-mini powered travel assistant with trip context
- **Location-Specific Recommendations**: AI delivers authentic local insights and suggestions
- **Conversation Memory**: Smart context retention for natural, ongoing conversations

### 📋 Advanced Features
- **PDF Export**: Professional itinerary generation with all trip details
- **Budget Tracking**: Comprehensive expense management across all trip components
- **Responsive Sidebar**: Fixed navigation with expandable sections and secondary panels
- **Real-time Updates**: Live synchronization across all users and devices

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript for type-safe development
- **Vite 6.3.5** for optimized builds and fast development
- **Tailwind CSS** with custom sand/earth color palette
- **Shadcn/ui** components built on Radix UI primitives
- **TanStack Query** for efficient server state management
- **React Router** for client-side navigation

### Backend & Database
- **Supabase** for PostgreSQL database, authentication, and real-time features
- **Row Level Security (RLS)** for data access control
- **Supabase Edge Functions** for serverless API logic
- **Real-time Subscriptions** for live collaboration

### External Integrations
- **Google Places API** for location search and validation
- **OpenAI GPT-4o-mini** for AI chat assistance
- **SendGrid** for email notifications
- **Unsplash API** for trip imagery

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun runtime
- PostgreSQL database (via Supabase)
- Required API keys (see Environment Variables)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd wanderluxe

# Install dependencies
bun install

# Set up environment variables (see below)
cp .env.example .env

# Start development server
bun run dev
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Maps API
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# SendGrid (for email notifications)
SENDGRID_API_KEY=your_sendgrid_api_key

# Unsplash API (optional, for trip images)
VITE_UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

## 📁 Project Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── trip/           # Trip-specific components
│   │   ├── ui/             # Shadcn UI components
│   │   └── layout/         # Layout components
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Route components
│   ├── services/           # API and business logic
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript type definitions
├── server/                 # Express server routes
├── supabase/              # Database migrations and functions
└── migrations/            # SQL migration files
```

## 🎨 Design System

WanderLuxe uses a custom design system built on Tailwind CSS:

- **Colors**: Sand and earth tones for a luxury travel aesthetic
- **Typography**: Clean, readable fonts with proper hierarchy
- **Components**: Consistent spacing, shadows, and interactions
- **Responsive**: Mobile-first design with desktop enhancements

## 🔒 Security Features

- **Authentication**: Supabase Auth with Google OAuth support
- **Authorization**: Row Level Security policies for data access
- **Input Validation**: Zod schemas for form validation
- **CORS Configuration**: Secure API access controls

## 🧪 Development

### Available Scripts

```bash
# Development server
bun run dev

# Type checking
bun run type-check

# Linting
bun run lint

# Build for production
bun run build

# Preview production build
bun run preview
```

### Database Management

```bash
# Apply database migrations
bun run db:push

# Reset database (development only)
bun run db:reset
```

## 📱 User Interface

### Desktop Experience
- **Fixed Sidebar Navigation**: Persistent trip management interface
- **Secondary Panels**: Expandable sections for detailed component management
- **Timeline View**: Comprehensive day-by-day itinerary display
- **AI Chat**: Contextual travel assistant integration

### Mobile Experience
- **Responsive Design**: Optimized layouts for all screen sizes
- **Touch Interactions**: Swipe navigation and tap interactions
- **Mobile Sidebar**: Sheet drawer for navigation on smaller screens

## 🚀 Deployment

The application is optimized for deployment on modern cloud platforms:

1. **Build the application**: `bun run build`
2. **Set environment variables** in your deployment platform
3. **Deploy** to your preferred hosting service (Vercel, Netlify, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.

---

**WanderLuxe** - Transforming travel planning through intelligent design and AI-powered insights.
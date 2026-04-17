<div align="center">

# ✈️ WanderLuxe

### *Where Wanderlust Meets Luxury*

**The intelligent travel companion that transforms complex itineraries into seamless journeys.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Demo](#) • [Documentation](#) • [Report Bug](#) • [Request Feature](#)

</div>

---

## 🌍 About WanderLuxe

Planning extraordinary travel experiences shouldn't feel like work. WanderLuxe reimagines trip planning as a collaborative, intelligent, and effortless experience—where AI-powered insights meet real-time collaboration, and every detail finds its perfect place.

Born from the intersection of wanderlust and technology, WanderLuxe combines the sophistication of luxury travel planning with the power of modern web technologies. Whether you're orchestrating a multi-city European adventure or a relaxing coastal retreat, WanderLuxe keeps every booking, recommendation, and moment beautifully organized.

## ✨ What Makes WanderLuxe Special

### 🗺️ **Intelligent Trip Orchestration**
Design your journey with precision and ease. Our interactive timeline lets you visualize your entire trip at a glance, with drag-and-drop simplicity and automatic day generation as your plans evolve. Every destination, powered by Google Places, becomes a canvas for your adventure.

### 🏨 **All-in-One Booking Management**
Say goodbye to scattered confirmations and spreadsheet chaos:
- **🏨 Accommodations** — Track every hotel, Airbnb, or resort with check-in/check-out precision
- **✈️ Transportation** — Organize flights, trains, transfers, and car rentals in one place
- **🎭 Activities** — Schedule experiences with time blocks and cost tracking
- **🍽️ Dining** — Never miss a reservation with integrated restaurant management

### 🤖 **Your AI Assistant**
Powered by OpenAI GPT-4o-mini, the AI assistant translates confirmation screenshots and PDFs into evnts - reducing time to input new items.

### 👥 **Real-Time Collaboration**
Travel planning is better together. Share trips with travel companions, assign permissions (view or edit), and watch updates sync live across all devices. No more "Did you see my email?" moments—everyone stays in the loop, in real-time.

### 📄 **Professional PDF Exports**
Transform your itinerary into a beautifully formatted, print-ready PDF with one click. Perfect for offline access, sharing with travel companions, or keeping as a memento of journeys past.

### 💰 **Smart Budget Tracking**
Keep your finances as organized as your itinerary. Track expenses across accommodations, transportation, activities, and dining with multi-currency support and automatic exchange rate updates.

## 🏗️ Built With Excellence

WanderLuxe leverages modern, battle-tested technologies to deliver a fast, secure, and delightful experience:

<table>
<tr>
<td width="50%">

### Frontend
- ⚛️ **React 19** + **TypeScript** — Type-safe, component-driven UI
- ⚡ **Vite 6** — Lightning-fast builds and HMR
- 🎨 **Tailwind CSS** — Warm editorial palette with DM Serif Display & DM Sans typography
- 🧩 **Shadcn/ui** + **Radix UI** — Accessible, composable components
- 🔄 **TanStack Query** — Intelligent server state management

</td>
<td width="50%">

### Backend & Infrastructure
- 🗄️ **Supabase** — PostgreSQL database + Auth + Realtime
- 🔒 **Row Level Security** — Database-level access control
- ⚡ **Edge Functions** — Serverless Deno runtime
- 🔌 **WebSocket Subscriptions** — Live collaboration magic
- 📧 **SendGrid** — Transactional emails

</td>
</tr>
</table>

### 🌐 External APIs
**Google Places** • **OpenAI GPT-4o-mini** • **Unsplash** • **Exchange Rates**

---

## 💎 Technical Highlights

### Real-Time Magic ✨
Live collaboration powered by Supabase's WebSocket subscriptions. When one user adds an activity, everyone sees it instantly—no polling, no delays.

### Type Safety First 🛡️
End-to-end TypeScript with auto-generated types from the database schema. If it compiles, it (probably) works.

### Optimistic Updates ⚡
React Query's optimistic updates make the UI feel instant. Mutations update the cache immediately, then reconcile with the server in the background.

### Smart State Management 🧠
- **Server State**: TanStack Query handles caching, refetching, and background sync
- **UI State**: Local React hooks keep components lean and focused
- **Global Auth**: React Context with automatic token refresh

### PDF Generation 📄
1,200+ lines of pure client-side PDF generation using `pdfmake`. No server-side rendering, no external services—just beautiful, exportable itineraries.

### Database Security 🔐
Row Level Security (RLS) policies enforce access control at the PostgreSQL level. Users physically cannot query data they don't own—even with direct database access.

---

## 🚀 Quick Start

### Prerequisites
- **Bun** or **Node.js 18+** — Modern JavaScript runtime
- **Supabase Account** — For database and authentication
- **API Keys** — Google Places, OpenAI, SendGrid (see below)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/wanderluxe.git
cd wanderluxe

# Install dependencies (using Bun for blazing speed ⚡)
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys (see configuration below)

# Apply database migrations
bun run db:push

# Launch development server
bun run dev
```

Visit **http://localhost:5173** and start planning your next adventure! 🌴

### ⚙️ Configuration

Create a `.env` file in the project root:

```env
# Supabase (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google Places (Required for location search)
VITE_GOOGLE_MAPS_API_KEY=your-google-api-key

# Gemini (Required for AI assistant + travel-doc OCR)
# Model is hardcoded to gemini-2.5-flash in the Edge Function.
GEMINI_API_KEY=your-gemini-api-key

# SendGrid (Required for email notifications)
SENDGRID_API_KEY=SG.your-sendgrid-api-key

# Unsplash (Optional - for trip imagery)
VITE_UNSPLASH_ACCESS_KEY=your-unsplash-access-key
```

<details>
<summary><b>🔑 How to get API keys</b></summary>

- **Supabase**: Sign up at [supabase.com](https://supabase.com) and create a new project
- **Google Places**: Enable Places API in [Google Cloud Console](https://console.cloud.google.com)
- **OpenAI**: Get your API key from [platform.openai.com](https://platform.openai.com)
- **SendGrid**: Create a free account at [sendgrid.com](https://sendgrid.com)
- **Unsplash**: Register as a developer at [unsplash.com/developers](https://unsplash.com/developers)

</details>

## 📁 Project Structure

```
wanderluxe/
├── 📱 src/
│   ├── components/
│   │   ├── trip/              # 14 trip feature modules
│   │   │   ├── accommodation/ # Hotel & lodging management
│   │   │   ├── budget/        # Expense tracking & currencies
│   │   │   ├── chat/          # AI assistant interface
│   │   │   ├── timeline/      # Visual itinerary display
│   │   │   ├── transportation/# Flights, trains, car rentals
│   │   │   └── ...           # Activities, dining, vision board, etc.
│   │   ├── layout/           # AppLayout, Sidebar, Navigation
│   │   └── ui/               # 40+ Shadcn/ui components
│   ├── pages/                # Route components (MyTrips, TripDetails, etc.)
│   ├── hooks/                # Custom hooks (useSidebarState, useTripQuery, etc.)
│   ├── services/             # Business logic (PDF export, travelers, etc.)
│   ├── contexts/             # React Context (AuthContext)
│   ├── integrations/supabase/# Supabase client & auto-generated types
│   └── types/                # TypeScript definitions
├── ⚙️ server/
│   ├── index.ts             # Express server
│   └── routes/              # API endpoints (PDF, notifications, etc.)
├── 🗄️ supabase/
│   ├── functions/           # Edge Functions (Deno runtime)
│   │   ├── send-share-notification/
│   │   ├── google-places-proxy/
│   │   ├── parse-travel-doc/# AI-powered document parsing
│   │   └── ...
│   ├── migrations/          # SQL schema migrations
│   └── config.toml         # Supabase configuration
└── 📦 Other
    ├── .env                # Environment variables
    ├── vite.config.ts      # Vite configuration
    ├── tailwind.config.ts  # Design system configuration
    └── CLAUDE.md           # AI assistant instructions
```

## 📸 See It In Action

<div align="center">

<!-- Add your screenshots here -->
<img src="docs/screenshots/dashboard.png" alt="WanderLuxe Dashboard" width="800" />
<p><em>Trip dashboard with real-time collaboration</em></p>

<img src="docs/screenshots/timeline.png" alt="Timeline View" width="800" />
<p><em>Day-by-day timeline with drag-and-drop scheduling</em></p>

<img src="docs/screenshots/ai-chat.png" alt="AI Assistant" width="800" />
<p><em>AI-powered travel assistant with contextual recommendations</em></p>

</div>

> 💡 **Coming soon:** Interactive demo and video walkthrough

## 🎨 Design Philosophy

WanderLuxe's aesthetic is inspired by **1980s–90s editorial travel magazines** — warm, sophisticated, and intentional:

- 🎨 **Color Palette** — Warm cream backgrounds, sand/earth neutrals, sunset-orange accents, and bronze primary tones — no cold grays
- ✍️ **Typography** — DM Serif Display for editorial headings, DM Sans for clean body text, with careful tracking and hierarchy
- 🧩 **Components** — Rounded cards (`0.75rem`), brown-tinted warm shadows, grain texture overlays on hero sections
- 📱 **Responsive** — Mobile-first design that scales beautifully to desktop
- ✨ **Animations** — Delicate fade-in/slide-up transitions, parallax hero scroll, subtle image warmth filters

## 🔒 Security & Privacy

WanderLuxe is built with security at its core:

- 🔐 **Row Level Security (RLS)** — PostgreSQL policies enforce access control at the database level
- 🔑 **Supabase Auth** — Secure authentication with Google OAuth and auto-refresh tokens
- 🛡️ **Input Validation** — Zod schemas validate all user input on frontend and backend
- 🚫 **CORS Protection** — Strict API access controls prevent unauthorized requests
- 🔒 **Session Management** — Automatic session refresh with tab visibility detection
- 👥 **Permission System** — Granular view/edit permissions for shared trips

*Your travel data stays yours—accessible only to you and those you explicitly invite.*

## 🧪 Development Scripts

```bash
# 🚀 Development
bun run dev              # Start dev server (http://localhost:5173)
bun run type-check       # TypeScript type checking
bun run lint             # ESLint code quality checks

# 🏗️ Building
bun run build            # Production build
bun run build:dev        # Development build
bun run preview          # Preview production build (port 8080)

# 🗄️ Database
bun run db:push          # Apply Supabase migrations
bun run db:reset         # Reset database (⚠️ development only)
```

## 📱 User Experience Highlights

<table>
<tr>
<td width="50%">

### 🖥️ Desktop Experience
- **Fixed Sidebar** — Persistent navigation with expandable trip sections
- **Secondary Panels** — Deep-dive into accommodations, activities, dining
- **Timeline View** — Visual day-by-day itinerary at a glance
- **Multi-Panel Layout** — Work on multiple trip aspects simultaneously

</td>
<td width="50%">

### 📱 Mobile Experience
- **Touch-Optimized** — Large tap targets, swipe gestures
- **Bottom Sheets** — Native-feeling mobile interactions
- **Adaptive Layout** — Content reflows beautifully on all screens
- **Offline-Ready PDFs** — Take your itinerary anywhere

</td>
</tr>
</table>

## 🚀 Deployment

WanderLuxe is production-ready and optimized for modern hosting platforms:

### Recommended Platforms
- **Vercel** ⚡ (Recommended) — Zero-config deployment with automatic previews
- **Netlify** 🌐 — Simple deployment with built-in forms and redirects
- **Railway** 🚂 — Full-stack deployment including database
- **Fly.io** 🪰 — Global edge deployment

### Deployment Steps
```bash
# 1. Build the production bundle
bun run build

# 2. Set environment variables in your platform
# (Same variables as .env file)

# 3. Deploy! 🎉
# Most platforms auto-detect Vite and deploy seamlessly
```

**Note:** Supabase Edge Functions deploy automatically from your Supabase dashboard.

## 🤝 Contributing

We welcome contributions from developers who share our passion for elegant travel technology!

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** with clear messages: `git commit -m 'Add amazing feature'`
4. **Push** to your branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Write meaningful commit messages
- Add TypeScript types for new features
- Test your changes thoroughly
- Update documentation as needed

**Found a bug?** Open an issue with reproduction steps.
**Have an idea?** Start a discussion in GitHub Discussions.

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

You're free to use, modify, and distribute this software with attribution.

## 💬 Support & Community

- 🐛 **Bug Reports** — [Open an issue](https://github.com/your-username/wanderluxe/issues)
- 💡 **Feature Requests** — [Start a discussion](https://github.com/your-username/wanderluxe/discussions)
- 📧 **Contact** — Reach out to the maintainers
- 🌟 **Star** this repo if WanderLuxe helps you plan better trips!

---

<div align="center">

### ✨ *"The world is a book, and those who do not travel read only one page."* — St. Augustine

**WanderLuxe** — Where every journey begins with intention and ends with inspiration.

Made with ☕ and ✈️ by travelers, for travelers.

[Back to Top ↑](#-wanderluxe)

</div>

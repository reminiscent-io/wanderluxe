# AI Chat Feature Setup Guide

## Overview
The AI Chat assistant on the timeline page requires additional setup to function properly. This guide will help you configure and run the feature.

## Error You're Seeing
```
Failed to execute 'json' on 'Response': Unexpected end of JSON input
```

This error occurs because the backend API server is not running or properly configured.

## Prerequisites

### 1. Database Migration
The AI chat feature requires database tables that may not be set up yet.

**Apply the migration to your Supabase database:**
- Go to your [Supabase Dashboard](https://app.supabase.com)
- Navigate to: SQL Editor
- Copy the contents of `supabase/migrations/20260118000000_ai_assistant_schema.sql`
- Paste and execute the SQL in the SQL Editor

**What this migration creates:**
- `ai_chat_threads` - Stores conversation threads
- `ai_chat_messages` - Stores individual messages
- `ai_usage_logs` - Tracks daily AI message usage
- RLS policies for secure access
- Database functions: `increment_ai_usage`, `get_ai_usage`

### 2. Environment Variables
You need two additional environment variables:

#### For Replit (Recommended):
1. Click **Tools** → **Secrets**
2. Add these secrets:
   - `OPENAI_API_KEY` - Get from [OpenAI Platform](https://platform.openai.com/api-keys)
   - `SUPABASE_SERVICE_ROLE_KEY` - Get from Supabase Dashboard → Settings → API → service_role key (keep secret!)
   - (Optional) `OPENAI_CHAT_MODEL` - Default: `gpt-4o-mini`

#### For Local Development:
1. Copy `.env.example` to `.env`
2. Add the following to your `.env` file:
```bash
OPENAI_API_KEY=sk-...your-key-here
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
OPENAI_CHAT_MODEL=gpt-4o-mini  # Optional
```

**⚠️ Security Warning**: The `SUPABASE_SERVICE_ROLE_KEY` is extremely sensitive. Never expose it in client-side code or commit it to version control!

### 3. Start the Backend Server
The AI chat feature requires the Express backend server to be running alongside the Vite frontend.

#### Development Mode:
**Option 1: Run servers separately (recommended for debugging)**
```bash
# Terminal 1 - Frontend (Vite)
bun run dev

# Terminal 2 - Backend (Express API)
bun run dev:server
```

**Option 2: Check if both are running**
- Frontend (Vite) should be on port 8080
- Backend (Express) should be on port 5000
- Vite will automatically proxy `/api/*` requests to the backend

#### Production Mode:
```bash
# Build the frontend
bun run build

# Start the production server
bun run start
```

## How It Works

### Architecture
```
User clicks chat on timeline
    ↓
Frontend (React) sends POST to /api/trips/:tripId/assistant
    ↓
Vite dev server proxies to http://localhost:5000/api/...
    ↓
Express backend (server/index.ts)
    ↓
AI chat routes (server/routes/ai-chat.ts)
    ↓
    ├─ Validates user authentication
    ├─ Checks usage limits (free tier: 15 msgs/day)
    ├─ Fetches trip context from Supabase
    ├─ Calls OpenAI API (streaming response)
    └─ Saves messages to database
    ↓
Frontend receives Server-Sent Events (SSE) stream
    ↓
Chat UI updates in real-time
```

### Usage Limits
- **Free tier**: 15 messages per day per user
- **Pro tier**: Unlimited messages (requires subscription tier in profiles table)
- Limits reset at midnight UTC
- Usage tracked in `ai_usage_logs` table

### Conversation Storage
- Each user has a separate thread per trip
- Messages are stored in `ai_chat_messages`
- Threads can be cleared via the trash icon
- RLS policies ensure users can only see their own messages

## Troubleshooting

### "Failed to execute 'json' on 'Response'"
**Cause**: Backend server is not running or environment variables are missing
**Fix**:
1. Start the backend server: `bun run dev:server`
2. Verify environment variables are set
3. Check browser console and terminal for errors

### "Unauthorized" or "Access denied"
**Cause**: Authentication token is invalid or user doesn't have trip access
**Fix**:
1. Sign out and sign back in
2. Ensure you own the trip or it's been shared with you
3. Check Supabase auth session is valid

### "Daily limit reached"
**Cause**: User has sent 15 messages today (free tier limit)
**Fix**:
1. Wait until midnight UTC for reset
2. Upgrade to pro tier (update `subscription_tier` in profiles table)
3. Check `ai_usage_logs` table for current usage

### OpenAI API errors
**Cause**: Invalid API key, insufficient credits, or rate limits
**Fix**:
1. Verify `OPENAI_API_KEY` is valid at [OpenAI Platform](https://platform.openai.com/api-keys)
2. Check your OpenAI account has available credits
3. Review OpenAI usage limits for your account

### Database RPC function errors
**Cause**: Migration not applied or functions missing
**Fix**:
1. Re-run the migration SQL in Supabase dashboard
2. Verify functions exist: `increment_ai_usage`, `get_ai_usage`
3. Check function permissions in Supabase

## Testing

Once everything is set up:

1. Navigate to a trip's timeline page
2. The AI Assistant panel should appear on the right (desktop) or via the AI icon (mobile)
3. Try sending a message like: "What are the best restaurants near my hotel?"
4. You should see a streaming response from the AI
5. The message should be saved and persist after refresh

## API Endpoints

The AI chat feature uses these endpoints:

- `GET /api/trips/:tripId/assistant/messages` - Fetch chat history
- `POST /api/trips/:tripId/assistant` - Send message (SSE stream)
- `GET /api/trips/:tripId/assistant/usage` - Check usage limits
- `DELETE /api/trips/:tripId/assistant/messages` - Clear chat history

## Support

If you continue to have issues:
1. Check browser DevTools → Console for errors
2. Check terminal running `dev:server` for backend errors
3. Verify all migrations are applied in Supabase
4. Ensure all environment variables are correctly set
5. Test OpenAI API key directly via their playground

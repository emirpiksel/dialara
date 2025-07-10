# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SaaS call management system with dual functionality:
- **CRM Mode**: Manages inbound & outbound calls, leads, and agent interactions for real company operations.
- **Training Mode**: Provides AI-powered training simulations for staff using conversation scenarios

The system integrates with Vapi.ai & Twilio for voice communication and uses Supabase for authentication and data storage.

## Development Commands

### Frontend (React/Vite)
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend (FastAPI)
```bash
# Install Python dependencies (if requirements.txt exists)
pip install fastapi uvicorn python-dotenv requests textblob supabase

# Run FastAPI server
python backend/main.py
# or
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Webhook Server
```bash
# Start webhook server using npm script (uses localtunnel)
npm run webhook

# Alternative: Start outbound call scheduler
cd server
node scheduleOutboundCalls.cjs

# Expose webhook endpoint (temporary setup)
ngrok http http://localhost:8000
# Note: Currently using temporary ngrok URL for webhook - will be replaced with permanent domain
```

## Architecture

### Frontend Structure
- **React 18** with TypeScript and Vite
- **State Management**: Zustand stores for auth, calls, leads, training
- **Routing**: React Router with protected routes
- **UI**: Tailwind CSS with custom components
- **Mode Switching**: Toggle between CRM and Training modes via `useAppMode` store

### Key Frontend Components
- `Layout.tsx` - Main CRM layout wrapper
- `TrainingLayout.tsx` - Training mode layout wrapper  
- `ModeSwitcher.tsx` - Toggle between CRM/Training modes
- `ProtectedRoute.tsx` - Route protection based on auth state

### Backend Structure
- **FastAPI** server handling webhooks and API endpoints
- **Dual webhook processing**: Automatically detects and routes training vs regular calls
- **Enhanced scoring system**: Detailed performance analysis for training calls
- **Supabase integration**: Authentication and database operations

### Database Tables
- `users` - User authentication and roles
- `ai_agents` - Production AI agents for real calls
- `training_agents` - Training-specific agents
- `call_logs` - Regular outbound/inbound call records
- `training_sessions` - Training call records with scoring
- `leads` - Lead management for CRM
- `training_modules` - Training content organization
- `training_scenarios` - Individual training scenarios

### State Management
- `auth.ts` - Authentication state, user roles (admin/superadmin)
- `useAppMode.ts` - CRM/Training mode persistence
- `calls.ts` - Call history and management
- `leads.ts` - Lead management state
- `training.ts` - Training progress and sessions

### Key Dependencies
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router, Recharts/Chart.js, Vapi.ai Web SDK
- **Backend**: FastAPI, Uvicorn, TextBlob (sentiment analysis), Requests, python-dotenv, Supabase Python client
- **Database**: Supabase (PostgreSQL)
- **Voice**: Vapi.ai SDK, Twilio integration
- **Development**: ESLint, Autoprefixer, PostCSS, Localtunnel (for webhook development)

## Configuration

### Environment Variables
```bash
# Frontend (.env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_VAPI_API_KEY=your_vapi_api_key

# Backend (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
VAPI_PRIVATE_KEY=your_vapi_private_key
VAPI_ASSISTANT_ID=your_vapi_assistant_id
WEBHOOK_URL=your_webhook_url
```

### Vite Configuration
- **Proxy**: `/api` and `/log-call` routes proxy to backend at `http://127.0.0.1:8000`
- **Host**: Configured for `127.0.0.1` (critical for proper operation)
- **Path alias**: `@` maps to `./src`

## Key Features

### Webhook Processing
The `/webhook` endpoint automatically:
1. Detects call type (training vs regular) by checking for existing training sessions
2. Routes to appropriate handler:
   - Training calls → Enhanced scoring and feedback system
   - Regular calls (inbound & outbound calls) → Basic call logging with sentiment analysis

### Training System
- **Scenario-based training**: Users practice with AI in structured scenarios
- **Enhanced scoring**: Multi-factor scoring system with detailed feedback
- **XP system**: Points and bonuses for performance
- **Progress tracking**: Session history and performance analytics

### Call Management
- **Outbound calls**: Automated calling through Vapi integration & Twilio
- **Inbound calls**: Using phone numbers from Vapi integration
- **Lead management**: Track and manage prospect information
- **Call logging**: Comprehensive call history and analytics. Seperate tables for regular calls and training calls
- **Real-time updates**: WebSocket-like updates through Supabase

## Testing

No specific test framework is configured. Check with the team for preferred testing approach.

## Development Notes

### Important Considerations
- StrictMode is intentionally disabled in main.tsx to prevent double useEffect calls
- Host configuration in vite.config.ts is critical and should remain as 127.0.0.1
- The system uses a dual-table approach: `call_logs` for regular calls, `training_sessions` for training
- Universal agent ID is used for training: `17c2b88e-097d-4b53-aea3-b4871cb48339`

### Key API Endpoints
- `GET /log-call` - Retrieve training call data
- `POST /webhook` - Handle Vapi webhook events (dual processing for training/regular calls)
- `GET /api/getCallLogs` - Fetch regular call logs
- `GET /api/getTrainingCalls` - Fetch training sessions
- `POST /api/start-simulation` - Start training simulation
- `GET /api/getUserStats/{user_id}` - Get user training statistics
- `GET /api/call-status/{call_id}` - Quick status check for call processing

### Authentication Flow
1. Users sign in through Supabase Auth
2. First user becomes superadmin, subsequent users become admin
3. Role-based access control throughout the application
4. Protected routes based on authentication state

### Database Architecture Notes
- `call_logs` table: Stores all regular inbound/outbound calls with basic sentiment analysis
- `training_sessions` table: Stores training calls with enhanced scoring and XP system
- `training_scenarios` table: Contains AI conversation scenarios with difficulty levels
- `leads` table: Manages prospects for outbound calling campaigns
- Foreign key relationships maintain data integrity across user sessions and call records

### Common Development Workflows

#### Setting up development environment
1. Install dependencies: 
   - Frontend: `npm install`
   - Backend: `pip install fastapi uvicorn python-dotenv requests textblob supabase`
2. Set up environment variables (see Configuration section)
3. Start backend: `python backend/main.py`
4. Start frontend: `npm run dev`
5. For webhook testing: 
   - Option 1: Use `npm run webhook` (uses localtunnel)
   - Option 2: Use ngrok with `ngrok http http://localhost:8000`
   - Copy the provided public URL and update webhook URL in Vapi dashboard

#### Working with the dual-mode system
- Use `useAppMode` store to check current mode (CRM vs Training)
- Training components are in `src/pages/training/` and `src/components/Training*`
- CRM components are in main `src/pages/` and `src/components/` directories
- Mode switching affects layout, navigation, and available features

#### Adding new training scenarios
1. Insert into `training_scenarios` table with module_id reference
2. Define `prompt_template` and `first_message` for AI agent
3. Set appropriate difficulty level (1-10)
4. Test with training simulator before deployment

#### Debugging webhook issues
- Check `webhook_raw.log` for incoming webhook payloads
- Verify call_id exists in `training_sessions` for training calls
- Monitor backend logs for webhook processing errors
- Use `/api/call-status/{call_id}` endpoint to check processing status

#### Common troubleshooting steps
1. **Vite host configuration**: Ensure `vite.config.ts` host is set to `127.0.0.1` (not `localhost`)
2. **Backend not starting**: Check if all Python dependencies are installed
3. **Webhook not receiving data**: Verify the public URL is correctly configured in Vapi dashboard
4. **Database connection issues**: Ensure Supabase credentials are correct in `.env` file
5. **Training mode not working**: Check if `training_sessions` table exists and has correct schema

## SUPABASE SCHEMAS AND INFORMATION ABOUT TABLES: Below is the full database schema including columns, foreign key relationships, and indexes.
## Supabase Table Structures

[
  {
    "table_schema": "public",
    "table_name": "ai_agents",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "ai_agents",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "ai_agents",
    "column_name": "team_id",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "ai_agents",
    "column_name": "phone_number",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "ai_agents",
    "column_name": "vapi_agent_id",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "ai_agents",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "ai_agents",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "ai_agents",
    "column_name": "model_provider",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'openai'::text"
  },
  {
    "table_schema": "public",
    "table_name": "ai_agents",
    "column_name": "model_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'gpt-4o'::text"
  },
  {
    "table_schema": "public",
    "table_name": "ai_agents",
    "column_name": "first_message",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'Hello, how can I assist you today?'::text"
  },
  {
    "table_schema": "public",
    "table_name": "ai_agents",
    "column_name": "last_assigned",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP"
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "id",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "call_id",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "agent_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "clinic_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "caller_number",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "call_type",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "duration",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "recording_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "transcript",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'completed'::text"
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "timestamp",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "ended_reason",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "summary",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "messages",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "twilio_sid",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "dialed_number",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "topic_summary",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "score",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "sentiment",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "call_start",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "call_end",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "provider",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "issues_detected",
    "data_type": "json",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "call_logs",
    "column_name": "feedback",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "event_logs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "event_logs",
    "column_name": "call_id",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "event_logs",
    "column_name": "event_type",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "event_logs",
    "column_name": "payload",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "event_logs",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "timezone('utc'::text, now())"
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "clinic_name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "phone_number",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": "'new'::text"
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "source",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "notes",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "last_contact_date",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "call_status",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'pending'::text"
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "agent_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "leads",
    "column_name": "vapi_agent_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "logs",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "logs",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "logs",
    "column_name": "action",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "logs",
    "column_name": "details",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "logs",
    "column_name": "timestamp",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "outbound_call_attempts",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "outbound_call_attempts",
    "column_name": "lead_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "outbound_call_attempts",
    "column_name": "agent_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "outbound_call_attempts",
    "column_name": "status",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "outbound_call_attempts",
    "column_name": "call_id",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "outbound_call_attempts",
    "column_name": "error_message",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "outbound_call_attempts",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "team_members",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "team_members",
    "column_name": "team_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "team_members",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "team_members",
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'user'::text"
  },
  {
    "table_schema": "public",
    "table_name": "teams",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "teams",
    "column_name": "admin_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "teams",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_agents",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "training_agents",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_agents",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_agents",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "training_agents",
    "column_name": "module_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_agents",
    "column_name": "vapi_agent_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "agent_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "transcript",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "duration",
    "data_type": "double precision",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "score",
    "data_type": "double precision",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "call_status",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'completed'::text"
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "analysis",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "recording_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "sentiment",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'neutral'::text"
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "feedback",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "module_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "module_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "started_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "ended_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "summary",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_calls",
    "column_name": "scenario_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_categories",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "training_categories",
    "column_name": "name",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_categories",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_categories",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "training_feedback",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "training_feedback",
    "column_name": "session_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_feedback",
    "column_name": "type",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_feedback",
    "column_name": "message",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_feedback",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "training_leaderboard",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "training_leaderboard",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_leaderboard",
    "column_name": "xp",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_schema": "public",
    "table_name": "training_leaderboard",
    "column_name": "rank",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_schema": "public",
    "table_name": "training_leaderboard",
    "column_name": "updated_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "training_modules",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "training_modules",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_modules",
    "column_name": "persona_type",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_modules",
    "column_name": "difficulty",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "1"
  },
  {
    "table_schema": "public",
    "table_name": "training_modules",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "training_modules",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_modules",
    "column_name": "category_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_scenarios",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "training_scenarios",
    "column_name": "module_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_scenarios",
    "column_name": "title",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_scenarios",
    "column_name": "description",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_scenarios",
    "column_name": "difficulty",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "1"
  },
  {
    "table_schema": "public",
    "table_name": "training_scenarios",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "training_scenarios",
    "column_name": "prompt_template",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_scenarios",
    "column_name": "first_message",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_scenarios",
    "column_name": "persona_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "user_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "module_id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "transcript",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "duration",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "score",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "sentiment",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "started_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "ended_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "call_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "feedback",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "passed",
    "data_type": "boolean",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "recording_url",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "scenario_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "summary",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "ended_reason",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "agent_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "xp",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "bonus_xp",
    "data_type": "integer",
    "is_nullable": "YES",
    "column_default": "0"
  },
  {
    "table_schema": "public",
    "table_name": "training_sessions",
    "column_name": "scoring_breakdown",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "users",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "users",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "users",
    "column_name": "clinic_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "users",
    "column_name": "created_at",
    "data_type": "timestamp without time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  },
  {
    "table_schema": "public",
    "table_name": "users",
    "column_name": "role",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": "'admin'::text"
  },
  {
    "table_schema": "public",
    "table_name": "users",
    "column_name": "admin_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "users",
    "column_name": "full_name",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "users",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "waitlist",
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()"
  },
  {
    "table_schema": "public",
    "table_name": "waitlist",
    "column_name": "email",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "waitlist",
    "column_name": "source",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "table_schema": "public",
    "table_name": "waitlist",
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "now()"
  }
]


## Supabase Foreign Keys


[
  {
    "table": "ai_agents",
    "column": "user_id",
    "foreign_table": "users",
    "foreign_column": "id"
  },
  {
    "table": "call_logs",
    "column": "agent_id",
    "foreign_table": "ai_agents",
    "foreign_column": "id"
  },
  {
    "table": "leads",
    "column": "user_id",
    "foreign_table": "users",
    "foreign_column": "id"
  },
  {
    "table": "logs",
    "column": "user_id",
    "foreign_table": "users",
    "foreign_column": "id"
  },
  {
    "table": "team_members",
    "column": "team_id",
    "foreign_table": "teams",
    "foreign_column": "id"
  },
  {
    "table": "team_members",
    "column": "user_id",
    "foreign_table": "users",
    "foreign_column": "id"
  },
  {
    "table": "teams",
    "column": "admin_id",
    "foreign_table": "users",
    "foreign_column": "id"
  },
  {
    "table": "training_agents",
    "column": "module_id",
    "foreign_table": "training_modules",
    "foreign_column": "id"
  },
  {
    "table": "training_calls",
    "column": "module_id",
    "foreign_table": "training_modules",
    "foreign_column": "id"
  },
  {
    "table": "training_feedback",
    "column": "session_id",
    "foreign_table": "training_sessions",
    "foreign_column": "id"
  },
  {
    "table": "training_leaderboard",
    "column": "user_id",
    "foreign_table": "users",
    "foreign_column": "id"
  },
  {
    "table": "training_modules",
    "column": "category_id",
    "foreign_table": "training_categories",
    "foreign_column": "id"
  },
  {
    "table": "training_scenarios",
    "column": "module_id",
    "foreign_table": "training_modules",
    "foreign_column": "id"
  },
  {
    "table": "training_sessions",
    "column": "module_id",
    "foreign_table": "training_modules",
    "foreign_column": "id"
  },
  {
    "table": "training_sessions",
    "column": "user_id",
    "foreign_table": "users",
    "foreign_column": "id"
  },
  {
    "table": "outbound_call_attempts",
    "column": "lead_id",
    "foreign_table": "leads",
    "foreign_column": "id"
  },
  {
    "table": "outbound_call_attempts",
    "column": "agent_id",
    "foreign_table": "ai_agents",
    "foreign_column": "id"
  }
]

## Supabase Indexes

[
  {
    "table_name": "ai_agents",
    "index_name": "ai_agents_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "ai_agents",
    "index_name": "idx_ai_agents_user_id",
    "column_name": "user_id",
    "index_method": "btree"
  },
  {
    "table_name": "call_logs",
    "index_name": "call_logs_call_id_idx",
    "column_name": "call_id",
    "index_method": "btree"
  },
  {
    "table_name": "call_logs",
    "index_name": "call_logs_call_id_key",
    "column_name": "call_id",
    "index_method": "btree"
  },
  {
    "table_name": "call_logs",
    "index_name": "call_logs_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "event_logs",
    "index_name": "event_logs_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "leads",
    "index_name": "idx_leads_clinic_name",
    "column_name": "clinic_name",
    "index_method": "btree"
  },
  {
    "table_name": "leads",
    "index_name": "idx_leads_phone_number",
    "column_name": "phone_number",
    "index_method": "btree"
  },
  {
    "table_name": "leads",
    "index_name": "idx_leads_status",
    "column_name": "status",
    "index_method": "btree"
  },
  {
    "table_name": "leads",
    "index_name": "idx_leads_user_id",
    "column_name": "user_id",
    "index_method": "btree"
  },
  {
    "table_name": "leads",
    "index_name": "leads_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "logs",
    "index_name": "logs_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "outbound_call_attempts",
    "index_name": "outbound_call_attempts_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "team_members",
    "index_name": "team_members_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "teams",
    "index_name": "teams_name_key",
    "column_name": "name",
    "index_method": "btree"
  },
  {
    "table_name": "teams",
    "index_name": "teams_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "training_agents",
    "index_name": "training_agents_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "training_agents",
    "index_name": "unique_vapi_agent_id",
    "column_name": "vapi_agent_id",
    "index_method": "btree"
  },
  {
    "table_name": "training_calls",
    "index_name": "training_calls_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "training_categories",
    "index_name": "training_categories_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "training_feedback",
    "index_name": "training_feedback_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "training_leaderboard",
    "index_name": "training_leaderboard_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "training_leaderboard",
    "index_name": "training_leaderboard_user_id_unique",
    "column_name": "user_id",
    "index_method": "btree"
  },
  {
    "table_name": "training_modules",
    "index_name": "training_modules_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "training_scenarios",
    "index_name": "training_scenarios_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "training_sessions",
    "index_name": "idx_training_sessions_call_id",
    "column_name": "call_id",
    "index_method": "btree"
  },
  {
    "table_name": "training_sessions",
    "index_name": "idx_training_sessions_created_at",
    "column_name": "created_at",
    "index_method": "btree"
  },
  {
    "table_name": "training_sessions",
    "index_name": "idx_training_sessions_user_id",
    "column_name": "user_id",
    "index_method": "btree"
  },
  {
    "table_name": "training_sessions",
    "index_name": "training_sessions_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "training_sessions",
    "index_name": "unique_call_id",
    "column_name": "call_id",
    "index_method": "btree"
  },
  {
    "table_name": "users",
    "index_name": "users_email_key",
    "column_name": "email",
    "index_method": "btree"
  },
  {
    "table_name": "users",
    "index_name": "users_pkey",
    "column_name": "id",
    "index_method": "btree"
  },
  {
    "table_name": "waitlist",
    "index_name": "waitlist_email_key",
    "column_name": "email",
    "index_method": "btree"
  },
  {
    "table_name": "waitlist",
    "index_name": "waitlist_pkey",
    "column_name": "id",
    "index_method": "btree"
  }
]
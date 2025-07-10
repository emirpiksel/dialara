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
# Set up Python virtual environment
python -m venv venv
source venv/bin/activate   # Mac/Linux
# venv\Scripts\activate    # Windows
# .\venv\Scripts\Activate.ps1 # PowerShell

# Install Python dependencies from requirements.txt
pip install -r requirements.txt

# Run FastAPI server
python backend/main.py
# or
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Additional Scripts
```bash
# Set up and run agent assist overlay (for CRM mode)
npm run overlay:install    # Install overlay dependencies
npm run overlay:dev        # Start overlay in development mode

# Outbound call scheduler
cd server
node scheduleOutboundCalls.cjs

# Expose webhook endpoint for development (choose one)
ngrok http http://localhost:8000
# or use localtunnel via npm script:
npm run webhook

# Test overlay integration
npm run test-overlay
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
- **Centralized configuration**: `backend/config.py` manages all settings with type safety
- **Dual webhook processing**: Automatically detects and routes training vs regular calls
- **Enhanced scoring system**: Detailed performance analysis for training calls with configurable weights
- **Supabase integration**: Authentication and database operations
- **Modular services**: Separate services for scoring, gamification, AI analysis, and webhook handling

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
- **Backend**: FastAPI 0.115.11, Uvicorn 0.34.0, TextBlob (sentiment analysis), Requests 2.31.0, python-dotenv 1.0.1, Pandas 2.0.3, python-multipart 0.0.6, openpyxl 3.1.2, Supabase Python client
- **Database**: Supabase (PostgreSQL)
- **Voice**: Vapi.ai SDK, Twilio integration
- **Agent Assist Overlay**: Electron, OpenAI API (for real-time suggestions)
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
VAPI_WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_URL=your_webhook_url
UNIVERSAL_AGENT_ID=17c2b88e-097d-4b53-aea3-b4871cb48339  # Default training agent

# Agent Assist Overlay (electron-overlay/.env)
OPENAI_API_KEY=your_openai_api_key
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
- **Call logging**: Comprehensive call history and analytics. Separate tables for regular calls and training calls
- **Real-time updates**: WebSocket-like updates through Supabase

### Agent Assist Overlay System
- **AI-powered suggestions**: Real-time contextual suggestions during live CRM calls
- **Objection handling**: AI-generated responses to common sales objections
- **Call checklist**: Dynamic checklist that adapts to call type and lead status
- **Keyboard shortcuts**: Global hotkeys for quick access (Ctrl+Shift+H, S, O, C)
- **Live transcript analysis**: Automatically triggers suggestions based on conversation flow
- **CRM integration**: Seamlessly integrates with existing Dialara stores and data flow
- **Electron overlay**: Lightweight overlay visible only to agents, not captured in recordings

### AI Function Call Tools
- **Database operations**: AI can lookup leads, update lead status, and retrieve call history during conversations
- **Task automation**: Create follow-up tasks, log call outcomes, and schedule meetings automatically
- **Pricing calculations**: AI provides instant pricing based on customer requirements and type
- **Calendar integration**: Schedule meetings and find available time slots via AI function calls
- **Knowledge base search**: AI accesses uploaded documents to answer customer questions
- **CRM automation**: Update lead statuses and log call outcomes without manual intervention

## Testing

No specific test framework is configured. Check with the team for preferred testing approach.

## Development Notes

### Important Considerations
- StrictMode is intentionally disabled in main.tsx to prevent double useEffect calls
- Host configuration in vite.config.ts is critical and should remain as 127.0.0.1
- The system uses a dual-table approach: `call_logs` for regular calls, `training_sessions` for training
- Universal agent ID is used for training: `17c2b88e-097d-4b53-aea3-b4871cb48339`
- Backend configuration is centralized in `backend/config.py` with validation - ensure all required env vars are set
- The scoring system uses configurable weights and thresholds defined in `ScoringConfig`

### Key API Endpoints
- `GET /log-call` - Retrieve training call data
- `POST /webhook` - Handle Vapi webhook events (dual processing for training/regular calls)
- `GET /api/getCallLogs` - Fetch regular call logs
- `GET /api/getTrainingCalls` - Fetch training sessions
- `POST /api/start-simulation` - Start training simulation
- `GET /api/getUserStats/{user_id}` - Get user training statistics
- `GET /api/call-status/{call_id}` - Quick status check for call processing
- `POST /api/vapi/function-call` - Handle Vapi AI function calls for database operations
- `GET /api/vapi/functions` - Get available function definitions for Vapi assistant setup
- `POST /api/vapi/test-function` - Test function calls with sample data

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
1. **Install dependencies**:
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies (in virtual environment)
   python -m venv venv
   source venv/bin/activate  # Mac/Linux
   pip install -r requirements.txt
   
   # Agent Assist Overlay dependencies
   npm run overlay:install
   ```

2. **Set up environment variables** (see Configuration section above)

3. **Start all services**:
   ```bash
   # Terminal 1: Backend
   source venv/bin/activate
   python backend/main.py
   
   # Terminal 2: Frontend
   npm run dev
   
   # Terminal 3: Agent Assist Overlay (optional, CRM mode only)
   npm run overlay:dev
   ```

4. **Webhook setup for development**:
   - Option 1: `npm run webhook` (uses localtunnel)
   - Option 2: `ngrok http http://localhost:8000`
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
6. **Agent assist overlay not connecting**: 
   - Verify overlay is running (`cd electron-overlay && npm run dev`)
   - Check port 8765 is available
   - Ensure you're in CRM mode (not Training mode)
   - Test connection with: `node electron-overlay/test/test-integration.js`
7. **AI suggestions not working**: Verify OpenAI API key in `electron-overlay/.env`

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

## Multi-Language Support (CF-9)

The system now supports multiple languages for both UI and voice interactions:

**Supported Languages:**
- English (en) - Default language with full UI support
- Turkish (tr) - Complete UI translation and voice support  
- Spanish (es) - Vapi voice configuration support

**UI Internationalization:**
- Language selector component in both CRM and Training layouts
- Comprehensive translation system with context-aware strings
- Automatic language detection from browser preferences  
- Persistent language preferences in localStorage and backend database
- Graceful fallback to English for untranslated content

**Voice/STT Configuration:**
- Language-specific Vapi assistant configurations with appropriate voice providers
- Multi-language STT (Speech-to-Text) settings optimized for Deepgram
- Language-specific system messages and greetings for AI assistants
- Voice provider configuration (11labs) with language-appropriate voice IDs

**API Endpoints:**
- `GET /api/language/available` - Get list of available languages
- `GET /api/language/config/{language_code}` - Get language-specific Vapi configuration  
- `POST /api/language/set-default` - Set user's default language preference
- `GET /api/language/user-preference/{user_id}` - Get user's language preference
- `POST /api/language/create-assistant` - Generate multilingual assistant configuration

**Integration:**
Language preferences are synchronized between frontend and backend, with backend database storage for user preferences. Vapi assistants can be configured with language-specific voices, transcription settings, and localized system messages for different regions.

**Files Modified:**
- `src/lib/i18n.ts` - Core internationalization system
- `src/components/LanguageSelector.tsx` - Language switching UI component
- `src/components/CRMLayout.tsx` & `TrainingLayout.tsx` - Language selector integration
- `backend/vapi_functions.py` - Multi-language Vapi configurations  
- `backend/main.py` - Language preference API endpoints
- `src/pages/Analytics.tsx` - Translated UI labels (example implementation)
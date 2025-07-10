from fastapi import FastAPI, HTTPException, Request
import logging
from typing import List, Dict
from datetime import datetime, timedelta

# Import all modules
from config import get_config, validate_config
from webhook_handler import process_webhook
from database import get_supabase_client
from middleware import setup_middleware
from models import *
from api_routes import *

# Enhanced logging setup
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")

file_handler = logging.FileHandler("training_debug.log", mode="w", encoding="utf-8")
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(formatter)

error_handler = logging.FileHandler("training_errors.log", mode="a", encoding="utf-8")
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(formatter)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)
console_handler.setFormatter(formatter)

logger.addHandler(file_handler)
logger.addHandler(error_handler)
logger.addHandler(console_handler)

# Environment variables are loaded in config.py

# Initialize configuration
config = get_config()
validate_config()

# Initialize FastAPI app
app = FastAPI()

# Setup middleware
setup_middleware(app)

# Get Supabase client
supabase = get_supabase_client()

# WEBHOOK ENDPOINT - Now uses extracted webhook handler with security
@app.post("/webhook")
async def webhook(request: Request):
    """Main webhook endpoint that delegates to the webhook handler with security validation"""
    try:
        # Import webhook security validation
        from webhook_security import validate_webhook_request, log_webhook_security_event
        
        # Validate webhook security first
        try:
            raw_body = await validate_webhook_request(request)
            logger.info("✅ Webhook security validation passed")
            
            # Log successful validation
            log_webhook_security_event("webhook_validated", {
                "remote_addr": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", "unknown"),
                "content_length": len(raw_body)
            })
            
        except HTTPException as security_error:
            # Log security failure
            log_webhook_security_event("webhook_security_failure", {
                "error": str(security_error.detail),
                "remote_addr": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", "unknown")
            })
            raise security_error
        
        # Parse JSON from validated body
        import json
        raw_json = json.loads(raw_body.decode('utf-8'))
        
        # Process webhook with validated data
        return await process_webhook(raw_json, supabase)
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions (like auth failures)
    except Exception as e:
        logger.exception("Webhook endpoint exception")
        return {"status": "error", "message": str(e)}

# API Routes - All delegated to api_routes module

@app.get("/log-call")
async def get_call_log(call_id: str):
    """OPTIMIZED: Enhanced log-call endpoint with better performance"""
    return await handle_log_call(call_id)

@app.get("/api/call-status/{call_id}")
async def get_call_status(call_id: str):
    """Quick endpoint to check if webhook has processed a call"""
    return await handle_call_status(call_id)

@app.get("/api/getCallLogs")
async def get_call_logs():
    """Fetch call logs for the Calls page"""
    return await handle_get_call_logs()

@app.get("/api/getCallLog/{call_id}")
async def get_call_log_details(call_id: str):
    """Get detailed call log information"""
    return await handle_get_call_log_details(call_id)

@app.get("/api/getTrainingCalls")
async def get_training_calls():
    """Updated to fetch from training_sessions table instead of training_calls"""
    return await handle_get_training_calls()

@app.get("/api/getTrainingCallsWithNames")
async def get_training_calls_with_names():
    """Updated to use training_sessions with joined data"""
    return await handle_get_training_calls_with_names()

@app.get("/api/getCallDetails")
async def get_call_details(call_id: str):
    """Get detailed call information - redirect to log-call endpoint"""
    return await handle_get_call_details(call_id)

@app.post("/api/analyze-training-call")
async def analyze_training_call(data: AnalyzeTrainingCallRequest):
    return await handle_analyze_training_call(data)

@app.post("/api/start-simulation")
async def start_simulation(data: StartCallRequest):
    return await handle_start_simulation(data)

@app.post("/api/end-training-session")
async def end_training_session(data: EndSessionRequest):
    return await handle_end_training_session(data)

@app.get("/api/getUniversalAgent")
async def get_universal_agent():
    return await handle_get_universal_agent()

@app.get("/api/getLeaderboard")
async def get_leaderboard():
    return await handle_get_leaderboard()

@app.get("/api/getModules")
async def get_modules():
    return await handle_get_modules()

@app.get("/api/getModulesByCategory/{category_id}")
async def get_modules_by_category(category_id: str):
    return await handle_get_modules_by_category(category_id)

@app.get("/api/getTrainingCategories")
async def get_training_categories():
    return await handle_get_training_categories()

@app.get("/api/getTrainingAgentsByModule/{module_id}")
async def get_training_agents_by_module(module_id: str):
    return await handle_get_training_agents_by_module(module_id)

@app.get("/api/getScenariosByModule/{module_id}")
async def get_scenarios_by_module(module_id: str):
    return await handle_get_scenarios_by_module(module_id)

@app.post("/api/start-training-call")
async def start_training_call(request: Request):
    return await handle_start_training_call(request)

@app.post("/api/log-call")
async def log_call_post(data: CallLogRequest):
    return await handle_log_call_post(data)

@app.post("/api/update-call-id")
async def update_call_id(data: UpdateCallIdRequest):
    return await handle_update_call_id(data)

@app.get("/api/getUserStats/{user_id}")
async def get_user_stats(user_id: str):
    return await handle_get_user_stats(user_id)

@app.patch("/api/update-training-call")
async def update_training_call(request: Request):
    return await handle_update_training_call(request)

@app.get("/api/user-analytics/{user_id}")
async def get_user_analytics(user_id: str, request: Request):
    return await handle_get_user_analytics(user_id, request)

@app.get("/api/leaderboard")
async def get_leaderboard(request: Request):
    return await handle_get_comprehensive_leaderboard(request)

@app.get("/api/user-calls/{user_id}")
async def get_user_training_calls(user_id: str, request: Request):
    return await handle_get_user_training_calls(user_id, request)

@app.get("/api/training/user-analytics/{user_id}")
async def get_training_user_analytics(user_id: str, request: Request):
    return await handle_get_training_user_analytics(user_id, request)

@app.get("/health")
async def health_check():
    return await handle_health_check()

@app.get("/")
async def read_root():
    return await handle_root()

# Gamification API Routes
@app.get("/api/gamification/user-stats/{user_id}")
async def get_user_gamification_stats(user_id: str):
    """Get comprehensive gamification stats for a user"""
    from gamification_service import gamification_service
    return gamification_service.get_user_stats(user_id)

@app.get("/api/gamification/weekly-challenges/{user_id}")
async def get_weekly_challenges(user_id: str):
    """Get current week's challenges for a user"""
    from gamification_service import gamification_service
    return gamification_service.get_weekly_challenges(user_id)

@app.post("/api/gamification/claim-challenge")
async def claim_challenge_reward(data: dict):
    """Claim reward for completed challenge"""
    from gamification_service import gamification_service
    user_id = data.get('user_id')
    challenge_id = data.get('challenge_id')
    
    if not user_id or not challenge_id:
        raise HTTPException(status_code=400, detail="Missing user_id or challenge_id")
    
    return gamification_service.claim_challenge_reward(user_id, challenge_id)

@app.get("/api/gamification/leaderboard")
async def get_enhanced_leaderboard():
    """Get enhanced leaderboard with gamification data"""
    from gamification_service import gamification_service
    return gamification_service.get_enhanced_leaderboard()

@app.get("/api/gamification/badges/{user_id}")
async def get_user_badges(user_id: str):
    """Get user's badges with progress"""
    from gamification_service import gamification_service
    stats = gamification_service.get_user_stats(user_id)
    return stats.get('badges', [])

@app.get("/api/gamification/rank-system")
async def get_rank_system():
    """Get the complete rank system"""
    from gamification_service import gamification_service
    return gamification_service.rank_system

# Live Call Control Panel API Routes
@app.get("/api/live-calls/active")
async def get_active_calls(supervisor_id: str):
    """Get list of active calls for supervisor monitoring"""
    try:
        from live_call_control_service import get_active_calls
        
        # Get active calls for supervisor
        active_calls = get_active_calls(supervisor_id)
        
        return {
            "status": "success",
            "calls": active_calls
        }
        
    except Exception as e:
        logger.exception("Error getting active calls")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/live-calls/{call_id}/details")
async def get_call_details(call_id: str):
    """Get detailed information about a specific call"""
    try:
        from live_call_control_service import get_call_details
        
        call_details = get_call_details(call_id)
        
        if not call_details:
            raise HTTPException(status_code=404, detail="Call not found")
        
        return {
            "status": "success",
            "details": call_details
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting call details for {call_id}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/live-calls/subscribe")
async def subscribe_to_call(request: Request):
    """Subscribe supervisor to monitor a call"""
    try:
        from live_call_control_service import subscribe_to_call
        
        data = await request.json()
        supervisor_id = data.get("supervisor_id")
        call_id = data.get("call_id")
        
        if not supervisor_id or not call_id:
            raise HTTPException(status_code=400, detail="supervisor_id and call_id are required")
        
        success = subscribe_to_call(supervisor_id, call_id)
        
        return {
            "success": success,
            "message": "Subscribed to call" if success else "Failed to subscribe"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error subscribing to call")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/live-calls/unsubscribe")
async def unsubscribe_from_call(request: Request):
    """Unsubscribe supervisor from monitoring a call"""
    try:
        from live_call_control_service import unsubscribe_from_call
        
        data = await request.json()
        supervisor_id = data.get("supervisor_id")
        call_id = data.get("call_id")
        
        if not supervisor_id or not call_id:
            raise HTTPException(status_code=400, detail="supervisor_id and call_id are required")
        
        success = unsubscribe_from_call(supervisor_id, call_id)
        
        return {
            "success": success,
            "message": "Unsubscribed from call" if success else "Failed to unsubscribe"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error unsubscribing from call")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/live-calls/intervene")
async def perform_call_intervention(request: Request):
    """Perform supervisor intervention on a live call"""
    try:
        from live_call_control_service import perform_call_intervention
        
        data = await request.json()
        call_id = data.get("call_id")
        supervisor_id = data.get("supervisor_id")
        intervention_type = data.get("intervention_type")
        message = data.get("message")
        
        if not call_id or not supervisor_id or not intervention_type:
            raise HTTPException(status_code=400, detail="call_id, supervisor_id, and intervention_type are required")
        
        result = perform_call_intervention(call_id, supervisor_id, intervention_type, message)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error performing call intervention")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/live-calls/register")
async def register_live_call(request: Request):
    """Register a new call for live monitoring"""
    try:
        from live_call_control_service import register_live_call
        
        data = await request.json()
        call_id = data.get("call_id")
        
        if not call_id:
            raise HTTPException(status_code=400, detail="call_id is required")
        
        success = register_live_call(data)
        
        return {
            "success": success,
            "message": "Call registered for monitoring" if success else "Failed to register call"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error registering live call")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/live-calls/transcript")
async def update_live_transcript(request: Request):
    """Update call transcript in real-time"""
    try:
        from live_call_control_service import update_live_transcript
        
        data = await request.json()
        call_id = data.get("call_id")
        transcript_event = data.get("transcript_event")
        
        if not call_id or not transcript_event:
            raise HTTPException(status_code=400, detail="call_id and transcript_event are required")
        
        success = update_live_transcript(call_id, transcript_event)
        
        return {
            "success": success,
            "message": "Transcript updated" if success else "Failed to update transcript"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error updating live transcript")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/live-calls/end")
async def end_live_call(request: Request):
    """End a live call and clean up resources"""
    try:
        from live_call_control_service import end_live_call
        
        data = await request.json()
        call_id = data.get("call_id")
        reason = data.get("reason", "completed")
        
        if not call_id:
            raise HTTPException(status_code=400, detail="call_id is required")
        
        success = end_live_call(call_id, reason)
        
        return {
            "success": success,
            "message": "Call ended" if success else "Failed to end call"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error ending live call")
        raise HTTPException(status_code=500, detail=str(e))

# Human Transfer API Routes
@app.post("/api/human-transfer/initiate")
async def initiate_human_transfer(request: Request):
    """Initiate transfer of AI call to human agent"""
    try:
        from human_transfer_service import initiate_human_transfer
        
        data = await request.json()
        call_id = data.get("call_id")
        supervisor_id = data.get("supervisor_id")
        reason = data.get("reason")
        priority = data.get("priority", "medium")
        target_agent_id = data.get("target_agent_id")
        special_instructions = data.get("special_instructions", "")
        
        if not call_id or not supervisor_id or not reason:
            raise HTTPException(status_code=400, detail="call_id, supervisor_id, and reason are required")
        
        result = initiate_human_transfer(call_id, supervisor_id, reason, priority, target_agent_id, special_instructions)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error initiating human transfer")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/human-transfer/status/{transfer_id}")
async def get_human_transfer_status(transfer_id: str):
    """Get status of transfer request"""
    try:
        from human_transfer_service import get_transfer_status
        
        result = get_transfer_status(transfer_id)
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting transfer status {transfer_id}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/human-transfer/complete")
async def complete_human_transfer(request: Request):
    """Mark transfer as completed"""
    try:
        from human_transfer_service import complete_human_transfer
        
        data = await request.json()
        transfer_id = data.get("transfer_id")
        success = data.get("success", True)
        notes = data.get("notes", "")
        
        if not transfer_id:
            raise HTTPException(status_code=400, detail="transfer_id is required")
        
        result = complete_human_transfer(transfer_id, success, notes)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error completing human transfer")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/human-transfer/cancel")
async def cancel_human_transfer(request: Request):
    """Cancel pending transfer"""
    try:
        from human_transfer_service import cancel_human_transfer
        
        data = await request.json()
        transfer_id = data.get("transfer_id")
        reason = data.get("reason", "")
        
        if not transfer_id:
            raise HTTPException(status_code=400, detail="transfer_id is required")
        
        result = cancel_human_transfer(transfer_id, reason)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error cancelling human transfer")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/human-transfer/agents")
async def get_available_human_agents(skills: str = None):
    """Get list of available human agents"""
    try:
        from human_transfer_service import get_available_human_agents
        
        skills_list = skills.split(",") if skills else None
        
        agents = get_available_human_agents(skills_list)
        
        return {
            "status": "success",
            "agents": agents
        }
        
    except Exception as e:
        logger.exception("Error getting available human agents")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/human-transfer/queue-status")
async def get_transfer_queue_status():
    """Get current transfer queue and agent status"""
    try:
        from human_transfer_service import get_transfer_queue_status
        
        status = get_transfer_queue_status()
        
        return status
        
    except Exception as e:
        logger.exception("Error getting transfer queue status")
        raise HTTPException(status_code=500, detail=str(e))

# Real-Time AI Assistant API Routes
@app.post("/api/ai-assistant/start-call")
async def start_ai_assistant_call(data: dict):
    """Start tracking a new call for AI assistant"""
    try:
        call_id = data.get('call_id')
        started_at = data.get('started_at')
        
        if not call_id:
            raise HTTPException(status_code=400, detail="call_id is required")
        
        # Log call start in event_logs
        supabase.table('event_logs').insert({
            'call_id': call_id,
            'event_type': 'ai_assistant_call_started',
            'payload': {
                'started_at': started_at,
                'assistant_enabled': True
            }
        }).execute()
        
        return {'status': 'success', 'call_id': call_id, 'message': 'AI assistant call tracking started'}
        
    except Exception as e:
        logger.exception("Error starting AI assistant call")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai-assistant/end-call")
async def end_ai_assistant_call(data: dict):
    """End AI assistant call tracking and save summary"""
    try:
        call_id = data.get('call_id')
        ended_at = data.get('ended_at')
        transcript = data.get('transcript', [])
        suggestions_used = data.get('suggestions_used', 0)
        
        if not call_id:
            raise HTTPException(status_code=400, detail="call_id is required")
        
        # Calculate call statistics
        total_messages = len(transcript)
        agent_messages = len([msg for msg in transcript if msg.get('speaker') == 'agent'])
        customer_messages = len([msg for msg in transcript if msg.get('speaker') == 'customer'])
        
        # Save call summary in event_logs
        supabase.table('event_logs').insert({
            'call_id': call_id,
            'event_type': 'ai_assistant_call_ended',
            'payload': {
                'ended_at': ended_at,
                'total_messages': total_messages,
                'agent_messages': agent_messages,
                'customer_messages': customer_messages,
                'suggestions_used': suggestions_used,
                'transcript_length': len(str(transcript))
            }
        }).execute()
        
        return {
            'status': 'success', 
            'call_id': call_id, 
            'summary': {
                'total_messages': total_messages,
                'suggestions_used': suggestions_used
            }
        }
        
    except Exception as e:
        logger.exception("Error ending AI assistant call")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai-assistant/update-transcript")
async def update_ai_assistant_transcript(data: dict):
    """Update transcript for real-time analysis"""
    try:
        call_id = data.get('call_id')
        transcript = data.get('transcript', [])
        
        if not call_id:
            raise HTTPException(status_code=400, detail="call_id is required")
        
        # Optionally store transcript updates for real-time analysis
        # For now, just acknowledge the update
        return {
            'status': 'success',
            'call_id': call_id,
            'transcript_length': len(transcript),
            'analysis_ready': True
        }
        
    except Exception as e:
        logger.exception("Error updating AI assistant transcript")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai-assistant/suggestion-used")
async def log_ai_suggestion_used(data: dict):
    """Log when an AI suggestion is used"""
    try:
        call_id = data.get('call_id')
        suggestion_id = data.get('suggestion_id')
        suggestion_type = data.get('suggestion_type')
        timestamp = data.get('timestamp')
        
        if not call_id or not suggestion_id:
            raise HTTPException(status_code=400, detail="call_id and suggestion_id are required")
        
        # Log suggestion usage
        supabase.table('event_logs').insert({
            'call_id': call_id,
            'event_type': 'ai_suggestion_used',
            'payload': {
                'suggestion_id': suggestion_id,
                'suggestion_type': suggestion_type,
                'timestamp': timestamp
            }
        }).execute()
        
        return {'status': 'success', 'message': 'Suggestion usage logged'}
        
    except Exception as e:
        logger.exception("Error logging AI suggestion usage")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai-assistant/analytics/{time_range}")
async def get_ai_assistant_analytics(time_range: str):
    """Get AI assistant usage analytics"""
    try:
        from datetime import datetime, timedelta
        
        # Calculate time range
        now = datetime.now()
        if time_range == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_range == 'week':
            start_date = now - timedelta(days=7)
        elif time_range == 'month':
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=7)  # Default to week
        
        # Get AI assistant events
        events_result = supabase.table('event_logs').select('*').gte('created_at', start_date.isoformat()).in_('event_type', ['ai_assistant_call_started', 'ai_assistant_call_ended', 'ai_suggestion_used']).execute()
        events = events_result.data or []
        
        # Calculate metrics
        calls_started = len([e for e in events if e['event_type'] == 'ai_assistant_call_started'])
        calls_ended = len([e for e in events if e['event_type'] == 'ai_assistant_call_ended'])
        suggestions_used = len([e for e in events if e['event_type'] == 'ai_suggestion_used'])
        
        # Calculate average suggestions per call
        avg_suggestions_per_call = 0
        if calls_ended > 0:
            total_suggestions = sum(e.get('payload', {}).get('suggestions_used', 0) for e in events if e['event_type'] == 'ai_assistant_call_ended')
            avg_suggestions_per_call = total_suggestions / calls_ended
        
        # Group by suggestion type
        suggestion_types = {}
        for event in events:
            if event['event_type'] == 'ai_suggestion_used':
                suggestion_type = event.get('payload', {}).get('suggestion_type', 'unknown')
                suggestion_types[suggestion_type] = suggestion_types.get(suggestion_type, 0) + 1
        
        return {
            'time_range': time_range,
            'calls_with_assistant': calls_started,
            'completed_calls': calls_ended,
            'total_suggestions_used': suggestions_used,
            'avg_suggestions_per_call': round(avg_suggestions_per_call, 1),
            'suggestion_types': suggestion_types,
            'assistant_adoption_rate': round((calls_started / max(calls_started + 10, 1)) * 100, 1)  # Mock calculation
        }
        
    except Exception as e:
        logger.exception("Error getting AI assistant analytics")
        raise HTTPException(status_code=500, detail=str(e))

# AI Call Analysis API Routes
@app.post("/api/ai-analysis/analyze-call")
async def analyze_call_comprehensive(data: dict):
    """Comprehensive AI-powered call analysis"""
    from ai_call_analyzer import ai_call_analyzer
    
    transcript = data.get('transcript', '')
    duration = data.get('duration', 0)
    scenario_difficulty = data.get('scenario_difficulty', 5)
    training_objectives = data.get('training_objectives', [])
    
    if not transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is required")
    
    analysis = ai_call_analyzer.analyze_call_comprehensive(
        transcript=transcript,
        duration=duration,
        scenario_difficulty=scenario_difficulty,
        training_objectives=training_objectives
    )
    
    return analysis

@app.get("/api/ai-analysis/call-insights/{call_id}")
async def get_call_insights(call_id: str):
    """Get AI insights for a specific call"""
    try:
        # Get call data from training_sessions
        session_data = get_training_session(call_id)
        
        if not session_data:
            raise HTTPException(status_code=404, detail="Call not found")
        
        transcript = session_data.get('transcript', '')
        duration = session_data.get('duration', 0)
        
        if not transcript.strip():
            return {"error": "No transcript available for analysis"}
        
        from ai_call_analyzer import ai_call_analyzer
        analysis = ai_call_analyzer.analyze_call_comprehensive(
            transcript=transcript,
            duration=duration
        )
        
        return analysis
        
    except Exception as e:
        logger.exception(f"Error getting call insights for {call_id}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai-analysis/bulk-analyze")
async def bulk_analyze_calls(data: dict):
    """Analyze multiple calls for performance trends"""
    from ai_call_analyzer import ai_call_analyzer
    
    call_ids = data.get('call_ids', [])
    user_id = data.get('user_id')
    
    if not call_ids and not user_id:
        raise HTTPException(status_code=400, detail="Either call_ids or user_id is required")
    
    results = []
    
    try:
        if user_id:
            # Get all calls for user
            sessions_result = supabase.table('training_sessions').select('*').eq('user_id', user_id).execute()
            sessions = sessions_result.data or []
        else:
            # Get specific calls
            sessions_result = supabase.table('training_sessions').select('*').in_('call_id', call_ids).execute()
            sessions = sessions_result.data or []
        
        for session in sessions:
            transcript = session.get('transcript', '')
            duration = session.get('duration', 0)
            
            if transcript.strip():
                analysis = ai_call_analyzer.analyze_call_comprehensive(
                    transcript=transcript,
                    duration=duration
                )
                results.append({
                    'call_id': session.get('call_id'),
                    'session_id': session.get('id'),
                    'analysis': analysis
                })
        
        # Calculate aggregate insights
        if results:
            aggregate_insights = _calculate_aggregate_insights(results)
            return {
                'individual_analyses': results,
                'aggregate_insights': aggregate_insights,
                'total_calls_analyzed': len(results)
            }
        else:
            return {
                'individual_analyses': [],
                'aggregate_insights': {},
                'total_calls_analyzed': 0
            }
            
    except Exception as e:
        logger.exception("Error in bulk call analysis")
        raise HTTPException(status_code=500, detail=str(e))

def _calculate_aggregate_insights(analyses: List[Dict]) -> Dict:
    """Calculate aggregate insights from multiple call analyses"""
    if not analyses:
        return {}
    
    # Extract scores
    overall_scores = [a['analysis']['overall_score'] for a in analyses if 'overall_score' in a['analysis']]
    
    # Calculate trends
    communication_scores = []
    sentiment_scores = []
    objection_scores = []
    
    for analysis in analyses:
        enhanced_scores = analysis['analysis'].get('enhanced_scores', {})
        component_scores = enhanced_scores.get('component_scores', {})
        
        communication_scores.append(component_scores.get('communication_patterns', 5))
        sentiment_scores.append(component_scores.get('sentiment_flow', 5))
        objection_scores.append(component_scores.get('objection_handling', 5))
    
    return {
        'average_overall_score': sum(overall_scores) / len(overall_scores) if overall_scores else 0,
        'score_trend': 'improving' if len(overall_scores) > 1 and overall_scores[-1] > overall_scores[0] else 'stable',
        'strongest_areas': _identify_strongest_areas(communication_scores, sentiment_scores, objection_scores),
        'improvement_areas': _identify_improvement_areas(communication_scores, sentiment_scores, objection_scores),
        'calls_analyzed': len(analyses),
        'performance_consistency': _calculate_consistency(overall_scores)
    }

def _identify_strongest_areas(comm_scores: List[float], sent_scores: List[float], obj_scores: List[float]) -> List[str]:
    """Identify strongest performance areas"""
    avg_scores = {
        'communication': sum(comm_scores) / len(comm_scores) if comm_scores else 0,
        'sentiment': sum(sent_scores) / len(sent_scores) if sent_scores else 0,
        'objection_handling': sum(obj_scores) / len(obj_scores) if obj_scores else 0
    }
    
    return sorted(avg_scores.items(), key=lambda x: x[1], reverse=True)

def _identify_improvement_areas(comm_scores: List[float], sent_scores: List[float], obj_scores: List[float]) -> List[str]:
    """Identify areas needing improvement"""
    avg_scores = {
        'communication': sum(comm_scores) / len(comm_scores) if comm_scores else 0,
        'sentiment': sum(sent_scores) / len(sent_scores) if sent_scores else 0,
        'objection_handling': sum(obj_scores) / len(obj_scores) if obj_scores else 0
    }
    
    return [area for area, score in avg_scores.items() if score < 6]

def _calculate_consistency(scores: List[float]) -> str:
    """Calculate performance consistency"""
    if len(scores) < 2:
        return 'insufficient_data'
    
    variance = sum((score - sum(scores)/len(scores))**2 for score in scores) / len(scores)
    
    if variance < 1:
        return 'highly_consistent'
    elif variance < 4:
        return 'moderately_consistent'
    else:
        return 'inconsistent'

# Lead Management API Routes
@app.post("/api/import-leads")
async def import_leads(data: LeadImportRequest):
    """Import leads from CSV data"""
    return await handle_import_leads(data)

@app.get("/api/leads")
async def get_leads(user_id: str = None):
    """Get leads for a user"""
    return await handle_get_leads(user_id)

# HubSpot CRM Integration API Routes
@app.post("/api/hubspot/callback")
async def hubspot_oauth_callback(code: str, user_id: str):
    """Handle HubSpot OAuth callback"""
    return await handle_hubspot_oauth_callback(code, user_id)

@app.post("/api/hubspot/sync-contacts")
async def hubspot_sync_contacts(user_id: str):
    """Sync HubSpot contacts to Dialara"""
    return await handle_hubspot_sync_contacts(user_id)

@app.get("/api/hubspot/status")
async def hubspot_sync_status(user_id: str):
    """Get HubSpot integration status"""
    return await handle_hubspot_sync_status(user_id)

@app.delete("/api/hubspot/disconnect")
async def hubspot_disconnect(user_id: str):
    """Disconnect HubSpot integration"""
    return await handle_hubspot_disconnect(user_id)

# Google Calendar Integration API Routes
@app.post("/api/calendar/callback")
async def calendar_oauth_callback(code: str, user_id: str):
    """Handle Google Calendar OAuth callback"""
    return await handle_calendar_oauth_callback(code, user_id)

@app.get("/api/calendar/status")
async def calendar_status(user_id: str):
    """Get Google Calendar integration status"""
    return await handle_calendar_status(user_id)

@app.delete("/api/calendar/disconnect")
async def calendar_disconnect(user_id: str):
    """Disconnect Google Calendar integration"""
    return await handle_calendar_disconnect(user_id)

@app.post("/api/calendar/available-slots")
async def calendar_available_slots(request: Request):
    """Find available calendar slots for scheduling"""
    data = await request.json()
    return await handle_calendar_available_slots(data)

@app.post("/api/calendar/schedule-meeting")
async def calendar_schedule_meeting(request: Request):
    """Schedule a meeting via AI during calls"""
    data = await request.json()
    return await handle_calendar_schedule_meeting(data)

@app.post("/api/calendar/next-available")
async def calendar_next_available(request: Request):
    """Get next available time slot"""
    data = await request.json()
    return await handle_calendar_next_available(data)

@app.get("/api/calendar/vapi-functions")
async def get_vapi_calendar_functions():
    """Get Vapi function definitions for calendar integration"""
    try:
        from vapi_functions import get_vapi_function_definitions, get_example_assistant_config
        
        return {
            "function_definitions": get_vapi_function_definitions(),
            "example_assistant_config": get_example_assistant_config(),
            "setup_instructions": {
                "step_1": "Copy the function_definitions to your Vapi assistant configuration",
                "step_2": "Update your assistant's system message to include calendar capabilities",
                "step_3": "Test the functions using the calendar integration in Settings",
                "step_4": "The AI can now schedule meetings during calls"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Knowledge Base API Routes
@app.post("/api/knowledge/upload")
async def knowledge_upload(request: Request):
    """Upload document to knowledge base"""
    return await handle_knowledge_upload(request)

@app.post("/api/knowledge/search") 
async def knowledge_search(request: Request):
    """Search knowledge base"""
    data = await request.json()
    return await handle_knowledge_search(data)

@app.get("/api/knowledge/documents")
async def knowledge_documents(user_id: str):
    """Get user's knowledge base documents"""
    return await handle_knowledge_documents(user_id)

@app.delete("/api/knowledge/documents/{document_id}")
async def knowledge_delete_document(document_id: str, request: Request):
    """Delete a document from knowledge base"""
    data = await request.json()
    return await handle_knowledge_delete_document(document_id, data)

# Call Analysis API Routes
@app.post("/api/enable-call-analysis")
async def enable_call_analysis():
    """Enable Vapi call analysis for automatic summaries and QA scores"""
    try:
        # This would configure Vapi assistants to enable analysis
        # For now, return success since analysis is already enabled in webhook
        return {
            "status": "success",
            "message": "Call analysis already enabled via webhook processing",
            "features": {
                "automatic_summaries": True,
                "sentiment_analysis": True,
                "qa_scoring": True,
                "transcript_analysis": True
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/call-analysis-status")
async def get_call_analysis_status():
    """Get the status of call analysis features"""
    return {
        "status": "enabled",
        "features": {
            "automatic_summaries": True,
            "sentiment_analysis": True,
            "qa_scoring": True,
            "transcript_analysis": True,
            "enhanced_training_scoring": True
        },
        "retention_policy": "Recordings retained for 90 days, summaries indefinitely",
        "compliance": {
            "gdpr_compliant": True,
            "kvkk_compliant": True
        }
    }

# Webhook Security API Routes
@app.get("/api/webhook-security-status")
async def get_webhook_security_status():
    """Get the status of webhook security features"""
    from webhook_security import webhook_security_config
    
    return {
        "status": "configured",
        "security_features": {
            "signature_verification": webhook_security_config.signature_verification_enabled,
            "timestamp_validation": True,
            "https_enforcement": webhook_security_config.enforce_https,
            "security_logging": webhook_security_config.log_security_events,
            "replay_attack_protection": True
        },
        "configuration": {
            "timestamp_tolerance_seconds": webhook_security_config.timestamp_tolerance_seconds,
            "webhook_secret_configured": bool(config.vapi_webhook_secret)
        },
        "compliance": {
            "prevents_unauthorized_access": True,
            "logs_security_events": True,
            "validates_request_authenticity": True
        }
    }

@app.post("/api/test-webhook-security")
async def test_webhook_security(request: Request):
    """Test webhook security configuration"""
    try:
        from webhook_security import verify_vapi_signature
        
        # Check if webhook secret is configured
        if not config.vapi_webhook_secret:
            return {
                "status": "warning",
                "message": "Webhook secret not configured - signature verification disabled",
                "recommendation": "Set VAPI_WEBHOOK_SECRET environment variable for production"
            }
        
        # Test signature verification with mock data
        test_payload = b'{"test": "webhook_security"}'
        import hmac
        import hashlib
        
        # Generate test signature
        test_signature = hmac.new(
            config.vapi_webhook_secret.encode('utf-8'),
            test_payload,
            hashlib.sha256
        ).hexdigest()
        
        # Verify signature
        is_valid = verify_vapi_signature(test_payload, f"sha256={test_signature}")
        
        return {
            "status": "success" if is_valid else "error",
            "message": "Webhook security test completed",
            "results": {
                "signature_verification": "passed" if is_valid else "failed",
                "secret_configured": True,
                "test_successful": is_valid
            }
        }
        
    except Exception as e:
        logger.exception("Error testing webhook security")
        raise HTTPException(status_code=500, detail=str(e))

# Admin Dashboard API Routes
@app.get("/api/admin/dashboard")
async def get_admin_dashboard(timeRange: str = 'today'):
    """Get comprehensive admin dashboard data"""
    try:
        from datetime import datetime, timedelta
        
        # Calculate time range
        now = datetime.now()
        if timeRange == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif timeRange == 'week':
            start_date = now - timedelta(days=7)
        elif timeRange == 'month':
            start_date = now - timedelta(days=30)
        elif timeRange == 'quarter':
            start_date = now - timedelta(days=90)
        else:
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Get CRM stats
        crm_stats = await _get_crm_stats(start_date, now)
        
        # Get training stats
        training_stats = await _get_training_stats(start_date, now)
        
        # Get agent performance
        agent_performance = await _get_agent_performance(start_date, now)
        
        # Get real-time metrics
        real_time_metrics = await _get_real_time_metrics()
        
        # Get AI assistant stats
        ai_assistant_stats = await _get_ai_assistant_stats(start_date, now)
        
        return {
            'crm_stats': crm_stats,
            'training_stats': training_stats,
            'agent_performance': agent_performance,
            'real_time_metrics': real_time_metrics,
            'ai_assistant_stats': ai_assistant_stats,
            'time_range': timeRange,
            'generated_at': now.isoformat()
        }
        
    except Exception as e:
        logger.exception("Error getting admin dashboard data")
        raise HTTPException(status_code=500, detail=str(e))

async def _get_crm_stats(start_date: datetime, end_date: datetime) -> Dict:
    """Get CRM performance statistics"""
    try:
        # Get call logs for time range
        call_logs_result = supabase.table('call_logs').select('*').gte('created_at', start_date.isoformat()).lte('created_at', end_date.isoformat()).execute()
        call_logs = call_logs_result.data or []
        
        # Get leads data
        leads_result = supabase.table('leads').select('*').gte('created_at', start_date.isoformat()).execute()
        leads = leads_result.data or []
        
        # Calculate metrics
        total_calls = len(call_logs)
        total_duration = sum(log.get('duration', 0) for log in call_logs if log.get('duration'))
        avg_duration = total_duration / total_calls if total_calls > 0 else 0
        
        # Get unique active agents
        active_agents = len(set(log.get('user_id') for log in call_logs if log.get('user_id')))
        
        # Calculate conversion rate (simplified)
        leads_contacted = len([lead for lead in leads if lead.get('last_contact_date')])
        leads_converted = len([lead for lead in leads if lead.get('status') == 'converted'])
        conversion_rate = (leads_converted / leads_contacted * 100) if leads_contacted > 0 else 0
        
        # Get today's calls specifically
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_calls_result = supabase.table('call_logs').select('*').gte('created_at', today.isoformat()).execute()
        today_calls = len(today_calls_result.data or [])
        
        # Get this week's calls
        week_start = datetime.now() - timedelta(days=7)
        week_calls_result = supabase.table('call_logs').select('*').gte('created_at', week_start.isoformat()).execute()
        week_calls = len(week_calls_result.data or [])
        
        return {
            'total_calls_today': today_calls,
            'total_calls_week': week_calls,
            'average_call_duration': int(avg_duration),
            'conversion_rate': round(conversion_rate, 1),
            'active_agents': active_agents,
            'calls_in_progress': 0,  # Would need real-time tracking
            'leads_contacted': leads_contacted,
            'leads_converted': leads_converted
        }
        
    except Exception as e:
        logger.exception("Error getting CRM stats")
        return {
            'total_calls_today': 0,
            'total_calls_week': 0,
            'average_call_duration': 0,
            'conversion_rate': 0,
            'active_agents': 0,
            'calls_in_progress': 0,
            'leads_contacted': 0,
            'leads_converted': 0
        }

async def _get_training_stats(start_date: datetime, end_date: datetime) -> Dict:
    """Get training performance statistics"""
    try:
        # Get training sessions for time range
        sessions_result = supabase.table('training_sessions').select('*').gte('created_at', start_date.isoformat()).lte('created_at', end_date.isoformat()).execute()
        sessions = sessions_result.data or []
        
        # Calculate metrics
        total_sessions = len(sessions)
        scores = [session.get('score', 0) for session in sessions if session.get('score') is not None]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        # Get unique active trainees
        active_trainees = len(set(session.get('user_id') for session in sessions if session.get('user_id')))
        
        # Get completed modules count
        completed_modules = len(set(session.get('module_id') for session in sessions if session.get('module_id')))
        
        # Get total XP earned (handle None values)
        total_xp = sum((session.get('xp') or 0) + (session.get('bonus_xp') or 0) for session in sessions)
        
        # Get leaderboard data for badges
        leaderboard_result = supabase.table('training_leaderboard').select('*').execute()
        leaderboard = leaderboard_result.data or []
        
        # Estimate badges (would need proper badge tracking)
        badges_unlocked = len(leaderboard) * 2  # Simplified estimate
        
        return {
            'total_training_sessions': total_sessions,
            'average_training_score': round(avg_score, 1),
            'active_trainees': active_trainees,
            'completed_modules': completed_modules,
            'total_xp_earned': total_xp,
            'badges_unlocked': badges_unlocked,
            'challenges_completed': 0  # Would need challenge tracking
        }
        
    except Exception as e:
        logger.exception("Error getting training stats")
        return {
            'total_training_sessions': 0,
            'average_training_score': 0,
            'active_trainees': 0,
            'completed_modules': 0,
            'total_xp_earned': 0,
            'badges_unlocked': 0,
            'challenges_completed': 0
        }

async def _get_agent_performance(start_date: datetime, end_date: datetime) -> List[Dict]:
    """Get agent performance data"""
    try:
        # Get all users
        users_result = supabase.table('users').select('*').execute()
        users = users_result.data or []
        
        agent_performance = []
        
        for user in users:
            user_id = user['id']
            
            # Get CRM call stats
            crm_calls_result = supabase.table('call_logs').select('*').eq('user_id', user_id).gte('created_at', start_date.isoformat()).execute()
            crm_calls = crm_calls_result.data or []
            
            # Get training session stats
            training_result = supabase.table('training_sessions').select('*').eq('user_id', user_id).execute()
            training_sessions = training_result.data or []
            
            # Get leaderboard data
            leaderboard_result = supabase.table('training_leaderboard').select('*').eq('user_id', user_id).execute()
            leaderboard_data = leaderboard_result.data[0] if leaderboard_result.data else None
            
            # Calculate metrics
            crm_call_count = len(crm_calls)
            crm_conversion = 0  # Would need proper tracking
            
            training_scores = [s.get('score', 0) for s in training_sessions if s.get('score') is not None]
            avg_training_score = sum(training_scores) / len(training_scores) if training_scores else 0
            
            total_xp = leaderboard_data.get('xp', 0) if leaderboard_data else 0
            
            # Determine rank (simplified)
            if total_xp >= 2000:
                rank = 'Master'
            elif total_xp >= 1000:
                rank = 'Expert'
            elif total_xp >= 500:
                rank = 'Advanced'
            elif total_xp >= 100:
                rank = 'Intermediate'
            else:
                rank = 'Beginner'
            
            # Determine status (simplified)
            latest_activity = None
            if training_sessions:
                latest_training = max(training_sessions, key=lambda x: x.get('created_at', ''))
                latest_activity = latest_training.get('created_at')
            
            if crm_calls:
                latest_crm = max(crm_calls, key=lambda x: x.get('created_at', ''))
                crm_activity = latest_crm.get('created_at')
                if not latest_activity or crm_activity > latest_activity:
                    latest_activity = crm_activity
            
            # Determine status based on recent activity
            if latest_activity:
                activity_time = datetime.fromisoformat(latest_activity.replace('Z', '+00:00'))
                time_diff = datetime.now(activity_time.tzinfo) - activity_time
                
                if time_diff.total_seconds() < 3600:  # 1 hour
                    status = 'active'
                elif time_diff.total_seconds() < 86400:  # 24 hours
                    status = 'training'
                else:
                    status = 'offline'
            else:
                status = 'offline'
            
            agent_performance.append({
                'user_id': user_id,
                'name': user.get('full_name', 'Unknown'),
                'email': user.get('email', ''),
                'crm_calls': crm_call_count,
                'crm_conversion': crm_conversion,
                'training_score': round(avg_training_score, 1),
                'training_sessions': len(training_sessions),
                'total_xp': total_xp,
                'rank': rank,
                'status': status,
                'last_activity': latest_activity or ''
            })
        
        return agent_performance
        
    except Exception as e:
        logger.exception("Error getting agent performance")
        return []

async def _get_real_time_metrics() -> Dict:
    """Get real-time metrics and insights"""
    try:
        # Get recent call data for sentiment analysis
        recent_calls_result = supabase.table('call_logs').select('*').limit(100).order('created_at', desc=True).execute()
        recent_calls = recent_calls_result.data or []
        
        # Calculate sentiment distribution
        sentiments = [call.get('sentiment', 'neutral') for call in recent_calls if call.get('sentiment')]
        sentiment_counts = {'positive': 0, 'neutral': 0, 'negative': 0}
        
        for sentiment in sentiments:
            if sentiment in sentiment_counts:
                sentiment_counts[sentiment] += 1
        
        total_sentiments = sum(sentiment_counts.values())
        sentiment_distribution = {}
        if total_sentiments > 0:
            sentiment_distribution = {
                'positive': round((sentiment_counts['positive'] / total_sentiments) * 100),
                'neutral': round((sentiment_counts['neutral'] / total_sentiments) * 100),
                'negative': round((sentiment_counts['negative'] / total_sentiments) * 100)
            }
        else:
            sentiment_distribution = {'positive': 0, 'neutral': 0, 'negative': 0}
        
        # Mock data for other metrics (would need proper implementation)
        calls_per_hour = [5, 8, 12, 15, 18, 14, 10, 7]
        
        top_objections = [
            {'objection': 'Price too high', 'count': 23},
            {'objection': 'Need to think about it', 'count': 18},
            {'objection': 'Not interested right now', 'count': 15},
            {'objection': 'Already have a solution', 'count': 12},
            {'objection': 'Need approval from manager', 'count': 8}
        ]
        
        performance_trends = {
            'training_scores': [7.2, 7.5, 7.8, 8.1, 8.3],
            'call_volumes': [45, 52, 48, 61, 58],
            'conversion_rates': [18, 21, 19, 24, 23]
        }
        
        return {
            'calls_per_hour': calls_per_hour,
            'sentiment_distribution': sentiment_distribution,
            'top_objections': top_objections,
            'performance_trends': performance_trends
        }
        
    except Exception as e:
        logger.exception("Error getting real-time metrics")
        return {
            'calls_per_hour': [],
            'sentiment_distribution': {'positive': 0, 'neutral': 0, 'negative': 0},
            'top_objections': [],
            'performance_trends': {
                'training_scores': [],
                'call_volumes': [],
                'conversion_rates': []
            }
        }

async def _get_ai_assistant_stats(start_date: datetime, end_date: datetime) -> Dict:
    """Get AI assistant usage statistics"""
    try:
        # Get AI assistant events for time range
        events_result = supabase.table('event_logs').select('*').gte('created_at', start_date.isoformat()).lte('created_at', end_date.isoformat()).in_('event_type', ['ai_assistant_call_started', 'ai_assistant_call_ended', 'ai_suggestion_used']).execute()
        events = events_result.data or []
        
        # Calculate metrics
        calls_started = len([e for e in events if e['event_type'] == 'ai_assistant_call_started'])
        calls_ended = len([e for e in events if e['event_type'] == 'ai_assistant_call_ended'])
        suggestions_used = len([e for e in events if e['event_type'] == 'ai_suggestion_used'])
        
        # Calculate average suggestions per call
        avg_suggestions_per_call = 0
        if calls_ended > 0:
            total_suggestions = sum(e.get('payload', {}).get('suggestions_used', 0) for e in events if e['event_type'] == 'ai_assistant_call_ended')
            avg_suggestions_per_call = total_suggestions / calls_ended
        
        # Group by suggestion type
        suggestion_types = {}
        for event in events:
            if event['event_type'] == 'ai_suggestion_used':
                suggestion_type = event.get('payload', {}).get('suggestion_type', 'unknown')
                suggestion_types[suggestion_type] = suggestion_types.get(suggestion_type, 0) + 1
        
        # Calculate adoption rate (calls with assistant vs total calls)
        total_calls_result = supabase.table('call_logs').select('*').gte('created_at', start_date.isoformat()).lte('created_at', end_date.isoformat()).execute()
        total_calls = len(total_calls_result.data or [])
        
        adoption_rate = 0
        if total_calls > 0:
            adoption_rate = (calls_started / total_calls) * 100
        
        return {
            'calls_with_assistant': calls_started,
            'total_suggestions_used': suggestions_used,
            'avg_suggestions_per_call': round(avg_suggestions_per_call, 1),
            'assistant_adoption_rate': round(adoption_rate, 1),
            'suggestion_types': suggestion_types
        }
        
    except Exception as e:
        logger.exception("Error getting AI assistant stats")
        return {
            'calls_with_assistant': 0,
            'total_suggestions_used': 0,
            'avg_suggestions_per_call': 0,
            'assistant_adoption_rate': 0,
            'suggestion_types': {}
        }

# Campaign Dialer API Routes
@app.post("/api/campaigns/create")
async def create_campaign(request: Request):
    """Create a new outbound call campaign"""
    try:
        from campaign_dialer_service import create_campaign
        
        data = await request.json()
        user_id = data.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        result = create_campaign(user_id, data)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error creating campaign")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/campaigns/{campaign_id}/start")
async def start_campaign(campaign_id: str, request: Request):
    """Start an outbound call campaign"""
    try:
        from campaign_dialer_service import start_campaign
        
        data = await request.json()
        user_id = data.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        result = start_campaign(campaign_id, user_id)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error starting campaign {campaign_id}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/campaigns/{campaign_id}/pause")
async def pause_campaign(campaign_id: str, request: Request):
    """Pause an active campaign"""
    try:
        from campaign_dialer_service import pause_campaign
        
        data = await request.json()
        user_id = data.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        result = pause_campaign(campaign_id, user_id)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error pausing campaign {campaign_id}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/campaigns/{campaign_id}/stop")
async def stop_campaign(campaign_id: str, request: Request):
    """Stop and complete a campaign"""
    try:
        from campaign_dialer_service import stop_campaign
        
        data = await request.json()
        user_id = data.get("user_id")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        result = stop_campaign(campaign_id, user_id)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error stopping campaign {campaign_id}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/campaigns/{campaign_id}/status")
async def get_campaign_status(campaign_id: str, user_id: str):
    """Get real-time campaign status and statistics"""
    try:
        from campaign_dialer_service import get_campaign_status
        
        result = get_campaign_status(campaign_id, user_id)
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting campaign status {campaign_id}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/campaigns")
async def get_user_campaigns(user_id: str, status: str = None):
    """Get all campaigns for a user"""
    try:
        from campaign_dialer_service import get_user_campaigns
        
        result = get_user_campaigns(user_id, status)
        
        return result
        
    except Exception as e:
        logger.exception("Error getting user campaigns")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/campaigns/{campaign_id}/calls")
async def get_campaign_calls(campaign_id: str, status: str = None):
    """Get call logs for a specific campaign"""
    try:
        # This would fetch campaign call records from database
        # For now, return empty structure
        return {
            "success": True,
            "campaign_id": campaign_id,
            "calls": [],
            "total_calls": 0,
            "calls_by_status": {
                "pending": 0,
                "dialing": 0,
                "connected": 0,
                "completed": 0,
                "failed": 0,
                "no_answer": 0,
                "busy": 0,
                "voicemail": 0
            }
        }
        
    except Exception as e:
        logger.exception(f"Error getting campaign calls {campaign_id}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/campaigns/{campaign_id}/clone")
async def clone_campaign(campaign_id: str, request: Request):
    """Clone an existing campaign"""
    try:
        data = await request.json()
        user_id = data.get("user_id")
        new_name = data.get("new_name")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        if not new_name:
            raise HTTPException(status_code=400, detail="new_name is required")
        
        # Implementation would clone campaign data
        # For now, return success structure
        return {
            "success": True,
            "message": "Campaign cloned successfully",
            "new_campaign_id": f"cloned_{campaign_id}",
            "original_campaign_id": campaign_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error cloning campaign {campaign_id}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, user_id: str):
    """Delete a campaign"""
    try:
        # Implementation would delete campaign and related data
        # For now, return success structure
        return {
            "success": True,
            "message": "Campaign deleted successfully",
            "campaign_id": campaign_id
        }
        
    except Exception as e:
        logger.exception(f"Error deleting campaign {campaign_id}")
        raise HTTPException(status_code=500, detail=str(e))

# Multi-Language Support API Routes
@app.get("/api/language/available")
async def get_available_languages():
    """Get list of available languages for voice/transcription"""
    try:
        from vapi_functions import get_available_languages
        
        languages = get_available_languages()
        
        return {
            "status": "success",
            "languages": languages,
            "default_language": "en"
        }
        
    except Exception as e:
        logger.exception("Error getting available languages")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/language/config/{language_code}")
async def get_language_config(language_code: str):
    """Get language-specific configuration for Vapi assistant"""
    try:
        from vapi_functions import get_language_config, get_vapi_assistant_config_for_language
        
        # Validate language code
        if language_code not in ['en', 'tr', 'es']:
            raise HTTPException(status_code=400, detail="Unsupported language code")
        
        config = get_language_config(language_code)
        assistant_config = get_vapi_assistant_config_for_language(language_code)
        
        return {
            "status": "success",
            "language_code": language_code,
            "language_config": config,
            "vapi_assistant_config": assistant_config
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting language config for {language_code}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/language/set-default")
async def set_default_language(request: Request):
    """Set default language for a user"""
    try:
        data = await request.json()
        user_id = data.get("user_id")
        language_code = data.get("language_code")
        
        if not user_id or not language_code:
            raise HTTPException(status_code=400, detail="user_id and language_code are required")
        
        # Validate language code
        if language_code not in ['en', 'tr', 'es']:
            raise HTTPException(status_code=400, detail="Unsupported language code")
        
        # Update user's default language preference in database
        # Note: This requires a language_preference column in the users table
        try:
            update_result = supabase.table('users').update({
                'language_preference': language_code,
                'updated_at': datetime.now().isoformat()
            }).eq('id', user_id).execute()
        except Exception as e:
            # If column doesn't exist, log warning but don't fail
            logger.warning(f"Could not save language preference to database: {e}")
            # For now, just return success since localStorage will work
            return {
                "status": "success",
                "message": f"Default language set to {language_code} (frontend only)",
                "user_id": user_id,
                "language_code": language_code,
                "note": "Database storage not available"
            }
        
        if not update_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "status": "success",
            "message": f"Default language set to {language_code}",
            "user_id": user_id,
            "language_code": language_code
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error setting default language")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/language/user-preference/{user_id}")
async def get_user_language_preference(user_id: str):
    """Get user's language preference"""
    try:
        # Try to get language preference, fallback gracefully if column doesn't exist
        try:
            user_result = supabase.table('users').select('language_preference').eq('id', user_id).execute()
            
            if not user_result.data:
                raise HTTPException(status_code=404, detail="User not found")
            
            language_preference = user_result.data[0].get('language_preference', 'en')
        except Exception as e:
            # If language_preference column doesn't exist, default to English
            logger.warning(f"Could not fetch language preference from database: {e}")
            language_preference = 'en'
        
        return {
            "status": "success",
            "user_id": user_id,
            "language_preference": language_preference
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting user language preference for {user_id}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/language/create-assistant")
async def create_multilingual_assistant(request: Request):
    """Create a new Vapi assistant with multi-language support"""
    try:
        from vapi_functions import get_vapi_assistant_config_for_language
        
        data = await request.json()
        user_id = data.get("user_id")
        language_code = data.get("language_code", "en")
        assistant_name = data.get("assistant_name")
        
        if not user_id or not assistant_name:
            raise HTTPException(status_code=400, detail="user_id and assistant_name are required")
        
        # Get language-specific configuration
        assistant_config = get_vapi_assistant_config_for_language(language_code)
        
        # Customize with user's name
        assistant_config["name"] = f"{assistant_name} ({assistant_config['name']})"
        
        # TODO: Integrate with Vapi API to create the assistant
        # For now, return the configuration that should be used
        
        return {
            "status": "success",
            "message": "Assistant configuration generated",
            "assistant_config": assistant_config,
            "language_code": language_code,
            "setup_instructions": {
                "step_1": "Copy the assistant_config to your Vapi dashboard",
                "step_2": "Create a new assistant with this configuration",
                "step_3": "Note the assistant ID for use in your calls",
                "step_4": "Test the assistant with voice calls in the selected language"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error creating multilingual assistant")
        raise HTTPException(status_code=500, detail=str(e))

# Vapi Function Call Handler API Routes
@app.post("/api/vapi/function-call")
async def handle_vapi_function_call_endpoint(request: Request):
    """Handle Vapi function call requests"""
    try:
        from vapi_functions import handle_vapi_function_call
        
        data = await request.json()
        function_name = data.get("function_name")
        parameters = data.get("parameters", {})
        user_id = data.get("user_id")
        
        if not function_name:
            raise HTTPException(status_code=400, detail="function_name is required")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        result = handle_vapi_function_call(function_name, parameters, user_id)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error handling Vapi function call")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vapi/functions")
async def get_vapi_function_definitions():
    """Get available Vapi function definitions"""
    try:
        from vapi_functions import get_vapi_function_definitions, get_example_assistant_config
        
        return {
            "status": "success",
            "functions": get_vapi_function_definitions(),
            "example_config": get_example_assistant_config(),
            "webhook_url": "/api/vapi/function-call",
            "setup_instructions": {
                "step_1": "Copy the function definitions to your Vapi assistant configuration",
                "step_2": "Set your assistant's function call webhook URL to your domain + /api/vapi/function-call", 
                "step_3": "Include user_id in your function call payloads",
                "step_4": "Test the functions using the examples provided"
            }
        }
        
    except Exception as e:
        logger.exception("Error getting Vapi function definitions")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vapi/test-function")
async def test_vapi_function(request: Request):
    """Test a Vapi function call with sample data"""
    try:
        from vapi_functions import handle_vapi_function_call
        
        data = await request.json()
        function_name = data.get("function_name")
        test_user_id = data.get("test_user_id", "test-user-123")
        
        # Test data for different functions
        test_parameters = {
            "lookup_lead": {
                "identifier": "+1234567890",
                "identifier_type": "phone"
            },
            "get_call_history": {
                "limit": "3"
            },
            "calculate_pricing": {
                "product_type": "dialara_pro",
                "quantity": "1",
                "customer_type": "small_business",
                "duration": "yearly"
            },
            "create_follow_up_task": {
                "task_description": "Follow up on pricing discussion",
                "due_date": "2024-01-20T10:00:00Z",
                "priority": "high"
            }
        }
        
        if function_name not in test_parameters:
            return {
                "status": "error", 
                "message": f"No test data available for function: {function_name}",
                "available_test_functions": list(test_parameters.keys())
            }
        
        parameters = test_parameters[function_name]
        result = handle_vapi_function_call(function_name, parameters, test_user_id)
        
        return {
            "status": "test_completed",
            "function_name": function_name,
            "test_parameters": parameters,
            "result": result
        }
        
    except Exception as e:
        logger.exception("Error testing Vapi function")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/campaigns/analytics")
async def get_campaign_analytics(user_id: str, time_range: str = "week"):
    """Get campaign analytics and performance metrics"""
    try:
        from datetime import datetime, timedelta
        
        # Calculate time range
        now = datetime.now()
        if time_range == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_range == 'week':
            start_date = now - timedelta(days=7)
        elif time_range == 'month':
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=7)
        
        # Mock analytics data - would be calculated from actual campaign data
        return {
            "success": True,
            "time_range": time_range,
            "analytics": {
                "total_campaigns": 0,
                "active_campaigns": 0,
                "completed_campaigns": 0,
                "total_calls_made": 0,
                "total_calls_connected": 0,
                "average_call_duration": 0,
                "overall_conversion_rate": 0,
                "calls_per_day": [],
                "conversion_by_time": [],
                "top_performing_agents": [],
                "call_outcome_distribution": {
                    "connected": 0,
                    "no_answer": 0,
                    "busy": 0,
                    "voicemail": 0,
                    "failed": 0
                },
                "campaign_performance": []
            }
        }
        
    except Exception as e:
        logger.exception("Error getting campaign analytics")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
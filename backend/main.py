from fastapi import FastAPI, HTTPException, Request
import logging
from typing import List, Dict
from datetime import datetime

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

# WEBHOOK ENDPOINT - Now uses extracted webhook handler
@app.post("/webhook")
async def webhook(request: Request):
    """Main webhook endpoint that delegates to the webhook handler"""
    try:
        raw_json = await request.json()
        return await process_webhook(raw_json, supabase)
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
        scores = [session.get('score', 0) for session in sessions if session.get('score')]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        # Get unique active trainees
        active_trainees = len(set(session.get('user_id') for session in sessions if session.get('user_id')))
        
        # Get completed modules count
        completed_modules = len(set(session.get('module_id') for session in sessions if session.get('module_id')))
        
        # Get total XP earned
        total_xp = sum(session.get('xp', 0) + session.get('bonus_xp', 0) for session in sessions)
        
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
            
            training_scores = [s.get('score', 0) for s in training_sessions if s.get('score')]
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
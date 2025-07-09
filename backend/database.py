"""
Database operations and Supabase client management
"""
from supabase import create_client, Client
from config import get_config
import logging

logger = logging.getLogger(__name__)

# Initialize configuration
config = get_config()

# Initialize Supabase client with validation
if not config.supabase_url or not config.supabase_key:
    key_masked = '*' * len(config.supabase_key) if config.supabase_key else 'None'
    raise ValueError(f"Supabase configuration missing. URL: {config.supabase_url}, Key: {key_masked}")

supabase: Client = create_client(config.supabase_url, config.supabase_key)

def get_supabase_client() -> Client:
    """Get the Supabase client instance"""
    return supabase

def get_training_session(call_id: str):
    """Get training session by call_id"""
    try:
        session_res = supabase.table("training_sessions").select(
            "call_id, transcript, duration, score, sentiment, summary, feedback, "
            "xp, bonus_xp, passed, started_at, ended_at, created_at"
        ).eq("call_id", call_id).maybe_single().execute()
        
        return session_res.data if session_res else None
    except Exception as e:
        # Handle 204 "Missing response" gracefully for test call IDs
        if "204" in str(e) or "Missing response" in str(e):
            logger.info(f"204 response for call_id: {call_id} - likely test call or no session found")
            return None
        logger.exception(f"Error getting training session for call_id: {call_id}")
        raise

def get_call_logs(limit: int = 100):
    """Get call logs from call_logs table"""
    try:
        response = supabase.table("call_logs").select(
            "id, call_id, caller_number, call_type, duration, sentiment, score, "
            "timestamp, created_at, status, summary, transcript, recording_url, "
            "ended_reason, agent_id, user_id"
        ).order("timestamp", desc=True).limit(limit).execute()
        
        return response.data if response else []
    except Exception as e:
        logger.exception("Error getting call logs")
        raise

def get_call_log_by_id(call_id: str):
    """Get specific call log by call_id"""
    try:
        response = supabase.table("call_logs").select("*").eq("call_id", call_id).maybe_single().execute()
        return response.data if response else None
    except Exception as e:
        logger.exception(f"Error getting call log for call_id: {call_id}")
        raise

def get_training_sessions(limit: int = 100):
    """Get training sessions from training_sessions table"""
    try:
        response = supabase.table("training_sessions").select(
            "id, call_id, agent_id, transcript, duration, created_at, score, "
            "sentiment, recording_url, feedback, xp, bonus_xp, passed, "
            "user_id, module_id, scenario_id, started_at, ended_at"
        ).order("created_at", desc=True).limit(limit).execute()
        
        return response.data if response else []
    except Exception as e:
        logger.exception("Error getting training sessions")
        raise

def get_training_sessions_with_names():
    """Get training sessions with joined module and scenario names"""
    try:
        response = supabase.table("training_sessions").select(
            "*, training_modules(title, training_categories(name)), "
            "training_scenarios(title, description)"
        ).order("created_at", desc=True).execute()
        
        return response.data if response else []
    except Exception as e:
        logger.exception("Error getting training sessions with names")
        raise

def update_training_session(call_id: str, updates: dict):
    """Update training session with given data"""
    try:
        result = supabase.table("training_sessions").update(updates).eq("call_id", call_id).execute()
        return result.data if result else None
    except Exception as e:
        logger.exception(f"Error updating training session for call_id: {call_id}")
        raise

def insert_training_session(session_data: dict):
    """Insert new training session"""
    try:
        result = supabase.table("training_sessions").insert(session_data).execute()
        return result.data if result else None
    except Exception as e:
        logger.exception("Error inserting training session")
        raise

def get_scenario_by_id(scenario_id: str):
    """Get training scenario by ID with module and category info"""
    try:
        scenario_res = supabase.table("training_scenarios").select(
            "id,title,prompt_template,first_message,training_modules(id,title,training_categories(id,name))"
        ).eq("id", scenario_id).single().execute()
        
        return scenario_res.data if scenario_res else None
    except Exception as e:
        logger.exception(f"Error getting scenario for scenario_id: {scenario_id}")
        raise

def get_leaderboard(limit: int = 50):
    """Get leaderboard data"""
    try:
        response = supabase.table("training_leaderboard").select("*").order("xp", desc=True).limit(limit).execute()
        return response.data if response else []
    except Exception as e:
        logger.exception("Error getting leaderboard")
        raise

def get_training_modules():
    """Get all training modules"""
    try:
        response = supabase.table("training_modules").select("*").execute()
        return response.data if response else []
    except Exception as e:
        logger.exception("Error getting training modules")
        raise

def get_modules_by_category(category_id: str):
    """Get training modules by category"""
    try:
        response = supabase.table("training_modules").select("*").eq("category_id", category_id).execute()
        return response.data if response else []
    except Exception as e:
        logger.exception(f"Error getting modules for category: {category_id}")
        raise

def get_training_categories():
    """Get all training categories"""
    try:
        response = supabase.table("training_categories").select("*").order("created_at").execute()
        return response.data if response else []
    except Exception as e:
        logger.exception("Error getting training categories")
        raise

def get_training_agents_by_module(module_id: str):
    """Get training agents by module"""
    try:
        response = supabase.table("training_agents").select("*").eq("module_id", module_id).execute()
        return response.data if response else []
    except Exception as e:
        logger.exception(f"Error getting training agents for module: {module_id}")
        raise

def get_scenarios_by_module(module_id: str):
    """Get scenarios by module"""
    try:
        response = supabase.table("training_scenarios") \
            .select("id, title, description, difficulty, prompt_template, first_message") \
            .eq("module_id", module_id) \
            .execute()
        
        return response.data if response else []
    except Exception as e:
        logger.exception(f"Error getting scenarios for module: {module_id}")
        raise

def get_universal_agent(vapi_assistant_id: str):
    """Get universal agent by vapi_assistant_id"""
    try:
        response = supabase.table("training_agents").select("*").eq("vapi_agent_id", vapi_assistant_id).limit(1).execute()
        return response.data if response else []
    except Exception as e:
        logger.exception("Error getting universal agent")
        raise

def get_user_stats(user_id: str):
    """Get comprehensive user statistics"""
    try:
        sessions_res = supabase.table("training_sessions").select(
            "score, xp, bonus_xp, passed, duration, created_at"
        ).eq("user_id", user_id).execute()
        
        return sessions_res.data if sessions_res else []
    except Exception as e:
        logger.exception(f"Error getting user stats for user_id: {user_id}")
        raise

def get_user_analytics(user_id: str):
    """Get detailed user analytics including sentiment breakdown and recent calls"""
    try:
        # Get comprehensive training session data
        sessions_res = supabase.table("training_sessions").select(
            "id, score, sentiment, xp, bonus_xp, passed, duration, created_at, feedback, summary"
        ).eq("user_id", user_id).order("created_at", desc=True).execute()
        
        return sessions_res.data if sessions_res else []
    except Exception as e:
        logger.exception(f"Error getting user analytics for user_id: {user_id}")
        raise

def get_comprehensive_leaderboard():
    """Get comprehensive leaderboard with calculated stats"""
    try:
        # Get all users with their training sessions
        users_res = supabase.table("users").select(
            "id, full_name, email, role, "
            "training_sessions(score, xp, bonus_xp, passed, sentiment, created_at)"
        ).execute()
        
        return users_res.data if users_res else []
    except Exception as e:
        logger.exception("Error getting comprehensive leaderboard")
        raise

def get_user_training_calls(user_id: str, limit: int = 50):
    """Get user's training calls with detailed information"""
    try:
        calls_res = supabase.table("training_sessions").select(
            "id, call_id, score, sentiment, xp, bonus_xp, passed, duration, "
            "created_at, started_at, ended_at, feedback, summary, transcript"
        ).eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        
        return calls_res.data if calls_res else []
    except Exception as e:
        logger.exception(f"Error getting user training calls for user_id: {user_id}")
        raise

def get_all_users_with_stats():
    """Get all users with basic info for admin views"""
    try:
        users_res = supabase.table("users").select(
            "id, full_name, email, role, created_at"
        ).order("full_name").execute()
        
        return users_res.data if users_res else []
    except Exception as e:
        logger.exception("Error getting all users")
        raise

def get_user_by_id(user_id: str):
    """Get user by ID with role information"""
    try:
        user_res = supabase.table("users").select(
            "id, email, full_name, role, clinic_name, created_at"
        ).eq("id", user_id).maybe_single().execute()
        
        return user_res.data if user_res else None
    except Exception as e:
        logger.exception(f"Error getting user by user_id: {user_id}")
        raise
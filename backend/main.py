from fastapi import FastAPI, HTTPException, Request
import logging

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
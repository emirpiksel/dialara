from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
from textblob import TextBlob
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime
import requests
import time
import os
import json
import traceback
import logging
import re

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

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
VAPI_PRIVATE_KEY = os.getenv("VAPI_PRIVATE_KEY")
VAPI_ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID")

if not SUPABASE_URL or not SUPABASE_KEY or not VAPI_PRIVATE_KEY or not VAPI_ASSISTANT_ID:
    raise ValueError("Missing required environment variables!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI()

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        method = request.method
        url = str(request.url)
        try:
            body = await request.body()
            if body:
                logger.info(f"🔄 {method} {url} → Body: {body.decode('utf-8')[:500]}...")
            else:
                logger.info(f"🔄 {method} {url} → No body")
        except:
            logger.info(f"🔄 {method} {url} → Body read failed")
        response = await call_next(request)
        logger.info(f"✅ {method} {url} → Response: {response.status_code}")
        return response

app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class CallLogRequest(BaseModel):
    call_id: str
    user_id: str
    agent_id: str
    module_id: str

class AnalyzeTrainingCallRequest(BaseModel):
    call_id: str
    user_id: str
    module_id: str
    transcript: str
    duration: int

class StartCallRequest(BaseModel):
    scenario_id: str
    module_id: str
    user_id: str

class EndSessionRequest(BaseModel):
    call_id: str

class UpdateCallIdRequest(BaseModel):
    old_call_id: str
    new_call_id: str

class MigrationRequest(BaseModel):
    confirm: bool = False

# ✅ NEW: Helper function to determine call type
def determine_call_type(raw_json: dict) -> str:
    """
    Determine if this is a training call or regular outbound call
    Returns: 'training' or 'outbound' or 'inbound' or 'webCall'
    """
    message = raw_json.get("message", {})
    call = message.get("call", {})
    call_type = call.get("type", "")
    
    # Check if this is a training call by looking for training session
    call_id = call.get("id")
    if call_id:
        try:
            session_res = supabase.table("training_sessions").select("id").eq("call_id", call_id).maybe_single().execute()
            if session_res and session_res.data:
                logger.info(f"🎓 Call {call_id} identified as TRAINING call")
                return "training"
        except Exception as e:
            logger.debug(f"Error checking training session: {e}")
    
    # Determine call type based on Vapi call type
    if call_type == "outboundPhoneCall":
        logger.info(f"📞 Call {call_id} identified as OUTBOUND call")
        return "outbound"
    elif call_type == "inboundPhoneCall":
        logger.info(f"📞 Call {call_id} identified as INBOUND call")
        return "inbound"
    elif call_type == "webCall":
        logger.info(f"🌐 Call {call_id} identified as WEB call")
        return "webCall"
    else:
        logger.info(f"❓ Call {call_id} type unknown, defaulting to outbound")
        return "outbound"

# ✅ NEW: Handle regular call logs (outbound/inbound/web calls)
def handle_regular_call(raw_json: dict, call_type: str) -> dict:
    """
    Handle non-training calls and save to call_logs table
    """
    try:
        message = raw_json.get("message", {})
        call = message.get("call", {})
        call_id = call.get("id")
        
        if not call_id:
            logger.warning("❌ Regular call missing call_id")
            return {"status": "error", "message": "Missing call_id"}

        logger.info(f"📋 Processing regular call: {call_id} (type: {call_type})")

        # Extract call data
        transcript = message.get("transcript") or call.get("transcript") or ""
        summary = message.get("summary") or message.get("topic_summary") or call.get("summary") or ""
        sentiment = message.get("sentiment") or call.get("sentiment") or "neutral"
        ended_reason = message.get("endedReason") or call.get("endedReason") or ""
        recording_url = call.get("recordingUrl") or None
        
        # Get customer info
        customer = call.get("customer", {})
        caller_number = customer.get("number") or customer.get("phoneNumber") or ""
        customer_name = customer.get("name") or ""
        
        # Handle duration
        try:
            raw_duration = (message.get("durationSeconds") or 
                          message.get("duration") or
                          call.get("durationSeconds") or
                          call.get("duration") or
                          message.get("durationMs", 0) / 1000 if message.get("durationMs") else 0)
            duration = int(float(raw_duration))
        except Exception as e:
            logger.warning(f"⚠️ Duration extraction failed: {e}, using default 0")
            duration = 0

        # Get timestamps
        call_start = call.get("startTime") or call.get("createdAt") or datetime.utcnow().isoformat()
        call_end = call.get("endTime") or call.get("updatedAt") or datetime.utcnow().isoformat()
        timestamp = call_end

        # Get agent info
        agent_id = call.get("assistantId") or None
        
        # Try to get user_id from agent mapping
        user_id = None
        if agent_id:
            try:
                agent_res = supabase.table("ai_agents").select("user_id").eq("vapi_agent_id", agent_id).maybe_single().execute()
                if agent_res and agent_res.data:
                    user_id = agent_res.data.get("user_id")
            except Exception as e:
                logger.debug(f"Could not get user_id from agent: {e}")

        # Calculate basic score from sentiment
        score = None
        if sentiment == "positive":
            score = 8
        elif sentiment == "neutral":
            score = 6
        elif sentiment == "negative":
            score = 4

        # Prepare payload for call_logs table
        payload = {
            "call_id": call_id,
            "agent_id": agent_id,
            "caller_number": caller_number,
            "call_type": call_type,
            "duration": duration,
            "recording_url": recording_url,
            "transcript": transcript,
            "status": "completed",
            "timestamp": timestamp,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "ended_reason": ended_reason,
            "summary": summary,
            "topic_summary": summary,
            "user_id": user_id,
            "score": score,
            "sentiment": sentiment,
            "call_start": call_start,
            "call_end": call_end,
            "provider": "vapi",
            "feedback": summary or "Call completed successfully"
        }

        # Handle Twilio SID if available
        transport = call.get("transport", {})
        if transport.get("callSid"):
            payload["twilio_sid"] = transport["callSid"]

        logger.info(f"💾 Upserting regular call to call_logs: {call_id}")
        logger.debug(f"📋 Payload: {json.dumps(payload, indent=2)}")

        # Upsert to call_logs table
        result = supabase.table("call_logs").upsert(payload, on_conflict=["call_id"]).execute()
        
        if result.data:
            logger.info(f"✅ Successfully saved regular call {call_id} to call_logs")
        else:
            logger.error(f"❌ Failed to save regular call {call_id}")

        return {
            "status": "ok",
            "call_id": call_id,
            "call_type": call_type,
            "processed_at": datetime.utcnow().isoformat(),
            "table": "call_logs"
        }

    except Exception as e:
        logger.exception(f"🔥 Error processing regular call")
        return {"status": "error", "message": str(e)}

# Enhanced scoring function (keep existing)
def score_call_enhanced(transcript: str, duration: int, difficulty: int = 5) -> dict:
    """
    Enhanced scoring system that provides detailed feedback and scoring breakdown
    """
    try:
        if not transcript or not transcript.strip():
            return {
                "overall_score": 1,
                "xp": 10,
                "bonus_xp": 0,
                "feedback": "No meaningful conversation detected. Try engaging more actively with the scenario.",
                "breakdown": {"engagement": 0, "communication": 0, "problem_solving": 0, "professionalism": 0, "duration_factor": 0}
            }

        # Parse conversation
        lines = [line.strip() for line in transcript.split('\n') if line.strip()]
        user_lines = [line for line in lines if line.startswith('User:')]
        ai_lines = [line for line in lines if line.startswith('AI:') or line.startswith('Assistant:')]
        
        user_count = len(user_lines)
        ai_count = len(ai_lines)
        total_exchanges = user_count + ai_count
        
        # Calculate metrics
        user_text = ' '.join([line.replace('User:', '').strip() for line in user_lines])
        user_word_count = len(user_text.split()) if user_text else 0
        
        # 1. Engagement Score (0-10)
        if user_count == 0:
            engagement_score = 0
        elif user_count < 3:
            engagement_score = 3
        elif user_count < 5:
            engagement_score = 6
        elif user_count < 8:
            engagement_score = 8
        else:
            engagement_score = 10
            
        # 2. Communication Quality Score (0-10)
        avg_user_words = user_word_count / user_count if user_count > 0 else 0
        if avg_user_words < 2:
            communication_score = 2
        elif avg_user_words < 5:
            communication_score = 5
        elif avg_user_words < 10:
            communication_score = 7
        elif avg_user_words < 15:
            communication_score = 9
        else:
            communication_score = 10
            
        # 3. Problem-solving Score (0-10) - based on conversation depth
        conversation_depth = min(user_count, ai_count)
        if conversation_depth <= 1:
            problem_solving_score = 2
        elif conversation_depth <= 3:
            problem_solving_score = 4
        elif conversation_depth <= 5:
            problem_solving_score = 6
        elif conversation_depth <= 7:
            problem_solving_score = 8
        else:
            problem_solving_score = 10
            
        # 4. Professionalism Score (0-10) - sentiment and tone analysis
        try:
            sentiment = TextBlob(user_text).sentiment.polarity if user_text else 0
            if sentiment >= 0.1:
                professionalism_score = 10
            elif sentiment >= -0.1:
                professionalism_score = 8
            elif sentiment >= -0.3:
                professionalism_score = 6
            else:
                professionalism_score = 4
                
            # Check for profanity or inappropriate language (basic check)
            inappropriate_words = ['damn', 'hell', 'stupid', 'idiot', 'moron']
            if any(word in user_text.lower() for word in inappropriate_words):
                professionalism_score = max(0, professionalism_score - 3)
                
        except:
            professionalism_score = 7  # Default if sentiment analysis fails
            
        # 5. Duration Factor (0-10)
        if duration < 15:
            duration_factor = 2
        elif duration < 30:
            duration_factor = 5
        elif duration < 60:
            duration_factor = 8
        elif duration < 120:
            duration_factor = 10
        else:
            duration_factor = 9  # Slight penalty for very long calls
            
        # Calculate weighted overall score
        weights = {
            'engagement': 0.25,
            'communication': 0.25, 
            'problem_solving': 0.25,
            'professionalism': 0.15,
            'duration_factor': 0.10
        }
        
        scores = {
            'engagement': engagement_score,
            'communication': communication_score,
            'problem_solving': problem_solving_score,
            'professionalism': professionalism_score,
            'duration_factor': duration_factor
        }
        
        # Calculate overall score (0-10)
        overall_score = sum(scores[key] * weights[key] for key in weights)
        overall_score = round(overall_score, 1)
        
        # Adjust for difficulty
        difficulty_multiplier = 0.7 + (difficulty * 0.06)  # Range: 0.7 to 1.3
        overall_score = min(10, overall_score * difficulty_multiplier)
        overall_score = round(overall_score, 1)
        
        # Calculate XP (base 10-100, with bonuses)
        base_xp = int(overall_score * 10)
        
        # Bonus XP calculations
        bonus_xp = 0
        bonus_reasons = []
        
        # Perfect score bonus
        if overall_score >= 9.5:
            bonus_xp += 20
            bonus_reasons.append("Perfect performance")
            
        # High engagement bonus
        if user_count >= 8:
            bonus_xp += 10
            bonus_reasons.append("High engagement")
            
        # Long conversation bonus
        if duration >= 90:
            bonus_xp += 15
            bonus_reasons.append("Thorough conversation")
            
        # Difficulty bonus
        if difficulty >= 8:
            bonus_xp += 5
            bonus_reasons.append("High difficulty scenario")
            
        total_xp = base_xp + bonus_xp
        
        # Generate detailed feedback
        feedback_parts = []
        
        if overall_score >= 8.5:
            feedback_parts.append("🌟 Excellent performance! You demonstrated strong communication skills.")
        elif overall_score >= 7:
            feedback_parts.append("👍 Good job! You handled the scenario well with room for minor improvements.")
        elif overall_score >= 5:
            feedback_parts.append("📈 Decent effort, but several areas need attention.")
        else:
            feedback_parts.append("📚 This scenario needs more practice. Focus on the feedback below.")
            
        # Specific feedback based on scores
        if engagement_score < 7:
            feedback_parts.append("💡 Increase engagement by asking more questions and providing detailed responses.")
            
        if communication_score < 7:
            feedback_parts.append("🗣️ Work on communication clarity - provide more detailed and thoughtful responses.")
            
        if problem_solving_score < 7:
            feedback_parts.append("🧠 Enhance problem-solving by exploring the scenario more deeply and asking follow-up questions.")
            
        if professionalism_score < 7:
            feedback_parts.append("👔 Maintain professional tone and positive language throughout the conversation.")
            
        if duration_factor < 7:
            if duration < 30:
                feedback_parts.append("⏱️ Try to engage longer with the scenario to fully explore the situation.")
            else:
                feedback_parts.append("⏱️ Aim for more efficient conversations while maintaining quality.")
                
        # Add bonus achievements
        if bonus_reasons:
            feedback_parts.append(f"🎉 Bonus achievements: {', '.join(bonus_reasons)}")
            
        feedback = " ".join(feedback_parts)
        
        return {
            "overall_score": overall_score,  # Keep the precise float score
            "database_score": int(round(overall_score)),  # Integer version for database
            "xp": total_xp,
            "bonus_xp": bonus_xp,
            "feedback": feedback,
            "breakdown": scores
        }
        
    except Exception as e:
        logger.exception("❌ Enhanced scoring failed")
        # Fallback to simple scoring
        simple_score = score_call(transcript, duration)
        return {
            "overall_score": simple_score,
            "xp": simple_score * 10,
            "bonus_xp": 0,
            "feedback": "Training session completed. Scoring analysis encountered an issue but basic evaluation was performed.",
            "breakdown": {"simple_fallback": simple_score}
        }

def score_call(transcript: str, duration: int) -> int:
    """Simple fallback scoring function"""
    if not transcript.strip():
        return 1
    user_turns = sum(1 for line in transcript.split("\n") if line.startswith("User:"))
    ai_turns = sum(1 for line in transcript.split("\n") if line.startswith("AI:"))
    total_turns = user_turns + ai_turns
    if user_turns == 0:
        return 1
    engagement_ratio = user_turns / total_turns if total_turns > 0 else 0
    duration_score = min(5, duration // 10)
    base_score = int(engagement_ratio * 10)
    final_score = min(10, base_score + duration_score)
    return max(2, final_score)

def analyze_sentiment(transcript: str) -> str:
    """Analyze sentiment of the transcript"""
    if not transcript.strip():
        return "neutral"
    try:
        polarity = TextBlob(transcript).sentiment.polarity
        if polarity > 0.2:
            return "positive"
        elif polarity < -0.2:
            return "negative"
        return "neutral"
    except:
        return "neutral"

# ✅ ENHANCED WEBHOOK - Now handles both training AND regular calls
@app.post("/webhook")
async def handle_webhook(request: Request):
    try:
        raw_json = await request.json()

        # Enhanced logging for debugging
        logger.info(f"🔍 Raw webhook payload keys: {list(raw_json.keys())}")
        logger.debug(f"📋 Full payload preview: {str(raw_json)[:1000]}")

        with open("webhook_raw.log", "a", encoding="utf-8") as f:
            f.write(json.dumps(raw_json, indent=2) + "\n\n")

        message = raw_json.get("message", {})
        event_type = message.get("type", "unknown")

        logger.info(f"🔍 Message keys: {list(message.keys()) if message else 'No message'}")
        logger.info(f"📨 Event type: {event_type}")

        # Quick response for non-end-of-call events
        if event_type != "end-of-call-report":
            logger.info(f"ℹ️ Ignored webhook event type: {event_type}")
            return {"status": "ignored"}

        # ✅ NEW: Determine call type (training vs regular)
        call_type = determine_call_type(raw_json)
        
        if call_type == "training":
            # Handle training calls (existing logic)
            return await handle_training_call(raw_json)
        else:
            # Handle regular calls (new logic)
            return handle_regular_call(raw_json, call_type)

    except Exception as e:
        logger.exception("🔥 Webhook exception")
        logger.error(f"🔥 Raw payload causing error: {str(raw_json) if 'raw_json' in locals() else 'No payload'}")
        return {"status": "error", "message": str(e)}

# ✅ EXTRACTED: Training call handler (existing logic moved to separate function)
async def handle_training_call(raw_json: dict):
    """Handle training calls - existing logic"""
    try:
        message = raw_json.get("message", {})
        call = message.get("call", {})
        call_id = call.get("id")
        
        logger.info("🎓 Processing TRAINING call with enhanced scoring")
        
        if not call_id:
            logger.warning("❌ Training webhook payload missing call_id")
            return {"status": "error", "message": "Missing call_id"}

        # Extract fields with better error handling
        transcript = message.get("transcript") or call.get("transcript") or ""
        summary = message.get("summary") or message.get("topic_summary") or call.get("summary") or ""
        sentiment = message.get("sentiment") or call.get("sentiment") or "neutral"
        ended_reason = message.get("endedReason") or call.get("endedReason") or ""
        recording_url = call.get("recordingUrl") or None

        # Log extracted fields
        logger.info(f"📄 Extracted - transcript_length: {len(transcript)}, summary_length: {len(summary)}")
        logger.info(f"📊 Extracted - sentiment: {sentiment}, ended_reason: {ended_reason}")

        try:
            # Try multiple duration sources
            raw_duration = (message.get("durationSeconds") or 
                          message.get("duration") or
                          call.get("durationSeconds") or
                          call.get("duration") or
                          message.get("durationMs", 0) / 1000 if message.get("durationMs") else 0)
            duration = int(float(raw_duration))
            logger.info(f"⏱️ Duration extracted: {duration}s (from raw: {raw_duration})")
        except Exception as e:
            logger.warning(f"⚠️ Duration extraction failed: {e}, using default 0")
            duration = 0

        # Fallback for missing timestamps
        started_at = call.get("startTime") or call.get("createdAt") or datetime.utcnow().isoformat()
        ended_at = call.get("endTime") or call.get("updatedAt") or datetime.utcnow().isoformat()
        created_at = datetime.utcnow().isoformat()

        # Check if session exists
        logger.info(f"🔍 Looking up existing training session for call_id: {call_id}")
        session_res = supabase.table("training_sessions").select("*").eq("call_id", call_id).maybe_single().execute()
        session = session_res.data if session_res and session_res.data else {}
        
        if session:
            logger.info(f"✅ Found existing training session: {session.get('id')}")
        else:
            logger.warning(f"⚠️ No existing training session found for call_id: {call_id}")
            logger.warning("⚠️ This means the call wasn't properly logged at start - webhook will skip upsert")
            return {"status": "skipped", "reason": "no_session_found", "call_id": call_id}

        # Validate required fields from session
        if not session.get("user_id"):
            logger.error(f"❌ Training session missing user_id for call_id: {call_id}")
            logger.error(f"❌ Session data: {session}")
            return {"status": "error", "reason": "missing_user_id", "call_id": call_id}

        # GET SCENARIO DIFFICULTY for enhanced scoring
        scenario_difficulty = 5  # Default
        if session.get("scenario_id"):
            try:
                scenario_res = supabase.table("training_scenarios").select("difficulty").eq("id", session.get("scenario_id")).maybe_single().execute()
                if scenario_res and scenario_res.data:
                    scenario_difficulty = scenario_res.data.get("difficulty", 5)
                    logger.info(f"📊 Scenario difficulty: {scenario_difficulty}")
            except Exception as e:
                logger.warning(f"⚠️ Could not fetch scenario difficulty: {e}")

        # USE ENHANCED SCORING SYSTEM
        try:
            logger.info("🧠 Running enhanced scoring analysis...")
            scoring_result = score_call_enhanced(transcript, duration, scenario_difficulty)
            
            raw_score = scoring_result["overall_score"]  # Keep the precise float
            score = scoring_result.get("database_score", int(round(raw_score)))  # Use integer for DB
            xp = scoring_result["xp"]
            detailed_feedback = scoring_result["feedback"]
            breakdown = scoring_result["breakdown"]
            bonus_xp = scoring_result.get("bonus_xp", 0)
            
            logger.info(f"📊 Enhanced scoring complete:")
            logger.info(f"  - Raw Score: {raw_score}/10 → Database Score: {score}/10")
            logger.info(f"  - Breakdown: {breakdown}")
            logger.info(f"  - XP: {xp} (bonus: {bonus_xp})")
            logger.info(f"  - Feedback length: {len(detailed_feedback)} chars")
            
            # Store the raw score in the breakdown for reference
            breakdown["raw_score"] = raw_score
            
        except Exception as e:
            logger.exception("❌ Enhanced scoring failed, using fallback")
            # Fallback to simple scoring
            score = score_call(transcript, duration)
            xp = score * 10
            detailed_feedback = summary or "Training session completed successfully."
            breakdown = {"simple_score": score}
            bonus_xp = 0

        passed = score >= 5  # Updated threshold - 5/10 to pass

        payload = {
            "call_id": call_id,
            "transcript": transcript,
            "summary": summary,
            "sentiment": sentiment,
            "score": score,
            "duration": duration,
            "xp": xp,
            "ended_reason": ended_reason,
            "recording_url": recording_url,
            "started_at": session.get("started_at") or started_at,
            "ended_at": ended_at,
            "created_at": session.get("created_at") or created_at,
            "user_id": session.get("user_id"),
            "module_id": session.get("module_id"),
            "scenario_id": session.get("scenario_id"),
            "agent_id": session.get("agent_id") or "17c2b88e-097d-4b53-aea3-b4871cb48339",
            "passed": passed,
            # Enhanced fields
            "feedback": detailed_feedback,  # Use enhanced feedback instead of summary
            "scoring_breakdown": json.dumps(breakdown),  # Store detailed breakdown
            "bonus_xp": bonus_xp
        }

        logger.info(f"💾 Upserting enhanced training payload:")
        logger.info(f"  - Score: {score}/10")
        logger.info(f"  - XP: {xp} (bonus: {bonus_xp})")
        logger.info(f"  - Feedback: {detailed_feedback[:100]}...")

        # Enhanced error handling for upsert
        try:
            result = supabase.table("training_sessions").upsert(payload, on_conflict=["call_id"]).execute()
            
            if result.data:
                logger.info(f"✅ Successfully upserted training_sessions with enhanced scoring for call_id={call_id}")
                logger.debug(f"✅ Upsert result: {result.data}")
            else:
                logger.error(f"❌ Upsert returned no data for call_id={call_id}")
                logger.error(f"❌ Supabase error details: {result}")
                
        except Exception as e:
            logger.exception(f"🔥 Upsert failed for call_id={call_id}")
            logger.error(f"🔥 Payload was: {json.dumps(payload, indent=2)}")
            raise

        # Return detailed response for better debugging
        logger.info(f"✅ Enhanced training webhook processing complete for call_id={call_id}")
        return {
            "status": "ok", 
            "call_id": call_id, 
            "enhanced_scoring": True, 
            "score": score, 
            "xp": xp,
            "processed_at": datetime.utcnow().isoformat(),
            "transcript_length": len(transcript),
            "has_transcript": bool(transcript.strip()),
            "has_score": score > 0,
            "call_type": "training",
            "table": "training_sessions"
        }

    except Exception as e:
        logger.exception("🔥 Training call webhook exception")
        return {"status": "error", "message": str(e)}

# API Routes (keeping all existing routes)

@app.get("/log-call")
def get_call_log(call_id: str):
    """OPTIMIZED: Enhanced log-call endpoint with better performance"""
    try:
        logger.info(f"📤 GET /log-call?call_id={call_id}")
        
        # Use more specific select to improve performance
        session_res = supabase.table("training_sessions").select(
            "call_id, transcript, duration, score, sentiment, summary, feedback, "
            "xp, bonus_xp, passed, started_at, ended_at, created_at"
        ).eq("call_id", call_id).maybe_single().execute()

        if not session_res or not session_res.data:
            logger.warning(f"⚠️ No training_sessions found for call_id={call_id}")
            return {
                "message": "not found",
                "transcript": "",
                "duration": 0,
                "score": 0,
                "summary": "",
                "sentiment": "neutral",
                "feedback": "",
                "xp": 0,
                "passed": False,
                "call_id": call_id,
                "retrieved_at": datetime.utcnow().isoformat()
            }

        data = session_res.data
        logger.info(f"✅ Found session data for call_id={call_id}")
        
        # Extract and validate data with better defaults
        transcript = data.get("transcript") or ""
        summary = data.get("summary") or ""
        feedback = data.get("feedback") or summary or "Training session completed successfully."
        score = data.get("score") or 0
        sentiment = data.get("sentiment") or "neutral"
        duration = data.get("duration") or 0
        xp = data.get("xp") or (score * 10)
        bonus_xp = data.get("bonus_xp") or 0
        passed = data.get("passed") if data.get("passed") is not None else (score >= 5)
        
        # Log what we're returning for debugging
        logger.debug(f"📊 Returning data - transcript_length: {len(transcript)}, score: {score}, sentiment: {sentiment}")
        
        response_data = {
            "message": "found",
            "transcript": transcript,
            "duration": duration,
            "score": score,
            "summary": summary,
            "sentiment": sentiment,
            "feedback": feedback,
            "xp": xp,
            "bonus_xp": bonus_xp,
            "passed": passed,
            "call_id": call_id,
            "retrieved_at": datetime.utcnow().isoformat(),
            # Additional metadata for debugging
            "has_complete_data": bool(transcript.strip() and score > 0)
        }
        
        return response_data

    except Exception as e:
        logger.exception(f"🔥 Error in /log-call for call_id={call_id}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve call log: {str(e)}")

# NEW OPTIMIZATION ENDPOINT: Quick status check
@app.get("/api/call-status/{call_id}")
def get_call_status(call_id: str):
    """
    Quick endpoint to check if webhook has processed a call
    This allows the frontend to know when data is ready without polling the full data
    """
    try:
        logger.info(f"⚡ Quick status check for call_id: {call_id}")
        
        # Only fetch the fields we need for status check
        session_res = supabase.table("training_sessions").select(
            "call_id, score, transcript, duration, sentiment, xp, passed, feedback"
        ).eq("call_id", call_id).maybe_single().execute()
        
        if not session_res or not session_res.data:
            logger.info(f"📭 No session found for call_id: {call_id}")
            return {
                "status": "not_found", 
                "processed": False,
                "call_id": call_id,
                "checked_at": datetime.utcnow().isoformat()
            }
        
        data = session_res.data
        
        # Check if the webhook has processed this call
        has_transcript = bool(data.get("transcript", "").strip())
        has_score = data.get("score", 0) > 0
        has_feedback = bool(data.get("feedback", "").strip())
        
        # Consider it "processed" if we have both transcript and score
        is_processed = has_transcript and has_score
        
        logger.info(f"📊 Status for {call_id}: processed={is_processed}, transcript={has_transcript}, score={has_score}")
        
        return {
            "status": "found",
            "processed": is_processed,
            "has_transcript": has_transcript,
            "has_score": has_score,
            "has_feedback": has_feedback,
            "score": data.get("score", 0),
            "transcript_length": len(data.get("transcript", "")),
            "call_id": call_id,
            "checked_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.exception(f"❌ Error checking call status for {call_id}")
        return {
            "status": "error", 
            "processed": False,
            "error": str(e),
            "call_id": call_id,
            "checked_at": datetime.utcnow().isoformat()
        }

# ✅ NEW: Get regular call logs for the Calls page
@app.get("/api/getCallLogs")
def get_call_logs():
    """Fetch call logs for the Calls page"""
    try:
        logger.info("📥 Fetching call logs...")
        
        response = supabase.table("call_logs").select(
            "id, call_id, caller_number, call_type, duration, sentiment, score, "
            "timestamp, created_at, status, summary, transcript, recording_url, "
            "ended_reason, agent_id, user_id"
        ).order("timestamp", desc=True).limit(100).execute()
        
        logger.info(f"✅ Found {len(response.data)} call logs")
        return response.data
        
    except Exception as e:
        logger.exception("❌ Error in /api/getCallLogs")
        raise HTTPException(status_code=500, detail=str(e))

# ✅ NEW: Get specific call log details
@app.get("/api/getCallLog/{call_id}")
def get_call_log_details(call_id: str):
    """Get detailed call log information"""
    try:
        logger.info(f"📥 Getting call log details for call_id: {call_id}")
        
        response = supabase.table("call_logs").select("*").eq("call_id", call_id).maybe_single().execute()
        
        if not response or not response.data:
            logger.warning(f"⚠️ No call log found for call_id: {call_id}")
            raise HTTPException(status_code=404, detail="Call log not found")
        
        return response.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ Error getting call log details for {call_id}")
        raise HTTPException(status_code=500, detail=str(e))

# ✅ UPDATED: Training Calls endpoints to use training_sessions table
@app.get("/api/getTrainingCalls")
def get_training_calls():
    """Updated to fetch from training_sessions table instead of training_calls"""
    try:
        logger.info("📥 Fetching training sessions...")
        
        # ✅ Fetch from training_sessions table with proper ordering
        response = supabase.table("training_sessions").select(
            "id, call_id, agent_id, transcript, duration, created_at, score, "
            "sentiment, recording_url, feedback, xp, bonus_xp, passed, "
            "user_id, module_id, scenario_id, started_at, ended_at"
        ).order("created_at", desc=True).limit(100).execute()
        
        logger.info(f"✅ Found {len(response.data)} training sessions")
        return response.data
        
    except Exception as e:
        logger.exception("❌ Error in /api/getTrainingCalls")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/getTrainingCallsWithNames")
def get_training_calls_with_names():
    """Updated to use training_sessions with joined data"""
    try:
        logger.info("📥 Fetching training sessions with names...")
        
        # Use a database function or join query to get related names
        # For now, return the basic data - you may want to create a database view or function
        response = supabase.table("training_sessions").select(
            "*, training_modules(title, training_categories(name)), "
            "training_scenarios(title, description)"
        ).order("created_at", desc=True).execute()
        
        return response.data
        
    except Exception as e:
        logger.exception("❌ Error in /api/getTrainingCallsWithNames")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/getCallDetails")
def get_call_details(call_id: str):
    """Get detailed call information - redirect to log-call endpoint"""
    try:
        logger.info(f"📥 Getting call details for call_id: {call_id}")
        
        # Redirect to the optimized log-call endpoint
        return get_call_log(call_id)
        
    except Exception as e:
        logger.exception(f"❌ Error getting call details for {call_id}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-training-call")
def analyze_training_call(data: AnalyzeTrainingCallRequest):
    logger.info(f"📥 /api/analyze-training-call → data: {data}")
    try:
        logger.debug(f"🧠 Transcript preview (first 150 chars): {data.transcript[:150]}")

        score = score_call(data.transcript, data.duration)
        sentiment = analyze_sentiment(data.transcript)

        # ✅ Updated to use training_sessions table
        supabase.table("training_sessions").update({
            "score": score,
            "sentiment": sentiment,
        }).eq("call_id", data.call_id).execute()

        logger.info(f"✅ Analyzed call_id={data.call_id}, score={score}, sentiment={sentiment}")

        return {
            "call_id": data.call_id,
            "score": score,
            "sentiment": sentiment,
            "passed": score >= 5,
        }
    except Exception as e:
        logger.exception("🔥 Error in /api/analyze-training-call")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/start-simulation")
def start_simulation(data: StartCallRequest):
    try:
        logger.info("📞 /api/start-simulation triggered")
        logger.info(f"→ scenario_id: {data.scenario_id}, module_id: {data.module_id}, user_id: {data.user_id}")

        # Validate required fields
        if not data.user_id:
            logger.error("❌ Missing user_id in request")
            raise HTTPException(status_code=400, detail="user_id is required")
        
        if not data.module_id:
            logger.error("❌ Missing module_id in request")
            raise HTTPException(status_code=400, detail="module_id is required")
            
        if not data.scenario_id:
            logger.error("❌ Missing scenario_id in request")
            raise HTTPException(status_code=400, detail="scenario_id is required")

        scenario_res = supabase.table("training_scenarios").select(
            "id,title,prompt_template,first_message,training_modules(id,title,training_categories(id,name))"
        ).eq("id", data.scenario_id).single().execute()
        scenario = scenario_res.data
        if not scenario:
            logger.warning("❌ Scenario not found")
            raise HTTPException(status_code=404, detail="Scenario not found")

        module = scenario["training_modules"]
        category = module["training_categories"]

        prompt_template = scenario.get("prompt_template") or "You are handling a session titled {{title}}."
        prompt = prompt_template.replace("{{title}}", scenario["title"]) \
                                .replace("{{module}}", module["title"]) \
                                .replace("{{category}}", category["name"])

        headers = {
            "Authorization": f"Bearer {VAPI_PRIVATE_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "assistantId": VAPI_ASSISTANT_ID,
            "assistantOverrides": {
                "firstMessage": scenario["first_message"],
                "model": {
                    "provider": "openai",
                    "model": "gpt-4",
                    "messages": [
                        {
                            "role": "system",
                            "content": prompt
                        }
                    ]
                },
                "variableValues": {
                    "scenario": scenario["title"],
                    "module": module["title"],
                    "category": category["name"]
                },
                "server": {
                    "url": os.getenv("WEBHOOK_URL"),
                    "timeoutSeconds": 20
                }
            }
        }
        logger.debug(f"📤 Vapi API payload:\n{json.dumps(payload, indent=2)}")

        vapi_response = requests.post("https://api.vapi.ai/call", headers=headers, json=payload)
        vapi_data = vapi_response.json()
        if vapi_response.status_code != 200:
            logger.error(f"❌ Vapi Error: {vapi_data}")
            raise HTTPException(status_code=500, detail=f"Vapi Error: {vapi_data}")

        call_id = vapi_data.get("id")
        if not call_id:
            logger.error("❌ No call_id returned from Vapi")
            raise HTTPException(status_code=500, detail="No call_id returned from Vapi")

        now = datetime.utcnow().isoformat()
        universal_agent_id = "17c2b88e-097d-4b53-aea3-b4871cb48339"

        # Log the session IMMEDIATELY after getting call_id
        session_payload = {
            "call_id": call_id,
            "user_id": data.user_id,
            "agent_id": universal_agent_id,
            "module_id": data.module_id,
            "scenario_id": data.scenario_id,
            "started_at": now,
            "created_at": now
        }
        
        logger.info(f"💾 Inserting session with payload: {session_payload}")
        
        try:
            insert_result = supabase.table("training_sessions").insert(session_payload).execute()
            logger.info(f"✅ Session logged successfully: {insert_result.data}")
        except Exception as e:
            logger.exception(f"🔥 Failed to log session for call_id: {call_id}")
            logger.error(f"🔥 Session payload was: {session_payload}")
            # Don't fail the whole request, but log the error
            raise HTTPException(status_code=500, detail=f"Failed to log session: {str(e)}")

        logger.info(f"✅ Call started → call_id: {call_id}")

        return {
            "message": "Call started",
            "call_id": call_id,
            "status": vapi_data.get("status"),
        }

    except Exception as e:
        logger.exception("🔥 Error in /api/start-simulation")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/end-training-session")
def end_training_session(data: EndSessionRequest):
    try:
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"🛑 Ending training session → call_id: {data.call_id} at {now}")
        
        supabase.table("training_sessions").update({
            "ended_at": now
        }).eq("call_id", data.call_id).execute()

        logger.info(f"✅ Training session ended → call_id: {data.call_id}")
        return {"status": "ended", "call_id": data.call_id}
    except Exception as e:
        logger.exception("🔥 Error in /api/end-training-session")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/getUniversalAgent")
def get_universal_agent():
    try:
        logger.info("📥 Fetching universal agent...")
        response = supabase.table("training_agents").select("*").eq("vapi_agent_id", VAPI_ASSISTANT_ID).limit(1).execute()

        if not response.data:
            logger.warning("⚠️ No agent found with matching vapi_agent_id")
            return []

        return response.data
    except Exception as e:
        logger.exception("❌ Error in /api/getUniversalAgent")
        raise HTTPException(status_code=500, detail="Error fetching universal agent")

@app.get("/api/getLeaderboard")
def get_leaderboard():
    try:
        # ✅ Updated to use training_sessions for leaderboard calculation
        response = supabase.table("training_leaderboard").select("*").order("xp", desc=True).limit(50).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/getModules")
def get_modules():
    try:
        response = supabase.table("training_modules").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/getModulesByCategory/{category_id}")
def get_modules_by_category(category_id: str):
    try:
        response = supabase.table("training_modules").select("*").eq("category_id", category_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/getTrainingCategories")
def get_training_categories():
    try:
        response = supabase.table("training_categories").select("*").order("created_at").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/getTrainingAgentsByModule/{module_id}")
def get_training_agents_by_module(module_id: str):
    try:
        response = supabase.table("training_agents").select("*").eq("module_id", module_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/getScenariosByModule/{module_id}")
def get_scenarios_by_module(module_id: str):
    try:
        logger.info(f"📥 Fetching scenarios for module_id={module_id}")
        
        response = supabase.table("training_scenarios") \
            .select("id, title, description, difficulty, prompt_template, first_message") \
            .eq("module_id", module_id) \
            .execute()

        return response.data
    except Exception as e:
        logger.exception("❌ Error in /api/getScenariosByModule")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/start-training-call")
async def start_training_call(request: Request):
    try:
        data = await request.json()

        required_fields = ["call_id", "user_id", "module_id", "scenario_id"]
        for field in required_fields:
            if not data.get(field):
                raise HTTPException(status_code=400, detail=f"Missing field: {field}")

        call_id = data["call_id"]
        user_id = data["user_id"]
        module_id = data["module_id"]
        scenario_id = data["scenario_id"]

        logger.info(f"📥 /api/start-training-call → call_id={call_id}, user_id={user_id}")

        # Check if call_id already exists
        existing = supabase.table("training_sessions").select("id").eq("call_id", call_id).maybe_single().execute()
        if existing and existing.data:
            logger.warning(f"⚠️ Call ID {call_id} already exists in training_sessions")
            return {"status": "exists", "call_id": call_id}

        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        agent_id = "17c2b88e-097d-4b53-aea3-b4871cb48339"

        payload = {
            "call_id": call_id,
            "user_id": user_id,
            "agent_id": agent_id,
            "module_id": module_id,
            "scenario_id": scenario_id,
            "started_at": now,
            "created_at": now
        }

        supabase.table("training_sessions").insert(payload).execute()
        logger.info(f"✅ Inserted training_sessions for call_id={call_id}")
        return {"status": "inserted", "call_id": call_id}

    except Exception as e:
        logger.exception("❌ Error in /api/start-training-call")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/log-call")
async def log_call_post(data: CallLogRequest):
    try:
        logger.info(f"📥 POST /api/log-call → data: {data}")
        session_res = supabase.table("training_sessions").select("*").eq("call_id", data.call_id).maybe_single().execute()

        if not session_res or not session_res.data:
            logger.warning(f"❌ No session found for call_id={data.call_id}")
            return {
                "message": "not found",
                "transcript": "", 
                "duration": 0, 
                "score": 0,
                "summary": "", 
                "sentiment": "neutral",
                "feedback": "No feedback available",
                "passed": False,
                "xp": 0
            }

        session = session_res.data
        logger.debug(f"📥 POST log-call found → transcript length={len(session.get('transcript') or '')}")

        return {
            "message": "found",
            "transcript": session.get("transcript") or "",
            "duration": session.get("duration") or 0,
            "score": session.get("score") or 0,
            "summary": session.get("summary") or "",
            "sentiment": session.get("sentiment") or "neutral",
            "feedback": session.get("feedback") or session.get("summary") or "Training session completed successfully.",
            "passed": session.get("passed") or False,
            "xp": session.get("xp") or 0,
            "bonus_xp": session.get("bonus_xp") or 0
        }
    except Exception as e:
        logger.exception("🔥 Error in POST /api/log-call")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/update-call-id")
async def update_call_id(data: UpdateCallIdRequest):
    try:
        logger.info(f"🔄 Updating call_id from {data.old_call_id} to {data.new_call_id}")
        
        # Update the training_sessions record
        update_result = supabase.table("training_sessions").update({
            "call_id": data.new_call_id
        }).eq("call_id", data.old_call_id).execute()
        
        if update_result.data:
            logger.info(f"✅ Successfully updated call_id: {update_result.data}")
            return {"status": "updated", "old_call_id": data.old_call_id, "new_call_id": data.new_call_id}
        else:
            logger.warning(f"⚠️ No record found with call_id: {data.old_call_id}")
            return {"status": "not_found", "old_call_id": data.old_call_id}

    except Exception as e:
        logger.exception("🔥 Error updating call_id")
        raise HTTPException(status_code=500, detail=str(e))

# ✅ NEW: User stats endpoint for dashboard
@app.get("/api/getUserStats/{user_id}")
def get_user_stats(user_id: str):
    """Get comprehensive user statistics from training_sessions"""
    try:
        logger.info(f"📊 Fetching user stats for user_id: {user_id}")
        
        # Get all sessions for the user
        sessions_res = supabase.table("training_sessions").select(
            "score, xp, bonus_xp, passed, duration, created_at"
        ).eq("user_id", user_id).execute()
        
        sessions = sessions_res.data if sessions_res.data else []
        
        if not sessions:
            return {
                "user_id": user_id,
                "total_sessions": 0,
                "total_xp": 0,
                "average_score": 0,
                "passed_sessions": 0,
                "failed_sessions": 0,
                "total_training_time": 0,
                "last_session_date": None
            }
        
        # Calculate statistics
        total_sessions = len(sessions)
        total_xp = sum(session.get("xp", 0) + session.get("bonus_xp", 0) for session in sessions)
        scores = [session.get("score", 0) for session in sessions if session.get("score") is not None]
        average_score = sum(scores) / len(scores) if scores else 0
        passed_sessions = sum(1 for session in sessions if session.get("passed", False))
        failed_sessions = total_sessions - passed_sessions
        total_training_time = sum(session.get("duration", 0) for session in sessions)
        last_session_date = max(session.get("created_at") for session in sessions) if sessions else None
        
        return {
            "user_id": user_id,
            "total_sessions": total_sessions,
            "total_xp": total_xp,
            "average_score": round(average_score, 2),
            "passed_sessions": passed_sessions,
            "failed_sessions": failed_sessions,
            "pass_rate": round((passed_sessions / total_sessions) * 100, 1) if total_sessions > 0 else 0,
            "total_training_time": total_training_time,
            "last_session_date": last_session_date
        }
        
    except Exception as e:
        logger.exception(f"❌ Error getting user stats for {user_id}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Root endpoint
@app.get("/")
def read_root():
    return {
        "message": "Training Platform API - Enhanced with Outbound Call Support",
        "status": "running",
        "version": "2.1.0",
        "features": {
            "training_calls": "Enhanced scoring and feedback system",
            "outbound_calls": "Regular call logging to call_logs table",
            "dual_webhook": "Handles both training and regular calls"
        },
        "endpoints": {
            "webhook": "/webhook",
            "log_call": "/log-call",
            "call_status": "/api/call-status/{call_id}",
            "training_calls": "/api/getTrainingCalls",
            "call_logs": "/api/getCallLogs",
            "call_log_details": "/api/getCallLog/{call_id}",
            "user_stats": "/api/getUserStats/{user_id}",
            "health": "/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
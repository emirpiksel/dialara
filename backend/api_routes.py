"""
API route handlers for the training platform
"""
from fastapi import HTTPException, Request
from datetime import datetime
from models import *
from database import *
from scoring_service import score_call, analyze_sentiment
from config import get_config
import logging
import json
import requests

logger = logging.getLogger(__name__)
config = get_config()

async def handle_log_call(call_id: str):
    """Handle GET /log-call endpoint"""
    try:
        logger.info(f"📤 GET /log-call?call_id={call_id}")
        
        # Handle test/mock call IDs gracefully
        if call_id.startswith("test-call-id-") or call_id.startswith("mock-"):
            logger.info(f"🧪 Test call ID detected: {call_id}")
            return {
                "message": "test_call",
                "transcript": "This is a test call for UI testing purposes.",
                "duration": 30,
                "score": 7,
                "summary": "Test call completed successfully",
                "sentiment": "neutral",
                "feedback": "This is a test call - no real analysis performed.",
                "xp": 70,
                "passed": True,
                "call_id": call_id,
                "retrieved_at": datetime.utcnow().isoformat(),
                "has_complete_data": True
            }
        
        session_data = get_training_session(call_id)
        
        if not session_data:
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

        logger.info(f"✅ Found session data for call_id={call_id}")
        
        # Extract and validate data with better defaults
        transcript = session_data.get("transcript") or ""
        summary = session_data.get("summary") or ""
        feedback = session_data.get("feedback") or summary or "Training session completed successfully."
        score = session_data.get("score") or 0
        sentiment = session_data.get("sentiment") or "neutral"
        duration = session_data.get("duration") or 0
        xp = session_data.get("xp") or (score * 10)
        bonus_xp = session_data.get("bonus_xp") or 0
        passed = session_data.get("passed") if session_data.get("passed") is not None else (score >= 5)
        
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
            "has_complete_data": bool(transcript.strip() and score > 0)
        }
        
        return response_data

    except Exception as e:
        logger.exception(f"🔥 Error in /log-call for call_id={call_id}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve call log: {str(e)}")

async def handle_call_status(call_id: str):
    """Handle GET /api/call-status/{call_id} endpoint"""
    try:
        logger.info(f"⚡ Quick status check for call_id: {call_id}")
        
        # Handle test/mock call IDs gracefully
        if call_id.startswith("test-call-id-") or call_id.startswith("mock-"):
            logger.info(f"🧪 Test call ID detected: {call_id}")
            return {
                "status": "test_call",
                "processed": False,
                "call_id": call_id,
                "message": "Test call - no session expected",
                "checked_at": datetime.utcnow().isoformat()
            }
        
        session_data = get_training_session(call_id)
        
        if not session_data:
            logger.info(f"📭 No session found for call_id: {call_id}")
            return {
                "status": "not_found", 
                "processed": False,
                "call_id": call_id,
                "checked_at": datetime.utcnow().isoformat()
            }
        
        # Check if the webhook has processed this call
        has_transcript = bool(session_data.get("transcript", "").strip())
        has_score = session_data.get("score", 0) > 0
        has_feedback = bool(session_data.get("feedback", "").strip())
        
        # Consider it "processed" if we have both transcript and score
        is_processed = has_transcript and has_score
        
        logger.info(f"📊 Status for {call_id}: processed={is_processed}, transcript={has_transcript}, score={has_score}")
        
        return {
            "status": "found",
            "processed": is_processed,
            "has_transcript": has_transcript,
            "has_score": has_score,
            "has_feedback": has_feedback,
            "score": session_data.get("score", 0),
            "transcript_length": len(session_data.get("transcript", "")),
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

async def handle_get_call_logs():
    """Handle GET /api/getCallLogs endpoint"""
    try:
        logger.info("📥 Fetching call logs...")
        
        call_logs = get_call_logs()
        
        logger.info(f"✅ Found {len(call_logs)} call logs")
        return call_logs
        
    except Exception as e:
        logger.exception("❌ Error in /api/getCallLogs")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_call_log_details(call_id: str):
    """Handle GET /api/getCallLog/{call_id} endpoint"""
    try:
        logger.info(f"📥 Getting call log details for call_id: {call_id}")
        
        call_log = get_call_log_by_id(call_id)
        
        if not call_log:
            logger.warning(f"⚠️ No call log found for call_id: {call_id}")
            raise HTTPException(status_code=404, detail="Call log not found")
        
        return call_log
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ Error getting call log details for {call_id}")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_training_calls():
    """Handle GET /api/getTrainingCalls endpoint"""
    try:
        logger.info("📥 Fetching training sessions...")
        
        training_calls = get_training_sessions()
        
        logger.info(f"✅ Found {len(training_calls)} training sessions")
        return training_calls
        
    except Exception as e:
        logger.exception("❌ Error in /api/getTrainingCalls")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_training_calls_with_names():
    """Handle GET /api/getTrainingCallsWithNames endpoint"""
    try:
        logger.info("📥 Fetching training sessions with names...")
        
        training_calls = get_training_sessions_with_names()
        
        return training_calls
        
    except Exception as e:
        logger.exception("❌ Error in /api/getTrainingCallsWithNames")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_call_details(call_id: str):
    """Handle GET /api/getCallDetails endpoint"""
    try:
        logger.info(f"📥 Getting call details for call_id: {call_id}")
        
        # Redirect to the optimized log-call endpoint
        return await handle_log_call(call_id)
        
    except Exception as e:
        logger.exception(f"❌ Error getting call details for {call_id}")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_analyze_training_call(data: AnalyzeTrainingCallRequest):
    """Handle POST /api/analyze-training-call endpoint"""
    logger.info(f"📥 /api/analyze-training-call → data: {data}")
    try:
        logger.debug(f"🧠 Transcript preview (first 150 chars): {data.transcript[:150]}")

        score = score_call(data.transcript, data.duration)
        sentiment = analyze_sentiment(data.transcript)

        # Update training session
        update_training_session(data.call_id, {
            "score": score,
            "sentiment": sentiment,
        })

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

async def handle_start_simulation(data: StartCallRequest):
    """Handle POST /api/start-simulation endpoint"""
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

        scenario = get_scenario_by_id(data.scenario_id)
        if not scenario:
            logger.warning("❌ Scenario not found")
            raise HTTPException(status_code=404, detail="Scenario not found")

        module = scenario["training_modules"]
        category = module["training_categories"]

        prompt_template = scenario.get("prompt_template") or "You are handling a session titled {{title}}."
        prompt = prompt_template.replace("{{title}}", scenario["title"]) \
                                .replace("{{module}}", module["title"]) \
                                .replace("{{category}}", category["name"])

        # For web calls, we don't call Vapi REST API - the frontend vapi.start() handles it
        # We just need to generate a temporary call_id and create the training session
        
        # Generate a proper UUID as temporary call_id (will be updated with real Vapi call_id)
        import uuid
        temp_call_id = str(uuid.uuid4())
        
        logger.info(f"🌐 Creating web call training session with temp UUID: {temp_call_id}")
        logger.info(f"📋 Session will be updated with real Vapi call_id when Web SDK starts the call")

        now = datetime.utcnow().isoformat()
        universal_agent_id = config.universal_agent_id

        # Create training session with temporary call_id
        session_payload = {
            "call_id": temp_call_id,
            "user_id": data.user_id,
            "agent_id": universal_agent_id,
            "module_id": data.module_id,
            "scenario_id": data.scenario_id,
            "started_at": now,
            "created_at": now
        }
        
        logger.info(f"💾 Inserting training session with temp UUID: {session_payload}")
        
        try:
            insert_result = insert_training_session(session_payload)
            logger.info(f"✅ Training session created successfully with temp UUID: {temp_call_id}")
            logger.debug(f"✅ Insert result: {insert_result}")
        except Exception as e:
            logger.exception(f"🔥 Failed to create training session for temp UUID: {temp_call_id}")
            logger.error(f"🔥 Session payload was: {session_payload}")
            raise HTTPException(status_code=500, detail=f"Failed to create training session: {str(e)}")

        logger.info(f"✅ Web call training session prepared → temp UUID: {temp_call_id}")
        logger.info(f"🎯 Frontend will now start actual web call with vapi.start() and update to real call_id")

        return {
            "message": "Training session prepared for web call",
            "call_id": temp_call_id,
            "status": "prepared",
            "assistant_id": config.vapi_assistant_id,
            "scenario": {
                "title": scenario["title"],
                "first_message": scenario["first_message"],
                "prompt": prompt
            }
        }

    except Exception as e:
        logger.exception("🔥 Error in /api/start-simulation")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_end_training_session(data: EndSessionRequest):
    """Handle POST /api/end-training-session endpoint"""
    try:
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"🛑 Ending training session → call_id: {data.call_id} at {now}")
        
        update_training_session(data.call_id, {
            "ended_at": now
        })

        logger.info(f"✅ Training session ended → call_id: {data.call_id}")
        return {"status": "ended", "call_id": data.call_id}
    except Exception as e:
        logger.exception("🔥 Error in /api/end-training-session")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_universal_agent():
    """Handle GET /api/getUniversalAgent endpoint"""
    try:
        logger.info("📥 Fetching universal agent...")
        logger.info(f"Looking for universal agent with vapi_agent_id: {config.vapi_assistant_id}")
        agents = get_universal_agent(config.vapi_assistant_id)

        if not agents:
            logger.warning("⚠️ No agent found with matching vapi_agent_id")
            # Return a fallback universal agent object for training
            fallback_agent = {
                "id": config.universal_agent_id,
                "vapi_agent_id": config.vapi_assistant_id,
                "name": "Universal Training Agent",
                "description": "Default agent for training simulations"
            }
            logger.info("🔄 Returning fallback universal agent")
            return [fallback_agent]

        return agents
    except Exception as e:
        logger.exception("❌ Error in /api/getUniversalAgent")
        raise HTTPException(status_code=500, detail="Error fetching universal agent")

async def handle_get_leaderboard():
    """Handle GET /api/getLeaderboard endpoint"""
    try:
        leaderboard = get_leaderboard()
        return leaderboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_modules():
    """Handle GET /api/getModules endpoint"""
    try:
        modules = get_training_modules()
        return modules
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_modules_by_category(category_id: str):
    """Handle GET /api/getModulesByCategory/{category_id} endpoint"""
    try:
        modules = get_modules_by_category(category_id)
        return modules
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_training_categories():
    """Handle GET /api/getTrainingCategories endpoint"""
    try:
        categories = get_training_categories()
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_training_agents_by_module(module_id: str):
    """Handle GET /api/getTrainingAgentsByModule/{module_id} endpoint"""
    try:
        agents = get_training_agents_by_module(module_id)
        return agents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_scenarios_by_module(module_id: str):
    """Handle GET /api/getScenariosByModule/{module_id} endpoint"""
    try:
        logger.info(f"📥 Fetching scenarios for module_id={module_id}")
        
        scenarios = get_scenarios_by_module(module_id)
        return scenarios
    except Exception as e:
        logger.exception("❌ Error in /api/getScenariosByModule")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_start_training_call(request: Request):
    """Handle POST /api/start-training-call endpoint"""
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
        existing = get_training_session(call_id)
        if existing:
            logger.warning(f"⚠️ Call ID {call_id} already exists in training_sessions")
            return {"status": "exists", "call_id": call_id}

        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        agent_id = config.universal_agent_id

        payload = {
            "call_id": call_id,
            "user_id": user_id,
            "agent_id": agent_id,
            "module_id": module_id,
            "scenario_id": scenario_id,
            "started_at": now,
            "created_at": now
        }

        insert_training_session(payload)
        logger.info(f"✅ Inserted training_sessions for call_id={call_id}")
        return {"status": "inserted", "call_id": call_id}

    except Exception as e:
        logger.exception("❌ Error in /api/start-training-call")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_log_call_post(data: CallLogRequest):
    """Handle POST /api/log-call endpoint"""
    try:
        logger.info(f"📥 POST /api/log-call → data: {data}")
        session = get_training_session(data.call_id)

        if not session:
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

async def handle_update_call_id(data: UpdateCallIdRequest):
    """Handle POST /api/update-call-id endpoint"""
    try:
        logger.info(f"🔄 Updating call_id from {data.old_call_id} to {data.new_call_id}")
        
        # Validate that new_call_id is a valid UUID format
        import uuid
        try:
            uuid.UUID(data.new_call_id)
            logger.info(f"✅ New call_id is valid UUID format: {data.new_call_id}")
        except ValueError:
            logger.error(f"❌ Invalid UUID format for new_call_id: {data.new_call_id}")
            raise HTTPException(status_code=400, detail=f"Invalid UUID format for new_call_id: {data.new_call_id}")
        
        # Update the training_sessions record
        update_result = update_training_session(data.old_call_id, {
            "call_id": data.new_call_id
        })
        
        if update_result:
            logger.info(f"✅ Successfully updated call_id: {data.old_call_id} → {data.new_call_id}")
            return {"status": "updated", "old_call_id": data.old_call_id, "new_call_id": data.new_call_id}
        else:
            logger.warning(f"⚠️ No record found with call_id: {data.old_call_id}")
            return {"status": "not_found", "old_call_id": data.old_call_id}

    except Exception as e:
        logger.exception("🔥 Error updating call_id")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_user_stats(user_id: str):
    """Handle GET /api/getUserStats/{user_id} endpoint"""
    try:
        logger.info(f"📊 Fetching user stats for user_id: {user_id}")
        
        sessions = get_user_stats(user_id)
        
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
        
        # Calculate statistics with proper None handling
        total_sessions = len(sessions)
        total_xp = sum((session.get("xp") or 0) + (session.get("bonus_xp") or 0) for session in sessions)
        scores = [session.get("score") or 0 for session in sessions if session.get("score") is not None]
        average_score = sum(scores) / len(scores) if scores else 0
        passed_sessions = sum(1 for session in sessions if session.get("passed", False))
        failed_sessions = total_sessions - passed_sessions
        total_training_time = sum(session.get("duration") or 0 for session in sessions if session.get("duration") is not None)
        last_session_date = max((session.get("created_at") for session in sessions if session.get("created_at") is not None), default=None)
        
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

async def handle_get_user_analytics(user_id: str, request: Request):
    """Handle GET /api/user-analytics/{user_id} endpoint"""
    try:
        # Get requesting user info for auth check
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=401, detail="Authorization header required")
        
        # For now, we'll extract user_id from request body or use a simple check
        # In production, you'd validate the JWT token here
        request_user_id = request.headers.get("X-User-ID")
        is_admin = request.headers.get("X-Is-Admin") == "true"
        
        # Auth check: admins can see all users, users can only see their own
        if not is_admin and request_user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        logger.info(f"📊 Fetching user analytics for user_id: {user_id}")
        
        sessions = get_user_analytics(user_id)
        
        if not sessions:
            return {
                "user_id": user_id,
                "total_sessions": 0,
                "total_xp": 0,
                "average_score": 0,
                "passed_sessions": 0,
                "failed_sessions": 0,
                "sentiment_breakdown": {"positive": 0, "neutral": 0, "negative": 0},
                "recent_scores": [],
                "pass_rate": 0,
                "total_training_time": 0,
                "last_session_date": None
            }
        
        # Calculate comprehensive statistics with proper None handling
        total_sessions = len(sessions)
        total_xp = sum((session.get("xp") or 0) + (session.get("bonus_xp") or 0) for session in sessions)
        scores = [session.get("score") or 0 for session in sessions if session.get("score") is not None]
        average_score = sum(scores) / len(scores) if scores else 0
        passed_sessions = sum(1 for session in sessions if session.get("passed", False))
        failed_sessions = total_sessions - passed_sessions
        total_training_time = sum(session.get("duration") or 0 for session in sessions if session.get("duration") is not None)
        
        # Sentiment breakdown
        sentiment_breakdown = {"positive": 0, "neutral": 0, "negative": 0}
        for session in sessions:
            sentiment = session.get("sentiment", "neutral")
            if sentiment in sentiment_breakdown:
                sentiment_breakdown[sentiment] += 1
        
        # Recent scores for graph (last 30 days)
        from datetime import datetime, timedelta
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_scores = []
        for session in sessions:
            if session.get("created_at") and session.get("score") is not None:
                try:
                    session_date = datetime.fromisoformat(session["created_at"].replace("Z", "+00:00"))
                    if session_date >= thirty_days_ago:
                        recent_scores.append({
                            "date": session["created_at"],
                            "score": session.get("score") or 0
                        })
                except:
                    pass
        
        # Sort by date
        recent_scores.sort(key=lambda x: x["date"])
        
        return {
            "user_id": user_id,
            "total_sessions": total_sessions,
            "total_xp": total_xp,
            "average_score": round(average_score, 2),
            "passed_sessions": passed_sessions,
            "failed_sessions": failed_sessions,
            "sentiment_breakdown": sentiment_breakdown,
            "recent_scores": recent_scores[-30:],  # Last 30 data points
            "pass_rate": round((passed_sessions / total_sessions) * 100, 1) if total_sessions > 0 else 0,
            "total_training_time": total_training_time,
            "last_session_date": max(session.get("created_at") for session in sessions) if sessions else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ Error getting user analytics for {user_id}")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_comprehensive_leaderboard(request: Request):
    """Handle GET /api/leaderboard endpoint"""
    try:
        # Get requesting user info for auth check
        is_admin = request.headers.get("X-Is-Admin") == "true"
        request_user_id = request.headers.get("X-User-ID")
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        logger.info("🏆 Fetching comprehensive leaderboard")
        
        users_with_sessions = get_comprehensive_leaderboard()
        
        leaderboard = []
        for user in users_with_sessions:
            sessions = user.get("training_sessions", [])
            if not sessions:
                continue
            
            # Calculate stats for this user with proper None handling
            total_sessions = len(sessions)
            total_xp = sum((session.get("xp") or 0) + (session.get("bonus_xp") or 0) for session in sessions)
            scores = [session.get("score") or 0 for session in sessions if session.get("score") is not None]
            average_score = sum(scores) / len(scores) if scores else 0
            passed_sessions = sum(1 for session in sessions if session.get("passed", False))
            pass_rate = (passed_sessions / total_sessions) * 100 if total_sessions > 0 else 0
            
            # Sentiment breakdown
            sentiment_breakdown = {"positive": 0, "neutral": 0, "negative": 0}
            for session in sessions:
                sentiment = session.get("sentiment", "neutral")
                if sentiment in sentiment_breakdown:
                    sentiment_breakdown[sentiment] += 1
            
            leaderboard.append({
                "user_id": user["id"],
                "full_name": user.get("full_name", "Unknown"),
                "email": user.get("email", ""),
                "total_xp": total_xp,
                "average_score": round(average_score, 2),
                "total_sessions": total_sessions,
                "passed_sessions": passed_sessions,
                "pass_rate": round(pass_rate, 1),
                "sentiment_breakdown": sentiment_breakdown,
                "last_session": max(session.get("created_at") for session in sessions) if sessions else None
            })
        
        # Sort by total XP (descending) and add ranks
        leaderboard.sort(key=lambda x: x["total_xp"], reverse=True)
        for i, user in enumerate(leaderboard):
            user["rank"] = i + 1
        
        return leaderboard
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("❌ Error getting comprehensive leaderboard")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_user_training_calls(user_id: str, request: Request):
    """Handle GET /api/user-calls/{user_id} endpoint"""
    try:
        # Get requesting user info for auth check
        is_admin = request.headers.get("X-Is-Admin") == "true"
        request_user_id = request.headers.get("X-User-ID")
        
        # Auth check: admins can see all users, users can only see their own
        if not is_admin and request_user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        logger.info(f"📞 Fetching training calls for user_id: {user_id}")
        
        calls = get_user_training_calls(user_id)
        
        # Format the calls for frontend consumption
        formatted_calls = []
        for call in calls:
            formatted_calls.append({
                "id": call.get("id"),
                "call_id": call.get("call_id"),
                "score": call.get("score") or 0,
                "sentiment": call.get("sentiment", "neutral"),
                "xp": call.get("xp") or 0,
                "bonus_xp": call.get("bonus_xp") or 0,
                "passed": call.get("passed", False),
                "duration": call.get("duration") or 0,
                "created_at": call.get("created_at"),
                "started_at": call.get("started_at"),
                "ended_at": call.get("ended_at"),
                "feedback": call.get("feedback", ""),
                "summary": call.get("summary", ""),
                "transcript_preview": call.get("transcript", "")[:200] + "..." if call.get("transcript", "") else "No transcript available"
            })
        
        return {
            "user_id": user_id,
            "total_calls": len(formatted_calls),
            "calls": formatted_calls
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ Error getting user training calls for {user_id}")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_training_user_analytics(user_id: str, request: Request):
    """Handle GET /api/training/user-analytics/{user_id} endpoint"""
    try:
        # Get requesting user info for auth check
        is_admin = request.headers.get("X-Is-Admin") == "true"
        request_user_id = request.headers.get("X-User-ID")
        
        # Auth check: admins can see all users, users can only see their own
        if not is_admin and request_user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        logger.info(f"📊 Fetching training analytics for user_id: {user_id}")
        
        # Get user info
        user_info = get_user_by_id(user_id)
        if not user_info:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get training sessions data
        sessions = get_user_analytics(user_id)
        
        if not sessions:
            return {
                "user_id": user_id,
                "user_name": user_info.get("full_name", "Unknown"),
                "user_email": user_info.get("email", ""),
                "total_training_calls": 0,
                "total_xp": 0,
                "bonus_xp": 0,
                "average_score": 0,
                "passed_sessions": 0,
                "failed_sessions": 0,
                "pass_fail_ratio": 0,
                "sentiment_breakdown": {"positive": 0, "neutral": 0, "negative": 0},
                "score_trend": [],
                "total_training_time": 0,
                "last_session_date": None,
                "recent_sessions": []
            }
        
        # Calculate training-specific statistics with proper None handling
        total_training_calls = len(sessions)
        base_xp = sum(session.get("xp") or 0 for session in sessions if session.get("xp") is not None)
        bonus_xp = sum(session.get("bonus_xp") or 0 for session in sessions if session.get("bonus_xp") is not None)
        total_xp = base_xp + bonus_xp
        
        scores = [session.get("score") or 0 for session in sessions if session.get("score") is not None]
        average_score = sum(scores) / len(scores) if scores else 0
        
        passed_sessions = sum(1 for session in sessions if session.get("passed", False))
        failed_sessions = total_training_calls - passed_sessions
        pass_fail_ratio = (passed_sessions / total_training_calls) * 100 if total_training_calls > 0 else 0
        
        # Sentiment breakdown
        sentiment_breakdown = {"positive": 0, "neutral": 0, "negative": 0}
        for session in sessions:
            sentiment = session.get("sentiment", "neutral")
            if sentiment in sentiment_breakdown:
                sentiment_breakdown[sentiment] += 1
        
        # Score trend for last 30 days
        from datetime import datetime, timedelta
        thirty_days_ago = datetime.now() - timedelta(days=30)
        score_trend = []
        for session in sessions:
            if session.get("created_at") and session.get("score") is not None:
                try:
                    session_date = datetime.fromisoformat(session["created_at"].replace("Z", "+00:00"))
                    if session_date >= thirty_days_ago:
                        score_trend.append({
                            "date": session["created_at"],
                            "score": session.get("score") or 0,
                            "passed": session.get("passed", False)
                        })
                except:
                    pass
        
        # Sort by date
        score_trend.sort(key=lambda x: x["date"])
        
        # Recent sessions (last 10)
        recent_sessions = []
        for session in sessions[:10]:  # sessions are already ordered by created_at desc
            recent_sessions.append({
                "id": session.get("id"),
                "score": session.get("score") or 0,
                "sentiment": session.get("sentiment", "neutral"),
                "xp": session.get("xp") or 0,
                "bonus_xp": session.get("bonus_xp") or 0,
                "passed": session.get("passed", False),
                "created_at": session.get("created_at"),
                "feedback": session.get("feedback", "")[:100] + "..." if session.get("feedback", "") else ""
            })
        
        total_training_time = sum(session.get("duration") or 0 for session in sessions if session.get("duration") is not None)
        last_session_date = max((session.get("created_at") for session in sessions if session.get("created_at") is not None), default=None)
        
        return {
            "user_id": user_id,
            "user_name": user_info.get("full_name", "Unknown"),
            "user_email": user_info.get("email", ""),
            "total_training_calls": total_training_calls,
            "total_xp": total_xp,
            "base_xp": base_xp,
            "bonus_xp": bonus_xp,
            "average_score": round(average_score, 2),
            "passed_sessions": passed_sessions,
            "failed_sessions": failed_sessions,
            "pass_fail_ratio": round(pass_fail_ratio, 1),
            "sentiment_breakdown": sentiment_breakdown,
            "score_trend": score_trend[-30:],  # Last 30 data points
            "total_training_time": total_training_time,
            "last_session_date": last_session_date,
            "recent_sessions": recent_sessions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ Error getting training user analytics for {user_id}")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_update_training_call(request: Request):
    """Handle PATCH /api/update-training-call endpoint"""
    try:
        data = await request.json()
        
        # Validate required fields
        if not data.get("call_id"):
            raise HTTPException(status_code=400, detail="call_id is required")
        
        call_id = data["call_id"]
        user_id = data.get("user_id")
        
        # Validate user is admin
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Check if user is admin
        user_data = get_user_by_id(user_id)
        if not user_data or user_data.get("role") not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        logger.info(f"🔧 Admin {user_id} updating training call {call_id}")
        
        # Build update payload with only provided fields
        update_payload = {}
        
        if "score" in data:
            score = data["score"]
            # Validate score is a number between 0 and 10
            if not isinstance(score, (int, float)) or score < 0 or score > 10:
                raise HTTPException(status_code=400, detail="Score must be a number between 0 and 10")
            update_payload["score"] = score
        
        if "sentiment" in data:
            sentiment = data["sentiment"]
            # Validate sentiment is one of the allowed values
            if sentiment not in ["positive", "negative", "neutral"]:
                raise HTTPException(status_code=400, detail="Sentiment must be 'positive', 'negative', or 'neutral'")
            update_payload["sentiment"] = sentiment
        
        if "feedback" in data:
            feedback = data["feedback"]
            # Validate feedback is a string
            if not isinstance(feedback, str):
                raise HTTPException(status_code=400, detail="Feedback must be a string")
            update_payload["feedback"] = feedback
        
        if not update_payload:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # Check if training session exists
        session = get_training_session(call_id)
        if not session:
            raise HTTPException(status_code=404, detail="Training call not found")
        
        # Update the training session
        update_result = update_training_session(call_id, update_payload)
        
        if update_result:
            logger.info(f"✅ Successfully updated training call {call_id} by admin {user_id}")
            return {
                "status": "updated", 
                "call_id": call_id, 
                "updated_fields": list(update_payload.keys()),
                "message": "Training call updated successfully"
            }
        else:
            logger.warning(f"⚠️ Failed to update training call {call_id}")
            raise HTTPException(status_code=500, detail="Failed to update training call")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("🔥 Error updating training call")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_health_check():
    """Handle GET /health endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

async def handle_import_leads(data: LeadImportRequest):
    """Handle POST /api/import-leads endpoint"""
    try:
        logger.info(f"📥 Importing {len(data.leads)} leads for user {data.user_id}")
        
        # Validate user exists and has proper permissions
        user = get_user_by_id(data.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check consent confirmation
        if not data.consent_confirmed:
            raise HTTPException(status_code=400, detail="Consent confirmation required for lead import")
        
        # Validate and prepare leads data
        validated_leads = []
        errors = []
        
        for i, lead in enumerate(data.leads):
            try:
                # Validate required fields
                if not lead.get('clinic_name') or not lead.get('full_name') or not lead.get('phone_number'):
                    errors.append(f"Row {i+1}: Missing required fields (clinic_name, full_name, phone_number)")
                    continue
                
                # Prepare lead data with consent tracking
                lead_data = {
                    "clinic_name": str(lead['clinic_name']).strip(),
                    "full_name": str(lead['full_name']).strip(),
                    "phone_number": str(lead['phone_number']).strip(),
                    "email": str(lead.get('email', '')).strip() if lead.get('email') else None,
                    "source": str(lead.get('source', 'CSV Import')).strip(),
                    "notes": str(lead.get('notes', '')).strip() if lead.get('notes') else None,
                    "status": str(lead.get('status', 'new')).strip(),
                    "user_id": data.user_id,
                    "call_status": "pending",
                    # Compliance tracking
                    "consent_confirmed": data.consent_confirmed,
                    "consent_date": datetime.utcnow().isoformat(),
                    "data_source": "csv_import",
                    "gdpr_compliant": True,
                    "kvkk_compliant": True
                }
                
                validated_leads.append(lead_data)
                
            except Exception as e:
                errors.append(f"Row {i+1}: {str(e)}")
        
        if not validated_leads:
            raise HTTPException(status_code=400, detail="No valid leads to import")
        
        # Insert leads in bulk
        inserted_leads = insert_leads_bulk(validated_leads)
        
        logger.info(f"✅ Successfully imported {len(inserted_leads)} leads for user {data.user_id}")
        
        return {
            "status": "success",
            "imported_count": len(inserted_leads),
            "total_submitted": len(data.leads),
            "errors": errors,
            "leads": inserted_leads
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("❌ Error importing leads")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_get_leads(user_id: str = None):
    """Handle GET /api/leads endpoint"""
    try:
        logger.info(f"📥 Fetching leads for user: {user_id}")
        
        leads = get_leads(user_id)
        
        logger.info(f"✅ Found {len(leads)} leads")
        return {
            "status": "success",
            "count": len(leads),
            "leads": leads
        }
        
    except Exception as e:
        logger.exception("❌ Error fetching leads")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_hubspot_oauth_callback(code: str, user_id: str):
    """Handle HubSpot OAuth callback"""
    try:
        from hubspot_service import save_hubspot_credentials
        import requests
        
        # Exchange code for tokens
        token_url = "https://api.hubapi.com/oauth/v1/token"
        
        # Note: In production, you'd need to register your app with HubSpot
        # and get proper client_id and client_secret
        client_id = "your_hubspot_client_id"  # This would come from config
        client_secret = "your_hubspot_client_secret"  # This would come from config
        redirect_uri = "https://yourapp.com/api/hubspot/callback"  # Your callback URL
        
        data = {
            "grant_type": "authorization_code",
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "code": code
        }
        
        response = requests.post(token_url, data=data)
        response.raise_for_status()
        token_data = response.json()
        
        # Save credentials
        success = save_hubspot_credentials(user_id, token_data)
        
        if success:
            return {
                "status": "success",
                "message": "HubSpot connected successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save credentials")
            
    except Exception as e:
        logger.exception("Error in HubSpot OAuth callback")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_hubspot_sync_contacts(user_id: str):
    """Handle syncing HubSpot contacts to Dialara"""
    try:
        from hubspot_service import HubSpotSync
        
        sync = HubSpotSync(user_id)
        result = sync.sync_contacts_to_dialara()
        
        return result
        
    except Exception as e:
        logger.exception("Error syncing HubSpot contacts")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_hubspot_sync_status(user_id: str):
    """Handle getting HubSpot sync status"""
    try:
        from hubspot_service import get_hubspot_sync_status
        
        status = get_hubspot_sync_status(user_id)
        return status
        
    except Exception as e:
        logger.exception("Error getting HubSpot sync status")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_hubspot_disconnect(user_id: str):
    """Handle disconnecting HubSpot integration"""
    try:
        # Remove HubSpot credentials
        result = supabase.table("integrations").delete().eq("user_id", user_id).eq("provider", "hubspot").execute()
        
        return {
            "status": "success",
            "message": "HubSpot disconnected successfully"
        }
        
    except Exception as e:
        logger.exception("Error disconnecting HubSpot")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_calendar_oauth_callback(code: str, user_id: str):
    """Handle Google Calendar OAuth callback"""
    try:
        from calendar_service import save_calendar_credentials
        import requests
        
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        
        # Note: In production, you'd need proper client_id and client_secret
        client_id = "your_google_client_id"  # This would come from config
        client_secret = "your_google_client_secret"  # This would come from config
        redirect_uri = "https://yourapp.com/api/calendar/callback"  # Your callback URL
        
        data = {
            "grant_type": "authorization_code",
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "code": code
        }
        
        response = requests.post(token_url, data=data)
        response.raise_for_status()
        token_data = response.json()
        
        # Save credentials
        success = save_calendar_credentials(user_id, token_data)
        
        if success:
            return {
                "status": "success",
                "message": "Google Calendar connected successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save credentials")
            
    except Exception as e:
        logger.exception("Error in Google Calendar OAuth callback")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_calendar_status(user_id: str):
    """Handle getting Google Calendar status"""
    try:
        from calendar_service import get_calendar_status
        
        status = get_calendar_status(user_id)
        return status
        
    except Exception as e:
        logger.exception("Error getting calendar status")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_calendar_disconnect(user_id: str):
    """Handle disconnecting Google Calendar integration"""
    try:
        # Remove calendar credentials
        result = supabase.table("integrations").delete().eq("user_id", user_id).eq("provider", "google_calendar").execute()
        
        return {
            "status": "success",
            "message": "Google Calendar disconnected successfully"
        }
        
    except Exception as e:
        logger.exception("Error disconnecting calendar")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_calendar_available_slots(data: dict):
    """Handle finding available calendar slots"""
    try:
        from calendar_service import ai_find_available_times
        
        user_id = data.get("user_id")
        start_date = data.get("start_date")
        duration = data.get("duration", "60")
        
        if not user_id or not start_date:
            raise HTTPException(status_code=400, detail="user_id and start_date are required")
        
        result = ai_find_available_times(user_id, start_date, duration)
        return result
        
    except Exception as e:
        logger.exception("Error finding available slots")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_calendar_schedule_meeting(data: dict):
    """Handle scheduling a meeting"""
    try:
        from calendar_service import ai_schedule_meeting
        
        user_id = data.get("user_id")
        title = data.get("title")
        start_time = data.get("start_time")
        duration = data.get("duration", "60")
        attendee_email = data.get("attendee_email", "")
        description = data.get("description", "")
        
        if not user_id or not title or not start_time:
            raise HTTPException(status_code=400, detail="user_id, title, and start_time are required")
        
        result = ai_schedule_meeting(user_id, title, start_time, duration, attendee_email, description)
        return result
        
    except Exception as e:
        logger.exception("Error scheduling meeting")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_calendar_next_available(data: dict):
    """Handle getting next available time slot"""
    try:
        from calendar_service import ai_get_next_available
        
        user_id = data.get("user_id")
        duration = data.get("duration", "60")
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        result = ai_get_next_available(user_id, duration)
        return result
        
    except Exception as e:
        logger.exception("Error getting next available slot")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_knowledge_upload(request):
    """Handle knowledge base document upload"""
    try:
        form = await request.form()
        file = form.get('file')
        user_id = form.get('user_id')
        
        if not file or not user_id:
            raise HTTPException(status_code=400, detail="File and user_id are required")
        
        # Read file content
        file_content = await file.read()
        filename = file.filename
        file_type = file.content_type
        
        # Process document
        from knowledge_base_service import KnowledgeBase
        kb = KnowledgeBase(user_id)
        result = kb.upload_document(file_content, filename, file_type)
        
        return result
        
    except Exception as e:
        logger.exception("Error uploading document")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_knowledge_search(data: dict):
    """Handle knowledge base search"""
    try:
        from knowledge_base_service import KnowledgeBase
        
        user_id = data.get("user_id")
        query = data.get("query")
        max_results = data.get("max_results", 5)
        
        if not user_id or not query:
            raise HTTPException(status_code=400, detail="user_id and query are required")
        
        kb = KnowledgeBase(user_id)
        results = kb.search_knowledge(query, max_results)
        
        return {
            "status": "success",
            "results": results,
            "total_found": len(results)
        }
        
    except Exception as e:
        logger.exception("Error searching knowledge base")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_knowledge_documents(user_id: str):
    """Handle getting user documents"""
    try:
        from knowledge_base_service import KnowledgeBase
        
        kb = KnowledgeBase(user_id)
        documents = kb.get_user_documents()
        
        return {
            "status": "success",
            "documents": documents,
            "total_count": len(documents)
        }
        
    except Exception as e:
        logger.exception("Error getting user documents")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_knowledge_delete_document(document_id: str, data: dict):
    """Handle deleting a document"""
    try:
        from knowledge_base_service import KnowledgeBase
        
        user_id = data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        kb = KnowledgeBase(user_id)
        success = kb.delete_document(document_id)
        
        if success:
            return {
                "status": "success",
                "message": "Document deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Document not found or could not be deleted")
        
    except Exception as e:
        logger.exception("Error deleting document")
        raise HTTPException(status_code=500, detail=str(e))

async def handle_root():
    """Handle GET / endpoint"""
    return {
        "message": "Training Platform API - Enhanced with Outbound Call Support",
        "status": "running",
        "version": "2.3.0",
        "features": {
            "training_calls": "Enhanced scoring and feedback system",
            "outbound_calls": "Regular call logging to call_logs table",
            "dual_webhook": "Handles both training and regular calls",
            "csv_import": "Bulk lead import with consent tracking",
            "hubspot_integration": "Two-way CRM sync with HubSpot",
            "calendar_integration": "AI-powered meeting scheduling with Google Calendar",
            "knowledge_base": "AI-powered document search and reference system"
        },
        "endpoints": {
            "webhook": "/webhook",
            "log_call": "/log-call",
            "call_status": "/api/call-status/{call_id}",
            "training_calls": "/api/getTrainingCalls",
            "call_logs": "/api/getCallLogs",
            "call_log_details": "/api/getCallLog/{call_id}",
            "user_stats": "/api/getUserStats/{user_id}",
            "import_leads": "/api/import-leads",
            "leads": "/api/leads",
            "hubspot_integration": "/api/hubspot/*",
            "calendar_integration": "/api/calendar/*",
            "knowledge_base": "/api/knowledge/*",
            "health": "/health"
        }
    }
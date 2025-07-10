"""
Webhook handler for processing Vapi call events.
Handles both training calls and regular calls with appropriate routing.
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any
from supabase import Client

from scoring_service import score_call_enhanced, analyze_sentiment
from config import get_config

logger = logging.getLogger(__name__)
config = get_config()


def determine_call_type(raw_json: dict, supabase: Client) -> str:
    """
    Determine if this is a training call or regular outbound call
    Returns: 'training' or 'outbound' or 'inbound' or 'webCall'
    """
    message = raw_json.get("message", {})
    call = message.get("call", {})
    call_type = call.get("type", "")
    call_id = call.get("id")
    
    # FIRST: Check if this is a training call by assistant ID
    assistant_id = call.get("assistantId") or call.get("assistant_id")
    if assistant_id:
        if assistant_id == config.vapi_assistant_id:
            logger.info(f"🎓 Call {call_id} identified as TRAINING call (assistant_id: {assistant_id})")
            return "training"
    
    # SECOND: Check if this is a training call by looking for training session
    if call_id:
        try:
            session_res = supabase.table("training_sessions").select("id").eq("call_id", call_id).maybe_single().execute()
            if session_res and session_res.data:
                logger.info(f"🎓 Call {call_id} identified as TRAINING call (found in training_sessions)")
                return "training"
        except Exception as e:
            logger.debug(f"Error checking training session: {e}")
    
    # THIRD: Determine call type based on Vapi call type
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


def handle_regular_call(raw_json: dict, call_type: str, supabase: Client) -> dict:
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

        # Prepare payload for call_logs table with compliance tracking
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
            "feedback": summary or "Call completed successfully",
            # Compliance fields
            "recording_consent": True,  # Assumed since call was made through platform
            "gdpr_compliant": True,
            "kvkk_compliant": True,
            "data_retention_notice": "Recording will be retained for 90 days unless specified otherwise"
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
            
            # End live call monitoring for this call
            try:
                from live_call_control_service import end_live_call
                end_live_call(call_id, ended_reason or "completed")
                logger.info(f"🔴 Ended live call monitoring for {call_id}")
            except Exception as e:
                logger.debug(f"Live call end attempt failed for call {call_id}: {e}")
                # Don't fail the webhook if live call cleanup fails
            
            # Try to sync call to HubSpot if user has integration enabled
            try:
                if user_id:
                    from hubspot_service import HubSpotSync
                    sync = HubSpotSync(user_id)
                    sync_result = sync.sync_call_to_hubspot(payload)
                    if sync_result.get("status") == "success":
                        logger.info(f"✅ Synced call {call_id} to HubSpot")
                    else:
                        logger.debug(f"HubSpot sync not available or failed for call {call_id}: {sync_result}")
            except Exception as e:
                logger.debug(f"HubSpot sync attempt failed for call {call_id}: {e}")
                # Don't fail the webhook if HubSpot sync fails
                
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


async def handle_training_call(raw_json: dict, supabase: Client) -> dict:
    """Handle training calls - enhanced processing with detailed scoring"""
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
            from scoring_service import score_call
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
            "agent_id": session.get("agent_id") or config.universal_agent_id,
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


async def process_webhook(request_json: dict, supabase: Client) -> dict:
    """
    Main webhook processing function that routes to appropriate handlers
    """
    try:
        logger.info(f"🔍 Raw webhook payload keys: {list(request_json.keys())}")
        logger.debug(f"📋 Full payload preview: {str(request_json)[:1000]}")

        # Log raw webhook data for debugging
        with open("webhook_raw.log", "a", encoding="utf-8") as f:
            f.write(json.dumps(request_json, indent=2) + "\n\n")

        message = request_json.get("message", {})
        event_type = message.get("type", "unknown")

        logger.info(f"🔍 Message keys: {list(message.keys()) if message else 'No message'}")
        logger.info(f"📨 Event type: {event_type}")

        # Handle function call events (calendar scheduling during calls)
        if event_type == "function-call":
            logger.info("🗓️ Processing function call event")
            return await handle_function_call(request_json, supabase)

        # Handle call start events for live monitoring
        if event_type == "call-start":
            logger.info("📞 Processing call start event for live monitoring")
            return await handle_call_start(request_json, supabase)

        # Handle transcript events for live monitoring
        if event_type == "transcript":
            logger.info("📝 Processing transcript event for live monitoring")
            return await handle_transcript_update(request_json, supabase)

        # Quick response for non-end-of-call events
        if event_type not in ["end-of-call-report", "call-start", "transcript"]:
            logger.info(f"ℹ️ Ignored webhook event type: {event_type}")
            return {"status": "ignored"}

        # Determine call type and route to appropriate handler
        call_type = determine_call_type(request_json, supabase)
        
        if call_type == "training":
            # Handle training calls
            return await handle_training_call(request_json, supabase)
        else:
            # Handle regular calls
            return handle_regular_call(request_json, call_type, supabase)

    except Exception as e:
        logger.exception("🔥 Webhook processing exception")
        return {"status": "error", "message": str(e)}


async def handle_function_call(raw_json: dict, supabase: Client) -> dict:
    """Handle Vapi function call events (e.g., calendar scheduling)"""
    try:
        message = raw_json.get("message", {})
        function_call = message.get("functionCall", {})
        
        function_name = function_call.get("name", "")
        parameters = function_call.get("parameters", {})
        call_id = message.get("call", {}).get("id", "")
        
        logger.info(f"🗓️ Function call: {function_name} with params: {parameters}")
        
        # Get user_id from call - you might need to adjust this based on your call tracking
        user_id = None
        if call_id:
            # Try to get user_id from call logs or training sessions
            call_result = supabase.table("call_logs").select("user_id").eq("call_id", call_id).maybe_single().execute()
            if call_result.data:
                user_id = call_result.data.get("user_id")
            else:
                # Try training sessions
                session_result = supabase.table("training_sessions").select("user_id").eq("call_id", call_id).maybe_single().execute()
                if session_result.data:
                    user_id = session_result.data.get("user_id")
        
        if not user_id:
            logger.warning(f"⚠️ Could not determine user_id for function call in call {call_id}")
            return {
                "status": "error",
                "message": "Could not determine user for function call"
            }
        
        # Handle calendar and knowledge base function calls
        if function_name in ["find_available_times", "schedule_meeting", "get_next_available", "search_knowledge"]:
            try:
                from vapi_functions import handle_vapi_function_call
                result = handle_vapi_function_call(function_name, parameters, user_id)
                
                # Log function call for analytics
                supabase.table('event_logs').insert({
                    'call_id': call_id,
                    'event_type': 'function_call',
                    'payload': {
                        'function_name': function_name,
                        'parameters': parameters,
                        'result': result,
                        'user_id': user_id
                    }
                }).execute()
                
                logger.info(f"✅ Function call {function_name} completed: {result.get('status', 'unknown')}")
                return {
                    "status": "success",
                    "function_result": result
                }
                
            except Exception as e:
                logger.exception(f"❌ Error handling function call {function_name}")
                return {
                    "status": "error",
                    "message": f"Function call error: {str(e)}"
                }
        else:
            logger.warning(f"⚠️ Unknown function call: {function_name}")
            return {
                "status": "error",
                "message": f"Unknown function: {function_name}"
            }
        
    except Exception as e:
        logger.exception("❌ Error processing function call")
        return {"status": "error", "message": str(e)}


async def handle_call_start(raw_json: dict, supabase: Client) -> dict:
    """Handle call start events for live monitoring"""
    try:
        message = raw_json.get("message", {})
        call = message.get("call", {})
        call_id = call.get("id")
        
        if not call_id:
            logger.warning("❌ Call start event missing call_id")
            return {"status": "error", "message": "Missing call_id"}
        
        logger.info(f"📞 Registering call {call_id} for live monitoring")
        
        # Extract call data for live monitoring
        customer = call.get("customer", {})
        caller_number = customer.get("number") or customer.get("phoneNumber") or "Unknown"
        customer_name = customer.get("name") or "Unknown Customer"
        call_type = call.get("type", "unknown")
        
        # Get agent info
        agent_id = call.get("assistantId") or None
        agent_name = "AI Assistant"
        
        # Try to get user_id from agent mapping
        user_id = None
        if agent_id:
            try:
                agent_res = supabase.table("ai_agents").select("user_id").eq("vapi_agent_id", agent_id).maybe_single().execute()
                if agent_res and agent_res.data:
                    user_id = agent_res.data.get("user_id")
            except Exception as e:
                logger.debug(f"Could not get user_id from agent: {e}")
        
        # Prepare call data for live monitoring
        call_data = {
            "call_id": call_id,
            "user_id": user_id or "",
            "caller_number": caller_number,
            "customer_name": customer_name,
            "call_type": call_type,
            "agent_name": agent_name
        }
        
        # Register call for live monitoring
        try:
            from live_call_control_service import register_live_call
            success = register_live_call(call_data)
            
            if success:
                logger.info(f"✅ Successfully registered call {call_id} for live monitoring")
                return {
                    "status": "ok",
                    "call_id": call_id,
                    "message": "Call registered for live monitoring"
                }
            else:
                logger.warning(f"⚠️ Failed to register call {call_id} for live monitoring")
                return {
                    "status": "warning",
                    "call_id": call_id,
                    "message": "Call registration failed"
                }
                
        except Exception as e:
            logger.exception(f"❌ Error registering call {call_id} for live monitoring")
            return {
                "status": "error",
                "call_id": call_id,
                "message": f"Registration error: {str(e)}"
            }
        
    except Exception as e:
        logger.exception("❌ Error processing call start event")
        return {"status": "error", "message": str(e)}


async def handle_transcript_update(raw_json: dict, supabase: Client) -> dict:
    """Handle transcript events for live monitoring"""
    try:
        message = raw_json.get("message", {})
        call = message.get("call", {})
        call_id = call.get("id")
        
        if not call_id:
            logger.warning("❌ Transcript event missing call_id")
            return {"status": "error", "message": "Missing call_id"}
        
        # Extract transcript data
        transcript_data = message.get("transcript", {})
        if not transcript_data:
            logger.debug(f"No transcript data in event for call {call_id}")
            return {"status": "ignored", "message": "No transcript data"}
        
        speaker = transcript_data.get("speaker", "unknown")
        text = transcript_data.get("text", "")
        confidence = transcript_data.get("confidence", 0.9)
        is_final = transcript_data.get("isFinal", True)
        
        # Prepare transcript event
        transcript_event = {
            "speaker": speaker,
            "message": text,
            "confidence": confidence,
            "is_final": is_final,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Update live transcript
        try:
            from live_call_control_service import update_live_transcript
            success = update_live_transcript(call_id, transcript_event)
            
            if success:
                logger.debug(f"📝 Updated transcript for call {call_id}: {speaker}: {text[:50]}...")
                return {
                    "status": "ok",
                    "call_id": call_id,
                    "message": "Transcript updated"
                }
            else:
                logger.debug(f"⚠️ Failed to update transcript for call {call_id}")
                return {
                    "status": "warning",
                    "call_id": call_id,
                    "message": "Transcript update failed"
                }
                
        except Exception as e:
            logger.debug(f"❌ Error updating transcript for call {call_id}: {e}")
            return {
                "status": "error",
                "call_id": call_id,
                "message": f"Transcript error: {str(e)}"
            }
        
    except Exception as e:
        logger.exception("❌ Error processing transcript event")
        return {"status": "error", "message": str(e)}
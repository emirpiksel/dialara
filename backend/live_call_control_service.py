"""
Live Call Control Service
Provides real-time monitoring and control of active calls for supervisors
"""

import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

from config import get_config
from database import get_supabase_client

logger = logging.getLogger(__name__)
config = get_config()
supabase = get_supabase_client()

class CallStatus(Enum):
    QUEUED = "queued"
    RINGING = "ringing"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    TRANSFERRING = "transferring"
    ENDED = "ended"
    FAILED = "failed"

class InterventionType(Enum):
    MUTE_AI = "mute_ai"
    UNMUTE_AI = "unmute_ai"
    PAUSE_CALL = "pause_call"
    RESUME_CALL = "resume_call"
    TRANSFER_HUMAN = "transfer_human"
    END_CALL = "end_call"
    SEND_MESSAGE = "send_message"
    UPDATE_CONTEXT = "update_context"

@dataclass
class LiveCall:
    call_id: str
    user_id: str
    caller_number: str
    call_type: str
    status: CallStatus
    started_at: datetime
    duration_seconds: int
    agent_name: str
    customer_name: Optional[str]
    current_transcript: str
    last_message: str
    sentiment: str
    is_ai_muted: bool
    supervisor_notes: str
    intervention_count: int
    last_activity: datetime

@dataclass
class CallIntervention:
    id: str
    call_id: str
    supervisor_id: str
    intervention_type: InterventionType
    message: Optional[str]
    timestamp: datetime
    success: bool
    response: Optional[str]

@dataclass
class LiveTranscriptEvent:
    call_id: str
    speaker: str  # "ai" or "customer"
    message: str
    timestamp: datetime
    confidence: float
    is_final: bool

class CallControlManager:
    """Manages live call monitoring and control"""
    
    def __init__(self):
        self.active_calls: Dict[str, LiveCall] = {}
        self.call_subscribers: Dict[str, List[str]] = {}  # call_id -> list of supervisor_ids
        self.supervisor_sessions: Dict[str, List[str]] = {}  # supervisor_id -> list of call_ids
    
    def register_call(self, call_data: Dict[str, Any]) -> bool:
        """Register a new call for monitoring"""
        try:
            call_id = call_data.get("call_id")
            if not call_id:
                return False
            
            live_call = LiveCall(
                call_id=call_id,
                user_id=call_data.get("user_id", ""),
                caller_number=call_data.get("caller_number", "Unknown"),
                call_type=call_data.get("call_type", "unknown"),
                status=CallStatus.IN_PROGRESS,
                started_at=datetime.utcnow(),
                duration_seconds=0,
                agent_name=call_data.get("agent_name", "AI Assistant"),
                customer_name=call_data.get("customer_name"),
                current_transcript="",
                last_message="",
                sentiment="neutral",
                is_ai_muted=False,
                supervisor_notes="",
                intervention_count=0,
                last_activity=datetime.utcnow()
            )
            
            self.active_calls[call_id] = live_call
            
            # Save to database for persistence
            call_record = {
                "call_id": call_id,
                "user_id": live_call.user_id,
                "caller_number": live_call.caller_number,
                "call_type": live_call.call_type,
                "status": live_call.status.value,
                "started_at": live_call.started_at.isoformat(),
                "agent_name": live_call.agent_name,
                "customer_name": live_call.customer_name,
                "created_at": datetime.utcnow().isoformat(),
                "is_active": True
            }
            
            supabase.table("live_calls").upsert(call_record, on_conflict=["call_id"]).execute()
            
            logger.info(f"📞 Registered live call: {call_id}")
            return True
            
        except Exception as e:
            logger.exception(f"Error registering call {call_data.get('call_id')}")
            return False
    
    def update_call_transcript(self, call_id: str, transcript_event: Dict[str, Any]) -> bool:
        """Update call with new transcript data"""
        try:
            if call_id not in self.active_calls:
                return False
            
            call = self.active_calls[call_id]
            
            # Update transcript
            speaker = transcript_event.get("speaker", "unknown")
            message = transcript_event.get("message", "")
            timestamp = datetime.utcnow()
            
            # Append to current transcript
            transcript_line = f"[{timestamp.strftime('%H:%M:%S')}] {speaker}: {message}"
            if call.current_transcript:
                call.current_transcript += "\n" + transcript_line
            else:
                call.current_transcript = transcript_line
            
            call.last_message = message
            call.last_activity = timestamp
            
            # Update sentiment if provided
            if transcript_event.get("sentiment"):
                call.sentiment = transcript_event["sentiment"]
            
            # Save transcript event to database
            transcript_record = {
                "call_id": call_id,
                "speaker": speaker,
                "message": message,
                "timestamp": timestamp.isoformat(),
                "confidence": transcript_event.get("confidence", 0.9),
                "is_final": transcript_event.get("is_final", True),
                "created_at": timestamp.isoformat()
            }
            
            supabase.table("live_transcript_events").insert(transcript_record).execute()
            
            return True
            
        except Exception as e:
            logger.exception(f"Error updating transcript for call {call_id}")
            return False
    
    def subscribe_supervisor(self, supervisor_id: str, call_id: str) -> bool:
        """Subscribe supervisor to monitor a call"""
        try:
            if call_id not in self.active_calls:
                return False
            
            # Add supervisor to call subscribers
            if call_id not in self.call_subscribers:
                self.call_subscribers[call_id] = []
            
            if supervisor_id not in self.call_subscribers[call_id]:
                self.call_subscribers[call_id].append(supervisor_id)
            
            # Add call to supervisor's session
            if supervisor_id not in self.supervisor_sessions:
                self.supervisor_sessions[supervisor_id] = []
            
            if call_id not in self.supervisor_sessions[supervisor_id]:
                self.supervisor_sessions[supervisor_id].append(call_id)
            
            # Log the subscription
            supabase.table("supervisor_sessions").upsert({
                "supervisor_id": supervisor_id,
                "call_id": call_id,
                "subscribed_at": datetime.utcnow().isoformat(),
                "is_active": True
            }, on_conflict=["supervisor_id", "call_id"]).execute()
            
            logger.info(f"👥 Supervisor {supervisor_id} subscribed to call {call_id}")
            return True
            
        except Exception as e:
            logger.exception(f"Error subscribing supervisor {supervisor_id} to call {call_id}")
            return False
    
    def unsubscribe_supervisor(self, supervisor_id: str, call_id: str) -> bool:
        """Unsubscribe supervisor from monitoring a call"""
        try:
            # Remove from call subscribers
            if call_id in self.call_subscribers and supervisor_id in self.call_subscribers[call_id]:
                self.call_subscribers[call_id].remove(supervisor_id)
            
            # Remove from supervisor sessions
            if supervisor_id in self.supervisor_sessions and call_id in self.supervisor_sessions[supervisor_id]:
                self.supervisor_sessions[supervisor_id].remove(call_id)
            
            # Update database
            supabase.table("supervisor_sessions").update({
                "is_active": False,
                "unsubscribed_at": datetime.utcnow().isoformat()
            }).eq("supervisor_id", supervisor_id).eq("call_id", call_id).execute()
            
            return True
            
        except Exception as e:
            logger.exception(f"Error unsubscribing supervisor {supervisor_id} from call {call_id}")
            return False
    
    def perform_intervention(self, call_id: str, supervisor_id: str, intervention_type: str, message: Optional[str] = None) -> Dict[str, Any]:
        """Perform supervisor intervention on a live call"""
        try:
            if call_id not in self.active_calls:
                return {"success": False, "error": "Call not found"}
            
            call = self.active_calls[call_id]
            intervention_id = f"int_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{call_id[:8]}"
            
            # Create intervention record
            intervention = CallIntervention(
                id=intervention_id,
                call_id=call_id,
                supervisor_id=supervisor_id,
                intervention_type=InterventionType(intervention_type),
                message=message,
                timestamp=datetime.utcnow(),
                success=False,
                response=None
            )
            
            # Perform the intervention
            result = self._execute_intervention(call, intervention)
            intervention.success = result.get("success", False)
            intervention.response = result.get("response")
            
            if intervention.success:
                call.intervention_count += 1
                call.last_activity = datetime.utcnow()
                
                # Add supervisor note if provided
                if message and intervention_type == "send_message":
                    note = f"[{intervention.timestamp.strftime('%H:%M:%S')}] Supervisor: {message}"
                    if call.supervisor_notes:
                        call.supervisor_notes += "\n" + note
                    else:
                        call.supervisor_notes = note
            
            # Save intervention to database
            intervention_record = {
                "id": intervention.id,
                "call_id": intervention.call_id,
                "supervisor_id": intervention.supervisor_id,
                "intervention_type": intervention.intervention_type.value,
                "message": intervention.message,
                "timestamp": intervention.timestamp.isoformat(),
                "success": intervention.success,
                "response": intervention.response,
                "created_at": datetime.utcnow().isoformat()
            }
            
            supabase.table("call_interventions").insert(intervention_record).execute()
            
            return {
                "success": intervention.success,
                "intervention_id": intervention.id,
                "response": intervention.response,
                "call_status": call.status.value
            }
            
        except Exception as e:
            logger.exception(f"Error performing intervention on call {call_id}")
            return {"success": False, "error": str(e)}
    
    def _execute_intervention(self, call: LiveCall, intervention: CallIntervention) -> Dict[str, Any]:
        """Execute the actual intervention on the call"""
        try:
            intervention_type = intervention.intervention_type
            
            if intervention_type == InterventionType.MUTE_AI:
                call.is_ai_muted = True
                # In production, this would send a command to Vapi to mute the AI
                return {"success": True, "response": "AI assistant muted"}
            
            elif intervention_type == InterventionType.UNMUTE_AI:
                call.is_ai_muted = False
                # In production, this would send a command to Vapi to unmute the AI
                return {"success": True, "response": "AI assistant unmuted"}
            
            elif intervention_type == InterventionType.PAUSE_CALL:
                call.status = CallStatus.ON_HOLD
                # In production, this would pause the call audio
                return {"success": True, "response": "Call paused"}
            
            elif intervention_type == InterventionType.RESUME_CALL:
                call.status = CallStatus.IN_PROGRESS
                # In production, this would resume the call audio
                return {"success": True, "response": "Call resumed"}
            
            elif intervention_type == InterventionType.TRANSFER_HUMAN:
                call.status = CallStatus.TRANSFERRING
                # In production, this would initiate transfer to human agent
                return {"success": True, "response": "Transferring to human agent"}
            
            elif intervention_type == InterventionType.END_CALL:
                call.status = CallStatus.ENDED
                # In production, this would end the call
                return {"success": True, "response": "Call ended by supervisor"}
            
            elif intervention_type == InterventionType.SEND_MESSAGE:
                # In production, this would send a message to the AI context
                return {"success": True, "response": f"Message sent: {intervention.message}"}
            
            elif intervention_type == InterventionType.UPDATE_CONTEXT:
                # In production, this would update the AI's context/instructions
                return {"success": True, "response": "AI context updated"}
            
            else:
                return {"success": False, "response": "Unknown intervention type"}
                
        except Exception as e:
            logger.exception(f"Error executing intervention {intervention.intervention_type}")
            return {"success": False, "response": str(e)}
    
    def get_active_calls(self, supervisor_id: str = None) -> List[Dict[str, Any]]:
        """Get list of active calls for monitoring"""
        try:
            active_calls = []
            
            for call_id, call in self.active_calls.items():
                # Update duration
                call.duration_seconds = int((datetime.utcnow() - call.started_at).total_seconds())
                
                call_data = {
                    "call_id": call.call_id,
                    "user_id": call.user_id,
                    "caller_number": call.caller_number,
                    "call_type": call.call_type,
                    "status": call.status.value,
                    "started_at": call.started_at.isoformat(),
                    "duration_seconds": call.duration_seconds,
                    "agent_name": call.agent_name,
                    "customer_name": call.customer_name,
                    "last_message": call.last_message,
                    "sentiment": call.sentiment,
                    "is_ai_muted": call.is_ai_muted,
                    "intervention_count": call.intervention_count,
                    "is_monitored": call_id in self.call_subscribers and len(self.call_subscribers[call_id]) > 0,
                    "supervisor_count": len(self.call_subscribers.get(call_id, [])),
                    "last_activity": call.last_activity.isoformat()
                }
                
                active_calls.append(call_data)
            
            # Sort by start time (newest first)
            active_calls.sort(key=lambda x: x["started_at"], reverse=True)
            
            return active_calls
            
        except Exception as e:
            logger.exception("Error getting active calls")
            return []
    
    def get_call_details(self, call_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific call"""
        try:
            if call_id not in self.active_calls:
                return None
            
            call = self.active_calls[call_id]
            
            # Get intervention history
            interventions_result = supabase.table("call_interventions").select("*").eq("call_id", call_id).order("timestamp", desc=False).execute()
            interventions = interventions_result.data or []
            
            # Get supervisor sessions
            sessions_result = supabase.table("supervisor_sessions").select("*").eq("call_id", call_id).eq("is_active", True).execute()
            active_supervisors = sessions_result.data or []
            
            return {
                "call": asdict(call),
                "interventions": interventions,
                "active_supervisors": active_supervisors,
                "full_transcript": call.current_transcript,
                "supervisor_notes": call.supervisor_notes
            }
            
        except Exception as e:
            logger.exception(f"Error getting call details for {call_id}")
            return None
    
    def end_call(self, call_id: str, reason: str = "completed") -> bool:
        """Mark a call as ended and clean up resources"""
        try:
            if call_id in self.active_calls:
                call = self.active_calls[call_id]
                call.status = CallStatus.ENDED
                
                # Update database
                supabase.table("live_calls").update({
                    "status": CallStatus.ENDED.value,
                    "ended_at": datetime.utcnow().isoformat(),
                    "end_reason": reason,
                    "is_active": False,
                    "final_transcript": call.current_transcript,
                    "supervisor_notes": call.supervisor_notes,
                    "intervention_count": call.intervention_count
                }).eq("call_id", call_id).execute()
                
                # Clean up subscriptions
                if call_id in self.call_subscribers:
                    for supervisor_id in self.call_subscribers[call_id]:
                        self.unsubscribe_supervisor(supervisor_id, call_id)
                    del self.call_subscribers[call_id]
                
                # Remove from active calls
                del self.active_calls[call_id]
                
                logger.info(f"📞 Call {call_id} ended: {reason}")
                return True
            
            return False
            
        except Exception as e:
            logger.exception(f"Error ending call {call_id}")
            return False

# Global call control manager instance
call_control_manager = CallControlManager()

# API Functions for call control
def register_live_call(call_data: Dict[str, Any]) -> bool:
    """Register a new call for live monitoring"""
    return call_control_manager.register_call(call_data)

def update_live_transcript(call_id: str, transcript_event: Dict[str, Any]) -> bool:
    """Update call transcript in real-time"""
    return call_control_manager.update_call_transcript(call_id, transcript_event)

def subscribe_to_call(supervisor_id: str, call_id: str) -> bool:
    """Subscribe supervisor to monitor a call"""
    return call_control_manager.subscribe_supervisor(supervisor_id, call_id)

def unsubscribe_from_call(supervisor_id: str, call_id: str) -> bool:
    """Unsubscribe supervisor from monitoring a call"""
    return call_control_manager.unsubscribe_supervisor(supervisor_id, call_id)

def perform_call_intervention(call_id: str, supervisor_id: str, intervention_type: str, message: str = None) -> Dict[str, Any]:
    """Perform supervisor intervention on live call"""
    return call_control_manager.perform_intervention(call_id, supervisor_id, intervention_type, message)

def get_active_calls(supervisor_id: str = None) -> List[Dict[str, Any]]:
    """Get list of active calls"""
    return call_control_manager.get_active_calls(supervisor_id)

def get_call_details(call_id: str) -> Optional[Dict[str, Any]]:
    """Get detailed call information"""
    return call_control_manager.get_call_details(call_id)

def end_live_call(call_id: str, reason: str = "completed") -> bool:
    """End a live call"""
    return call_control_manager.end_call(call_id, reason)
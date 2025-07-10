"""
Human Agent Transfer Service
Enables seamless transfer of AI calls to human agents with context preservation
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any

from config import get_config
from database import get_supabase_client

logger = logging.getLogger(__name__)
config = get_config()
supabase = get_supabase_client()

class HumanTransferManager:
    """Manages AI to human call transfers with context preservation"""
    
    def __init__(self):
        self.active_transfers: Dict[str, Dict] = {}
    
    def initiate_transfer(self, call_id: str, supervisor_id: str, reason: str, 
                         priority: str = "medium", target_agent_id: str = None,
                         special_instructions: str = "") -> Dict[str, Any]:
        """Initiate transfer of AI call to human agent"""
        try:
            transfer_id = f"transfer_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{call_id[:8]}"
            
            # Get call context from live calls or call logs
            call_context = self._get_call_context(call_id)
            if not call_context:
                return {"success": False, "error": "Call not found or not active"}
            
            # Get available agents
            available_agents = self._get_available_agents()
            if not available_agents:
                return {"success": False, "error": "No human agents currently available"}
            
            # Select best agent
            if target_agent_id:
                selected_agent = next((agent for agent in available_agents if agent["id"] == target_agent_id), None)
                if not selected_agent:
                    return {"success": False, "error": "Requested agent not available"}
            else:
                # Auto-select based on skills and availability
                selected_agent = available_agents[0]
            
            # Generate conversation summary for handoff
            conversation_summary = self._generate_summary(call_context)
            
            # Create transfer record
            transfer_data = {
                "transfer_id": transfer_id,
                "call_id": call_id,
                "reason": reason,
                "priority": priority,
                "human_agent_id": selected_agent["id"],
                "human_agent_name": selected_agent["name"],
                "conversation_summary": conversation_summary,
                "call_transcript": call_context.get("transcript", ""),
                "special_instructions": special_instructions,
                "requested_by": supervisor_id,
                "requested_at": datetime.utcnow().isoformat(),
                "status": "connecting",
                "customer_context": {
                    "caller_number": call_context.get("caller_number"),
                    "customer_name": call_context.get("customer_name"),
                    "sentiment": call_context.get("sentiment", "neutral"),
                    "call_duration": call_context.get("duration_seconds", 0)
                }
            }
            
            # Store in memory and database
            self.active_transfers[transfer_id] = transfer_data
            self._save_transfer_to_db(transfer_data)
            
            # Execute the transfer
            transfer_result = self._execute_transfer(transfer_data)
            
            if transfer_result["success"]:
                # Update live call monitoring
                self._update_live_call_status(call_id, selected_agent["name"])
                
                return {
                    "success": True,
                    "transfer_id": transfer_id,
                    "status": "connecting",
                    "human_agent": {
                        "id": selected_agent["id"],
                        "name": selected_agent["name"],
                        "email": selected_agent["email"],
                        "skills": selected_agent["skills"]
                    },
                    "message": f"Transferring call to {selected_agent['name']}",
                    "estimated_connection_time": 30,
                    "conversation_summary": conversation_summary
                }
            else:
                return {
                    "success": False,
                    "error": transfer_result.get("error", "Transfer failed")
                }
            
        except Exception as e:
            logger.exception(f"Error initiating transfer for call {call_id}")
            return {"success": False, "error": str(e)}
    
    def _get_call_context(self, call_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive call context for transfer"""
        try:
            # First try live call system
            try:
                from live_call_control_service import get_call_details
                live_call = get_call_details(call_id)
                
                if live_call and live_call.get("call"):
                    call_data = live_call["call"]
                    return {
                        "call_id": call_id,
                        "caller_number": call_data.get("caller_number"),
                        "customer_name": call_data.get("customer_name"),
                        "call_type": call_data.get("call_type"),
                        "duration_seconds": call_data.get("duration_seconds", 0),
                        "sentiment": call_data.get("sentiment", "neutral"),
                        "transcript": live_call.get("full_transcript", ""),
                        "is_active": True
                    }
            except Exception as e:
                logger.debug(f"Could not get live call data: {e}")
            
            # Fall back to call_logs
            call_result = supabase.table("call_logs").select("*").eq("call_id", call_id).maybe_single().execute()
            if call_result.data:
                call_data = call_result.data
                return {
                    "call_id": call_id,
                    "caller_number": call_data.get("caller_number"),
                    "customer_name": call_data.get("customer_name", "Unknown Customer"),
                    "call_type": call_data.get("call_type"),
                    "duration_seconds": call_data.get("duration", 0),
                    "sentiment": call_data.get("sentiment", "neutral"),
                    "transcript": call_data.get("transcript", ""),
                    "is_active": False
                }
            
            return None
            
        except Exception as e:
            logger.exception(f"Error getting call context for {call_id}")
            return None
    
    def _get_available_agents(self) -> List[Dict[str, Any]]:
        """Get list of available human agents"""
        try:
            # Query human_agents table if it exists, otherwise return mock data
            try:
                agents_result = supabase.table("human_agents").select("*").eq("status", "available").execute()
                if agents_result.data:
                    return [
                        {
                            "id": agent["id"],
                            "name": agent["name"],
                            "email": agent["email"],
                            "phone_number": agent.get("phone_number"),
                            "skills": json.loads(agent.get("skills", "[]")) if agent.get("skills") else [],
                            "current_calls": agent.get("current_call_count", 0),
                            "max_calls": agent.get("max_concurrent_calls", 3),
                            "rating": agent.get("average_rating", 5.0),
                            "status": agent.get("status", "available")
                        }
                        for agent in agents_result.data
                        if agent.get("current_call_count", 0) < agent.get("max_concurrent_calls", 3)
                    ]
            except Exception as e:
                logger.debug(f"Could not query human_agents table: {e}")
            
            # Return mock agents for demo
            return [
                {
                    "id": "agent_001",
                    "name": "Sarah Johnson",
                    "email": "sarah@dialara.com",
                    "phone_number": "+1234567890",
                    "skills": ["general_support", "technical_support", "sales"],
                    "current_calls": 1,
                    "max_calls": 3,
                    "rating": 4.8,
                    "status": "available"
                },
                {
                    "id": "agent_002", 
                    "name": "Mike Chen",
                    "email": "mike@dialara.com",
                    "phone_number": "+1234567891",
                    "skills": ["billing_support", "escalation_handling"],
                    "current_calls": 0,
                    "max_calls": 2,
                    "rating": 4.9,
                    "status": "available"
                },
                {
                    "id": "agent_003",
                    "name": "Emma Wilson", 
                    "email": "emma@dialara.com",
                    "phone_number": "+1234567892",
                    "skills": ["technical_support", "complex_issues"],
                    "current_calls": 0,
                    "max_calls": 2,
                    "rating": 4.7,
                    "status": "available"
                }
            ]
            
        except Exception as e:
            logger.exception("Error getting available agents")
            return []
    
    def _generate_summary(self, call_context: Dict[str, Any]) -> str:
        """Generate conversation summary for human agent handoff"""
        try:
            transcript = call_context.get("transcript", "")
            sentiment = call_context.get("sentiment", "neutral")
            duration = call_context.get("duration_seconds", 0)
            customer_name = call_context.get("customer_name", "Customer")
            caller_number = call_context.get("caller_number", "Unknown")
            
            if not transcript.strip():
                return f"Call from {customer_name} ({caller_number}). Duration: {duration}s. Sentiment: {sentiment}. No transcript available."
            
            # Extract key conversation points
            lines = transcript.split('\n')
            key_points = []
            
            # Get first few exchanges to understand call purpose
            for i, line in enumerate(lines[:6]):
                if line.strip():
                    key_points.append(line.strip())
            
            # Add ellipsis and last few exchanges if call is long
            if len(lines) > 10:
                key_points.append("...")
                for line in lines[-3:]:
                    if line.strip():
                        key_points.append(line.strip())
            
            summary = f"📞 Call Summary for {customer_name} ({caller_number})\n"
            summary += f"Duration: {duration}s | Sentiment: {sentiment.upper()}\n\n"
            summary += "Key Conversation Points:\n"
            summary += "\n".join(f"• {point}" for point in key_points[:8])
            
            return summary
            
        except Exception as e:
            logger.exception("Error generating conversation summary")
            return f"Call from {call_context.get('customer_name', 'Unknown')}. Summary generation failed."
    
    def _execute_transfer(self, transfer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the actual transfer process"""
        try:
            call_id = transfer_data["call_id"]
            agent_name = transfer_data["human_agent_name"]
            
            logger.info(f"🔄 Executing transfer of call {call_id} to {agent_name}")
            
            # In production, this would:
            # 1. Put AI on hold with professional message
            # 2. Connect human agent to the call
            # 3. Provide context via agent dashboard/app
            # 4. Transfer audio stream seamlessly
            # 5. Send SMS/email notification to agent
            
            # For now, simulate successful transfer
            transfer_data["status"] = "connected"
            transfer_data["connected_at"] = datetime.utcnow().isoformat()
            
            return {
                "success": True,
                "message": f"Successfully connected to {agent_name}"
            }
            
        except Exception as e:
            logger.exception(f"Error executing transfer {transfer_data.get('transfer_id')}")
            return {"success": False, "error": str(e)}
    
    def _update_live_call_status(self, call_id: str, agent_name: str) -> None:
        """Update live call monitoring with transfer status"""
        try:
            from live_call_control_service import perform_call_intervention
            perform_call_intervention(
                call_id,
                "system",
                "transfer_human", 
                f"Call transferred to human agent: {agent_name}"
            )
            logger.info(f"✅ Updated live call status for {call_id}")
        except Exception as e:
            logger.debug(f"Could not update live call status: {e}")
    
    def _save_transfer_to_db(self, transfer_data: Dict[str, Any]) -> None:
        """Save transfer request to database"""
        try:
            # Try to save to call_transfers table if it exists
            db_record = {
                "transfer_id": transfer_data["transfer_id"],
                "call_id": transfer_data["call_id"],
                "reason": transfer_data["reason"],
                "priority": transfer_data["priority"],
                "human_agent_id": transfer_data["human_agent_id"],
                "conversation_summary": transfer_data["conversation_summary"],
                "call_transcript": transfer_data["call_transcript"],
                "special_instructions": transfer_data["special_instructions"],
                "requested_by": transfer_data["requested_by"],
                "requested_at": transfer_data["requested_at"],
                "status": transfer_data["status"],
                "customer_context": json.dumps(transfer_data["customer_context"]),
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Try to insert into database
            try:
                supabase.table("call_transfers").insert(db_record).execute()
                logger.info(f"💾 Saved transfer {transfer_data['transfer_id']} to database")
            except Exception as e:
                # Table might not exist yet - log for manual creation
                logger.warning(f"Could not save to call_transfers table: {e}")
                logger.info("Transfer data logged - create call_transfers table for persistence")
                
        except Exception as e:
            logger.exception(f"Error saving transfer {transfer_data.get('transfer_id')}")
    
    def get_transfer_status(self, transfer_id: str) -> Dict[str, Any]:
        """Get current status of transfer"""
        try:
            if transfer_id in self.active_transfers:
                transfer = self.active_transfers[transfer_id]
                return {
                    "transfer_id": transfer_id,
                    "status": transfer["status"],
                    "call_id": transfer["call_id"],
                    "human_agent": transfer["human_agent_name"],
                    "requested_at": transfer["requested_at"],
                    "message": f"Transfer to {transfer['human_agent_name']}"
                }
            
            # Check database for completed transfers
            try:
                transfer_result = supabase.table("call_transfers").select("*").eq("transfer_id", transfer_id).maybe_single().execute()
                if transfer_result.data:
                    data = transfer_result.data
                    return {
                        "transfer_id": transfer_id,
                        "status": data.get("status"),
                        "call_id": data.get("call_id"),
                        "human_agent": data.get("human_agent_id"),
                        "requested_at": data.get("requested_at")
                    }
            except:
                pass
            
            return {"error": "Transfer not found"}
            
        except Exception as e:
            logger.exception(f"Error getting transfer status {transfer_id}")
            return {"error": str(e)}
    
    def get_available_agents_list(self) -> List[Dict[str, Any]]:
        """Get formatted list of available agents"""
        return self._get_available_agents()

# Global transfer manager instance
transfer_manager = HumanTransferManager()

# API Functions
def initiate_human_transfer(call_id: str, supervisor_id: str, reason: str, priority: str = "medium", 
                           target_agent_id: str = None, special_instructions: str = "") -> Dict[str, Any]:
    """Initiate transfer of AI call to human agent"""
    return transfer_manager.initiate_transfer(call_id, supervisor_id, reason, priority, target_agent_id, special_instructions)

def get_transfer_status(transfer_id: str) -> Dict[str, Any]:
    """Get current status of transfer request"""
    return transfer_manager.get_transfer_status(transfer_id)

def get_available_human_agents() -> List[Dict[str, Any]]:
    """Get list of available human agents"""
    return transfer_manager.get_available_agents_list()
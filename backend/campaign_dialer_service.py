"""
Campaign Dialer Service for CF-6: Outbound Campaign Dialer
Handles automated call campaign creation, management, and execution
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import requests
from textblob import TextBlob
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CampaignStatus(Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class CallStatus(Enum):
    PENDING = "pending"
    DIALING = "dialing"
    CONNECTED = "connected"
    NO_ANSWER = "no_answer"
    BUSY = "busy"
    FAILED = "failed"
    COMPLETED = "completed"
    VOICEMAIL = "voicemail"

@dataclass
class CampaignSettings:
    max_concurrent_calls: int = 5
    retry_attempts: int = 3
    retry_delay_minutes: int = 30
    call_timeout_seconds: int = 300
    respect_do_not_call: bool = True
    compliance_mode: str = "standard"  # standard, hipaa, pci
    time_zone: str = "UTC"
    calling_hours_start: str = "09:00"
    calling_hours_end: str = "17:00"
    exclude_weekends: bool = True

class CampaignDialerManager:
    def __init__(self):
        self.active_campaigns: Dict[str, Dict] = {}
        self.call_queue: asyncio.Queue = asyncio.Queue()
        self.running_calls: Dict[str, Dict] = {}
        
    def create_campaign(self, user_id: str, campaign_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new outbound call campaign"""
        try:
            campaign_id = str(uuid.uuid4())
            
            # Validate campaign data
            validation_result = self._validate_campaign_data(campaign_data)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "error": f"Invalid campaign data: {validation_result['errors']}"
                }
            
            # Process contact list
            contacts = self._process_contact_list(campaign_data.get("contacts", []))
            if not contacts:
                return {
                    "success": False,
                    "error": "No valid contacts provided"
                }
            
            # Create campaign settings
            settings = CampaignSettings(
                max_concurrent_calls=campaign_data.get("max_concurrent_calls", 5),
                retry_attempts=campaign_data.get("retry_attempts", 3),
                retry_delay_minutes=campaign_data.get("retry_delay_minutes", 30),
                call_timeout_seconds=campaign_data.get("call_timeout_seconds", 300),
                respect_do_not_call=campaign_data.get("respect_do_not_call", True),
                compliance_mode=campaign_data.get("compliance_mode", "standard"),
                time_zone=campaign_data.get("time_zone", "UTC"),
                calling_hours_start=campaign_data.get("calling_hours_start", "09:00"),
                calling_hours_end=campaign_data.get("calling_hours_end", "17:00"),
                exclude_weekends=campaign_data.get("exclude_weekends", True)
            )
            
            campaign = {
                "id": campaign_id,
                "user_id": user_id,
                "name": campaign_data["name"],
                "description": campaign_data.get("description", ""),
                "agent_id": campaign_data["agent_id"],
                "script_template": campaign_data.get("script_template", ""),
                "contacts": contacts,
                "settings": settings.__dict__,
                "status": CampaignStatus.DRAFT.value,
                "created_at": datetime.utcnow().isoformat(),
                "scheduled_start": campaign_data.get("scheduled_start"),
                "scheduled_end": campaign_data.get("scheduled_end"),
                "stats": {
                    "total_contacts": len(contacts),
                    "calls_attempted": 0,
                    "calls_connected": 0,
                    "calls_completed": 0,
                    "calls_failed": 0,
                    "average_duration": 0,
                    "conversion_rate": 0
                }
            }
            
            # Store campaign in database
            campaign_stored = self._store_campaign(campaign)
            if not campaign_stored:
                return {
                    "success": False,
                    "error": "Failed to store campaign in database"
                }
            
            logger.info(f"Campaign created successfully: {campaign_id}")
            return {
                "success": True,
                "campaign_id": campaign_id,
                "campaign": campaign
            }
            
        except Exception as e:
            logger.error(f"Error creating campaign: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to create campaign: {str(e)}"
            }
    
    def start_campaign(self, campaign_id: str, user_id: str) -> Dict[str, Any]:
        """Start an outbound call campaign"""
        try:
            # Get campaign from database
            campaign = self._get_campaign(campaign_id, user_id)
            if not campaign:
                return {
                    "success": False,
                    "error": "Campaign not found"
                }
            
            # Validate campaign can be started
            if campaign["status"] not in [CampaignStatus.DRAFT.value, CampaignStatus.SCHEDULED.value, CampaignStatus.PAUSED.value]:
                return {
                    "success": False,
                    "error": f"Cannot start campaign with status: {campaign['status']}"
                }
            
            # Check calling hours compliance
            if not self._is_calling_hours_compliant(campaign["settings"]):
                return {
                    "success": False,
                    "error": "Cannot start campaign outside of configured calling hours"
                }
            
            # Update campaign status
            campaign["status"] = CampaignStatus.ACTIVE.value
            campaign["started_at"] = datetime.utcnow().isoformat()
            
            # Store updated campaign
            self._update_campaign(campaign)
            
            # Add to active campaigns
            self.active_campaigns[campaign_id] = campaign
            
            # Start campaign execution
            asyncio.create_task(self._execute_campaign(campaign_id))
            
            logger.info(f"Campaign started: {campaign_id}")
            return {
                "success": True,
                "message": "Campaign started successfully",
                "campaign_id": campaign_id
            }
            
        except Exception as e:
            logger.error(f"Error starting campaign: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to start campaign: {str(e)}"
            }
    
    def pause_campaign(self, campaign_id: str, user_id: str) -> Dict[str, Any]:
        """Pause an active campaign"""
        try:
            campaign = self._get_campaign(campaign_id, user_id)
            if not campaign:
                return {"success": False, "error": "Campaign not found"}
            
            if campaign["status"] != CampaignStatus.ACTIVE.value:
                return {"success": False, "error": "Campaign is not active"}
            
            # Update status
            campaign["status"] = CampaignStatus.PAUSED.value
            campaign["paused_at"] = datetime.utcnow().isoformat()
            
            # Update in database and active campaigns
            self._update_campaign(campaign)
            if campaign_id in self.active_campaigns:
                self.active_campaigns[campaign_id] = campaign
            
            logger.info(f"Campaign paused: {campaign_id}")
            return {"success": True, "message": "Campaign paused successfully"}
            
        except Exception as e:
            logger.error(f"Error pausing campaign: {str(e)}")
            return {"success": False, "error": f"Failed to pause campaign: {str(e)}"}
    
    def stop_campaign(self, campaign_id: str, user_id: str) -> Dict[str, Any]:
        """Stop and complete a campaign"""
        try:
            campaign = self._get_campaign(campaign_id, user_id)
            if not campaign:
                return {"success": False, "error": "Campaign not found"}
            
            # Update status
            campaign["status"] = CampaignStatus.COMPLETED.value
            campaign["completed_at"] = datetime.utcnow().isoformat()
            
            # Generate final stats
            campaign["stats"] = self._calculate_campaign_stats(campaign_id)
            
            # Update in database
            self._update_campaign(campaign)
            
            # Remove from active campaigns
            if campaign_id in self.active_campaigns:
                del self.active_campaigns[campaign_id]
            
            logger.info(f"Campaign completed: {campaign_id}")
            return {
                "success": True,
                "message": "Campaign completed successfully",
                "final_stats": campaign["stats"]
            }
            
        except Exception as e:
            logger.error(f"Error stopping campaign: {str(e)}")
            return {"success": False, "error": f"Failed to stop campaign: {str(e)}"}
    
    def get_campaign_status(self, campaign_id: str, user_id: str) -> Dict[str, Any]:
        """Get real-time campaign status and statistics"""
        try:
            campaign = self._get_campaign(campaign_id, user_id)
            if not campaign:
                return {"success": False, "error": "Campaign not found"}
            
            # Get real-time stats
            real_time_stats = self._calculate_campaign_stats(campaign_id)
            
            # Get active calls for this campaign
            active_calls = self._get_active_campaign_calls(campaign_id)
            
            return {
                "success": True,
                "campaign": {
                    "id": campaign_id,
                    "name": campaign["name"],
                    "status": campaign["status"],
                    "created_at": campaign["created_at"],
                    "started_at": campaign.get("started_at"),
                    "stats": real_time_stats,
                    "active_calls": len(active_calls),
                    "contacts_remaining": self._get_remaining_contacts_count(campaign_id),
                    "estimated_completion": self._estimate_completion_time(campaign_id)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting campaign status: {str(e)}")
            return {"success": False, "error": f"Failed to get campaign status: {str(e)}"}
    
    def get_user_campaigns(self, user_id: str, status: Optional[str] = None) -> Dict[str, Any]:
        """Get all campaigns for a user"""
        try:
            campaigns = self._get_user_campaigns_from_db(user_id, status)
            
            # Add real-time data for active campaigns
            for campaign in campaigns:
                if campaign["status"] == CampaignStatus.ACTIVE.value:
                    campaign["real_time_stats"] = self._calculate_campaign_stats(campaign["id"])
                    campaign["active_calls"] = len(self._get_active_campaign_calls(campaign["id"]))
            
            return {
                "success": True,
                "campaigns": campaigns,
                "total_count": len(campaigns)
            }
            
        except Exception as e:
            logger.error(f"Error getting user campaigns: {str(e)}")
            return {"success": False, "error": f"Failed to get campaigns: {str(e)}"}
    
    async def _execute_campaign(self, campaign_id: str):
        """Execute campaign calls asynchronously"""
        try:
            campaign = self.active_campaigns.get(campaign_id)
            if not campaign:
                return
            
            settings = CampaignSettings(**campaign["settings"])
            contacts = campaign["contacts"]
            
            # Filter contacts that haven't been called or need retry
            pending_contacts = self._get_pending_contacts(campaign_id, contacts)
            
            # Create semaphore for concurrent call limit
            semaphore = asyncio.Semaphore(settings.max_concurrent_calls)
            
            # Create tasks for all pending contacts
            tasks = []
            for contact in pending_contacts:
                if campaign["status"] != CampaignStatus.ACTIVE.value:
                    break
                
                task = asyncio.create_task(
                    self._make_campaign_call(campaign_id, contact, semaphore)
                )
                tasks.append(task)
                
                # Small delay between call initiations
                await asyncio.sleep(1)
            
            # Wait for all calls to complete
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            
            # Check if campaign should be completed
            if self._should_complete_campaign(campaign_id):
                self.stop_campaign(campaign_id, campaign["user_id"])
            
        except Exception as e:
            logger.error(f"Error executing campaign {campaign_id}: {str(e)}")
    
    async def _make_campaign_call(self, campaign_id: str, contact: Dict, semaphore: asyncio.Semaphore):
        """Make individual campaign call"""
        async with semaphore:
            try:
                campaign = self.active_campaigns.get(campaign_id)
                if not campaign or campaign["status"] != CampaignStatus.ACTIVE.value:
                    return
                
                # Check calling hours compliance
                if not self._is_calling_hours_compliant(campaign["settings"]):
                    logger.info(f"Skipping call outside hours: {contact['phone_number']}")
                    return
                
                # Check do-not-call compliance
                if campaign["settings"]["respect_do_not_call"] and self._is_do_not_call(contact["phone_number"]):
                    logger.info(f"Skipping do-not-call number: {contact['phone_number']}")
                    self._log_call_attempt(campaign_id, contact, CallStatus.FAILED.value, "Do not call list")
                    return
                
                # Create call record
                call_id = str(uuid.uuid4())
                call_record = {
                    "id": call_id,
                    "campaign_id": campaign_id,
                    "contact": contact,
                    "status": CallStatus.DIALING.value,
                    "started_at": datetime.utcnow().isoformat(),
                    "attempts": contact.get("attempts", 0) + 1
                }
                
                # Store call record
                self._store_call_record(call_record)
                self.running_calls[call_id] = call_record
                
                # Initiate call via Vapi
                call_result = await self._initiate_vapi_call(campaign, contact, call_id)
                
                if call_result["success"]:
                    # Update call status
                    call_record["status"] = CallStatus.CONNECTED.value
                    call_record["vapi_call_id"] = call_result["call_id"]
                    self._update_call_record(call_record)
                    
                    # Wait for call completion or timeout
                    await self._monitor_call(call_id, campaign["settings"]["call_timeout_seconds"])
                else:
                    # Call failed to initiate
                    call_record["status"] = CallStatus.FAILED.value
                    call_record["ended_at"] = datetime.utcnow().isoformat()
                    call_record["failure_reason"] = call_result.get("error", "Unknown error")
                    self._update_call_record(call_record)
                
                # Remove from running calls
                if call_id in self.running_calls:
                    del self.running_calls[call_id]
                
                # Update campaign stats
                self._update_campaign_stats(campaign_id)
                
            except Exception as e:
                logger.error(f"Error making campaign call: {str(e)}")
    
    async def _initiate_vapi_call(self, campaign: Dict, contact: Dict, call_id: str) -> Dict[str, Any]:
        """Initiate call through Vapi API"""
        try:
            # Prepare call data
            call_data = {
                "assistantId": campaign["agent_id"],
                "customer": {
                    "number": contact["phone_number"]
                },
                "metadata": {
                    "campaign_id": campaign["id"],
                    "campaign_call_id": call_id,
                    "contact_name": contact.get("name", ""),
                    "contact_email": contact.get("email", ""),
                    "script_template": campaign.get("script_template", "")
                }
            }
            
            # Add custom variables if present
            if contact.get("custom_variables"):
                call_data["metadata"]["custom_variables"] = contact["custom_variables"]
            
            # Make API call to Vapi
            headers = {
                "Authorization": f"Bearer {self._get_vapi_token()}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                "https://api.vapi.ai/call",
                headers=headers,
                json=call_data,
                timeout=30
            )
            
            if response.status_code == 201:
                result = response.json()
                return {
                    "success": True,
                    "call_id": result["id"],
                    "message": "Call initiated successfully"
                }
            else:
                error_msg = f"Vapi API error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "error": error_msg
                }
                
        except Exception as e:
            logger.error(f"Error initiating Vapi call: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to initiate call: {str(e)}"
            }
    
    async def _monitor_call(self, call_id: str, timeout_seconds: int):
        """Monitor call progress and update status"""
        try:
            start_time = datetime.utcnow()
            timeout_time = start_time + timedelta(seconds=timeout_seconds)
            
            while datetime.utcnow() < timeout_time:
                call_record = self.running_calls.get(call_id)
                if not call_record:
                    break
                
                # Check if call is still active via Vapi API
                if call_record.get("vapi_call_id"):
                    call_status = await self._get_vapi_call_status(call_record["vapi_call_id"])
                    
                    if call_status.get("ended"):
                        # Call has ended
                        call_record["status"] = CallStatus.COMPLETED.value
                        call_record["ended_at"] = datetime.utcnow().isoformat()
                        call_record["duration"] = call_status.get("duration", 0)
                        call_record["end_reason"] = call_status.get("end_reason", "completed")
                        self._update_call_record(call_record)
                        break
                
                # Wait before next check
                await asyncio.sleep(5)
            
            # Handle timeout
            if datetime.utcnow() >= timeout_time:
                call_record = self.running_calls.get(call_id)
                if call_record and call_record["status"] not in [CallStatus.COMPLETED.value, CallStatus.FAILED.value]:
                    call_record["status"] = CallStatus.FAILED.value
                    call_record["ended_at"] = datetime.utcnow().isoformat()
                    call_record["failure_reason"] = "Call timeout"
                    self._update_call_record(call_record)
                    
        except Exception as e:
            logger.error(f"Error monitoring call {call_id}: {str(e)}")
    
    # Helper methods for database operations and validation
    def _validate_campaign_data(self, data: Dict) -> Dict[str, Any]:
        """Validate campaign data"""
        errors = []
        
        if not data.get("name"):
            errors.append("Campaign name is required")
        
        if not data.get("agent_id"):
            errors.append("Agent ID is required")
        
        if not data.get("contacts") or not isinstance(data["contacts"], list):
            errors.append("Valid contacts list is required")
        
        # Validate settings ranges
        max_calls = data.get("max_concurrent_calls", 5)
        if not isinstance(max_calls, int) or max_calls < 1 or max_calls > 50:
            errors.append("Max concurrent calls must be between 1 and 50")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    def _process_contact_list(self, contacts: List[Dict]) -> List[Dict]:
        """Process and validate contact list"""
        processed_contacts = []
        
        for contact in contacts:
            # Validate required fields
            if not contact.get("phone_number"):
                continue
            
            # Clean phone number
            phone = self._clean_phone_number(contact["phone_number"])
            if not phone:
                continue
            
            processed_contact = {
                "phone_number": phone,
                "name": contact.get("name", ""),
                "email": contact.get("email", ""),
                "custom_variables": contact.get("custom_variables", {}),
                "attempts": 0,
                "last_attempt": None,
                "status": "pending"
            }
            
            processed_contacts.append(processed_contact)
        
        return processed_contacts
    
    def _clean_phone_number(self, phone: str) -> Optional[str]:
        """Clean and validate phone number"""
        if not phone:
            return None
        
        # Remove all non-digit characters
        cleaned = ''.join(filter(str.isdigit, phone))
        
        # Validate length (assuming US format)
        if len(cleaned) == 10:
            cleaned = "1" + cleaned  # Add country code
        elif len(cleaned) == 11 and cleaned.startswith("1"):
            pass  # Already has country code
        else:
            return None  # Invalid format
        
        return f"+{cleaned}"
    
    def _is_calling_hours_compliant(self, settings: Dict) -> bool:
        """Check if current time is within calling hours"""
        # This is a simplified implementation
        # In production, you'd want proper timezone handling
        current_time = datetime.now().time()
        start_time = datetime.strptime(settings["calling_hours_start"], "%H:%M").time()
        end_time = datetime.strptime(settings["calling_hours_end"], "%H:%M").time()
        
        if settings["exclude_weekends"]:
            if datetime.now().weekday() >= 5:  # Saturday = 5, Sunday = 6
                return False
        
        return start_time <= current_time <= end_time
    
    def _is_do_not_call(self, phone_number: str) -> bool:
        """Check if number is on do-not-call list"""
        # Implementation would check against DNC registry
        # This is a placeholder
        return False
    
    def _get_vapi_token(self) -> str:
        """Get Vapi API token from environment"""
        import os
        return os.getenv("VAPI_PRIVATE_KEY", "")
    
    async def _get_vapi_call_status(self, vapi_call_id: str) -> Dict[str, Any]:
        """Get call status from Vapi API"""
        try:
            headers = {
                "Authorization": f"Bearer {self._get_vapi_token()}"
            }
            
            response = requests.get(
                f"https://api.vapi.ai/call/{vapi_call_id}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {"ended": True, "end_reason": "api_error"}
                
        except Exception as e:
            logger.error(f"Error getting Vapi call status: {str(e)}")
            return {"ended": True, "end_reason": "api_error"}
    
    # Database operation placeholders - these would connect to Supabase
    def _store_campaign(self, campaign: Dict) -> bool:
        """Store campaign in database"""
        # Implementation would use Supabase client
        return True
    
    def _get_campaign(self, campaign_id: str, user_id: str) -> Optional[Dict]:
        """Get campaign from database"""
        # Implementation would query Supabase
        return None
    
    def _update_campaign(self, campaign: Dict):
        """Update campaign in database"""
        # Implementation would update Supabase
        pass
    
    def _store_call_record(self, call_record: Dict):
        """Store call record in database"""
        # Implementation would use Supabase client
        pass
    
    def _update_call_record(self, call_record: Dict):
        """Update call record in database"""
        # Implementation would update Supabase
        pass
    
    def _get_user_campaigns_from_db(self, user_id: str, status: Optional[str]) -> List[Dict]:
        """Get user campaigns from database"""
        # Implementation would query Supabase
        return []
    
    def _calculate_campaign_stats(self, campaign_id: str) -> Dict[str, Any]:
        """Calculate real-time campaign statistics"""
        # Implementation would aggregate from call records
        return {
            "calls_attempted": 0,
            "calls_connected": 0,
            "calls_completed": 0,
            "calls_failed": 0,
            "average_duration": 0,
            "conversion_rate": 0
        }
    
    def _get_active_campaign_calls(self, campaign_id: str) -> List[Dict]:
        """Get active calls for campaign"""
        return [call for call in self.running_calls.values() 
                if call.get("campaign_id") == campaign_id]
    
    def _get_remaining_contacts_count(self, campaign_id: str) -> int:
        """Get count of remaining contacts to call"""
        return 0
    
    def _estimate_completion_time(self, campaign_id: str) -> Optional[str]:
        """Estimate campaign completion time"""
        return None
    
    def _get_pending_contacts(self, campaign_id: str, contacts: List[Dict]) -> List[Dict]:
        """Get contacts that need to be called"""
        return [c for c in contacts if c["status"] == "pending"]
    
    def _should_complete_campaign(self, campaign_id: str) -> bool:
        """Check if campaign should be completed"""
        return False
    
    def _log_call_attempt(self, campaign_id: str, contact: Dict, status: str, reason: str):
        """Log call attempt"""
        pass
    
    def _update_campaign_stats(self, campaign_id: str):
        """Update campaign statistics"""
        pass

# Global campaign manager instance
campaign_manager = CampaignDialerManager()

# API helper functions
def create_campaign(user_id: str, campaign_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create new campaign"""
    return campaign_manager.create_campaign(user_id, campaign_data)

def start_campaign(campaign_id: str, user_id: str) -> Dict[str, Any]:
    """Start campaign"""
    return campaign_manager.start_campaign(campaign_id, user_id)

def pause_campaign(campaign_id: str, user_id: str) -> Dict[str, Any]:
    """Pause campaign"""
    return campaign_manager.pause_campaign(campaign_id, user_id)

def stop_campaign(campaign_id: str, user_id: str) -> Dict[str, Any]:
    """Stop campaign"""
    return campaign_manager.stop_campaign(campaign_id, user_id)

def get_campaign_status(campaign_id: str, user_id: str) -> Dict[str, Any]:
    """Get campaign status"""
    return campaign_manager.get_campaign_status(campaign_id, user_id)

def get_user_campaigns(user_id: str, status: Optional[str] = None) -> Dict[str, Any]:
    """Get user campaigns"""
    return campaign_manager.get_user_campaigns(user_id, status)
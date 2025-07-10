"""
Google Calendar Integration Service
Handles calendar operations for AI scheduling during calls
"""

import json
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from config import get_config
from database import get_supabase_client

logger = logging.getLogger(__name__)
config = get_config()
supabase = get_supabase_client()

@dataclass
class CalendarCredentials:
    access_token: str
    refresh_token: str
    expires_at: datetime
    calendar_id: str

@dataclass
class TimeSlot:
    start: datetime
    end: datetime
    available: bool

@dataclass
class CalendarEvent:
    id: str
    title: str
    start: datetime
    end: datetime
    attendees: List[str]
    location: Optional[str] = None

class GoogleCalendarAPI:
    """Google Calendar API client for scheduling operations"""
    
    BASE_URL = "https://www.googleapis.com/calendar/v3"
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict:
        """Make HTTP request to Google Calendar API"""
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers, params=params)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=self.headers, json=data)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=self.headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json() if response.content else {}
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Google Calendar API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response content: {e.response.text}")
            raise
    
    def list_calendars(self) -> List[Dict]:
        """Get list of user's calendars"""
        return self._make_request("GET", "/users/me/calendarList").get("items", [])
    
    def get_events(self, calendar_id: str = "primary", time_min: str = None, time_max: str = None) -> List[Dict]:
        """Get events from calendar"""
        params = {
            "singleEvents": True,
            "orderBy": "startTime"
        }
        
        if time_min:
            params["timeMin"] = time_min
        if time_max:
            params["timeMax"] = time_max
            
        result = self._make_request("GET", f"/calendars/{calendar_id}/events", params=params)
        return result.get("items", [])
    
    def create_event(self, calendar_id: str, event_data: Dict) -> Dict:
        """Create a new calendar event"""
        return self._make_request("POST", f"/calendars/{calendar_id}/events", event_data)
    
    def update_event(self, calendar_id: str, event_id: str, event_data: Dict) -> Dict:
        """Update an existing calendar event"""
        return self._make_request("PUT", f"/calendars/{calendar_id}/events/{event_id}", event_data)
    
    def delete_event(self, calendar_id: str, event_id: str) -> bool:
        """Delete a calendar event"""
        try:
            self._make_request("DELETE", f"/calendars/{calendar_id}/events/{event_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting event: {e}")
            return False
    
    def get_freebusy(self, calendar_id: str, time_min: str, time_max: str) -> Dict:
        """Get free/busy information for a calendar"""
        data = {
            "timeMin": time_min,
            "timeMax": time_max,
            "items": [{"id": calendar_id}]
        }
        
        return self._make_request("POST", "/freebusy", data)

class CalendarScheduler:
    """AI Calendar Scheduler for call-based meeting booking"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.credentials = self._get_credentials()
        self.api = GoogleCalendarAPI(self.credentials.access_token) if self.credentials else None
    
    def _get_credentials(self) -> Optional[CalendarCredentials]:
        """Get Google Calendar credentials for user from database"""
        try:
            result = supabase.table("integrations").select("*").eq("user_id", self.user_id).eq("provider", "google_calendar").maybe_single().execute()
            
            if not result.data:
                return None
            
            data = result.data
            return CalendarCredentials(
                access_token=data["access_token"],
                refresh_token=data["refresh_token"],
                expires_at=datetime.fromisoformat(data["expires_at"]),
                calendar_id=data.get("calendar_id", "primary")
            )
        except Exception as e:
            logger.error(f"Error getting calendar credentials: {e}")
            return None
    
    def find_available_slots(self, start_date: str, end_date: str, duration_minutes: int = 60, exclude_weekends: bool = True) -> List[TimeSlot]:
        """Find available time slots for scheduling"""
        if not self.api:
            raise Exception("Calendar not connected")
        
        try:
            # Get busy times
            freebusy_data = self.api.get_freebusy(
                self.credentials.calendar_id,
                start_date,
                end_date
            )
            
            busy_times = []
            calendar_data = freebusy_data.get("calendars", {}).get(self.credentials.calendar_id, {})
            
            for busy_period in calendar_data.get("busy", []):
                busy_times.append({
                    "start": datetime.fromisoformat(busy_period["start"].replace("Z", "+00:00")),
                    "end": datetime.fromisoformat(busy_period["end"].replace("Z", "+00:00"))
                })
            
            # Generate available slots
            available_slots = []
            current_time = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            end_time = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            
            # Business hours (9 AM to 5 PM)
            business_start_hour = 9
            business_end_hour = 17
            
            while current_time < end_time:
                # Skip weekends if requested
                if exclude_weekends and current_time.weekday() >= 5:
                    current_time = current_time.replace(hour=business_start_hour, minute=0, second=0, microsecond=0) + timedelta(days=1)
                    continue
                
                # Skip outside business hours
                if current_time.hour < business_start_hour:
                    current_time = current_time.replace(hour=business_start_hour, minute=0, second=0, microsecond=0)
                    continue
                elif current_time.hour >= business_end_hour:
                    current_time = current_time.replace(hour=business_start_hour, minute=0, second=0, microsecond=0) + timedelta(days=1)
                    continue
                
                # Check if this slot conflicts with busy times
                slot_end = current_time + timedelta(minutes=duration_minutes)
                is_available = True
                
                for busy in busy_times:
                    if (current_time < busy["end"] and slot_end > busy["start"]):
                        is_available = False
                        # Skip to after this busy period
                        current_time = busy["end"]
                        break
                
                if is_available:
                    available_slots.append(TimeSlot(
                        start=current_time,
                        end=slot_end,
                        available=True
                    ))
                    current_time += timedelta(minutes=30)  # 30-minute intervals
                else:
                    continue
                
                # Limit to reasonable number of slots
                if len(available_slots) >= 20:
                    break
            
            return available_slots
            
        except Exception as e:
            logger.exception("Error finding available slots")
            raise
    
    def schedule_meeting(self, title: str, start_time: str, duration_minutes: int = 60, attendee_email: str = None, description: str = "", location: str = "") -> Dict[str, Any]:
        """Schedule a meeting during a call"""
        if not self.api:
            return {"error": "Calendar not connected"}
        
        try:
            start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            end_dt = start_dt + timedelta(minutes=duration_minutes)
            
            # Create event data
            event_data = {
                "summary": title,
                "description": description,
                "start": {
                    "dateTime": start_dt.isoformat(),
                    "timeZone": "UTC"
                },
                "end": {
                    "dateTime": end_dt.isoformat(),
                    "timeZone": "UTC"
                }
            }
            
            if location:
                event_data["location"] = location
            
            if attendee_email:
                event_data["attendees"] = [{"email": attendee_email}]
            
            # Create the event
            event = self.api.create_event(self.credentials.calendar_id, event_data)
            
            return {
                "status": "success",
                "event_id": event.get("id"),
                "event_link": event.get("htmlLink"),
                "start_time": start_time,
                "end_time": end_dt.isoformat(),
                "title": title
            }
            
        except Exception as e:
            logger.exception("Error scheduling meeting")
            return {"status": "error", "error": str(e)}
    
    def get_next_available_slot(self, duration_minutes: int = 60) -> Optional[TimeSlot]:
        """Get the next available time slot for quick scheduling"""
        try:
            # Look for slots in the next 14 days
            start_date = datetime.utcnow().isoformat() + "Z"
            end_date = (datetime.utcnow() + timedelta(days=14)).isoformat() + "Z"
            
            slots = self.find_available_slots(start_date, end_date, duration_minutes)
            
            return slots[0] if slots else None
            
        except Exception as e:
            logger.exception("Error getting next available slot")
            return None

def save_calendar_credentials(user_id: str, credentials: Dict) -> bool:
    """Save Google Calendar OAuth credentials to database"""
    try:
        cred_data = {
            "user_id": user_id,
            "provider": "google_calendar",
            "access_token": credentials["access_token"],
            "refresh_token": credentials.get("refresh_token"),
            "expires_at": credentials.get("expires_at"),
            "calendar_id": credentials.get("calendar_id", "primary"),
            "scopes": credentials.get("scope"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Upsert credentials
        result = supabase.table("integrations").upsert(cred_data, on_conflict=["user_id", "provider"]).execute()
        
        return bool(result.data)
        
    except Exception as e:
        logger.exception("Error saving calendar credentials")
        return False

def get_calendar_status(user_id: str) -> Dict[str, Any]:
    """Get calendar integration status for a user"""
    try:
        result = supabase.table("integrations").select("*").eq("user_id", user_id).eq("provider", "google_calendar").maybe_single().execute()
        
        if not result.data:
            return {
                "connected": False,
                "status": "not_connected"
            }
        
        data = result.data
        expires_at = datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None
        is_expired = expires_at < datetime.utcnow() if expires_at else False
        
        return {
            "connected": True,
            "status": "expired" if is_expired else "active",
            "calendar_id": data.get("calendar_id"),
            "scopes": data.get("scopes"),
            "last_sync": data.get("updated_at"),
            "expires_at": data.get("expires_at")
        }
        
    except Exception as e:
        logger.exception("Error getting calendar status")
        return {
            "connected": False,
            "status": "error",
            "error": str(e)
        }

# AI Function Call Tools for Vapi Integration
def ai_find_available_times(user_id: str, start_date: str, duration: str = "60") -> Dict[str, Any]:
    """AI Function: Find available meeting times"""
    try:
        scheduler = CalendarScheduler(user_id)
        if not scheduler.api:
            return {
                "status": "error",
                "message": "Calendar not connected. Please connect your Google Calendar first."
            }
        
        # Parse duration
        duration_minutes = int(duration)
        
        # Get available slots for next 7 days
        end_date = (datetime.fromisoformat(start_date.replace("Z", "+00:00")) + timedelta(days=7)).isoformat() + "Z"
        
        slots = scheduler.find_available_slots(start_date, end_date, duration_minutes)
        
        # Format for AI response
        formatted_slots = []
        for slot in slots[:5]:  # Limit to 5 options
            formatted_slots.append({
                "start_time": slot.start.strftime("%Y-%m-%d %H:%M"),
                "end_time": slot.end.strftime("%Y-%m-%d %H:%M"),
                "day": slot.start.strftime("%A"),
                "date": slot.start.strftime("%B %d")
            })
        
        return {
            "status": "success",
            "available_slots": formatted_slots,
            "message": f"Found {len(formatted_slots)} available time slots"
        }
        
    except Exception as e:
        logger.exception("Error in AI find available times")
        return {
            "status": "error",
            "message": f"Error finding available times: {str(e)}"
        }

def ai_schedule_meeting(user_id: str, title: str, start_time: str, duration: str = "60", attendee_email: str = "", description: str = "") -> Dict[str, Any]:
    """AI Function: Schedule a meeting"""
    try:
        scheduler = CalendarScheduler(user_id)
        if not scheduler.api:
            return {
                "status": "error",
                "message": "Calendar not connected. Please connect your Google Calendar first."
            }
        
        # Parse duration
        duration_minutes = int(duration)
        
        # Schedule the meeting
        result = scheduler.schedule_meeting(
            title=title,
            start_time=start_time,
            duration_minutes=duration_minutes,
            attendee_email=attendee_email,
            description=description
        )
        
        if result.get("status") == "success":
            return {
                "status": "success",
                "message": f"Meeting '{title}' scheduled successfully for {result['start_time']}",
                "event_id": result.get("event_id"),
                "event_link": result.get("event_link")
            }
        else:
            return {
                "status": "error",
                "message": f"Failed to schedule meeting: {result.get('error', 'Unknown error')}"
            }
        
    except Exception as e:
        logger.exception("Error in AI schedule meeting")
        return {
            "status": "error",
            "message": f"Error scheduling meeting: {str(e)}"
        }

def ai_get_next_available(user_id: str, duration: str = "60") -> Dict[str, Any]:
    """AI Function: Get next available time slot"""
    try:
        scheduler = CalendarScheduler(user_id)
        if not scheduler.api:
            return {
                "status": "error",
                "message": "Calendar not connected. Please connect your Google Calendar first."
            }
        
        duration_minutes = int(duration)
        next_slot = scheduler.get_next_available_slot(duration_minutes)
        
        if next_slot:
            return {
                "status": "success",
                "next_available": {
                    "start_time": next_slot.start.strftime("%Y-%m-%d %H:%M"),
                    "end_time": next_slot.end.strftime("%Y-%m-%d %H:%M"),
                    "day": next_slot.start.strftime("%A"),
                    "date": next_slot.start.strftime("%B %d")
                },
                "message": f"Next available slot is {next_slot.start.strftime('%A, %B %d at %H:%M')}"
            }
        else:
            return {
                "status": "error",
                "message": "No available slots found in the next 14 days"
            }
        
    except Exception as e:
        logger.exception("Error in AI get next available")
        return {
            "status": "error",
            "message": f"Error finding next available slot: {str(e)}"
        }
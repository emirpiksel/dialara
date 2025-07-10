"""
HubSpot CRM Integration Service
Handles two-way sync between Dialara and HubSpot
"""

import requests
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from config import get_config
from database import get_supabase_client

logger = logging.getLogger(__name__)
config = get_config()
supabase = get_supabase_client()


@dataclass
class HubSpotCredentials:
    access_token: str
    refresh_token: str
    expires_at: datetime
    portal_id: str


class HubSpotAPI:
    """HubSpot API client for CRM operations"""
    
    BASE_URL = "https://api.hubapi.com"
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Dict:
        """Make HTTP request to HubSpot API"""
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers, params=data)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data)
            elif method.upper() == "PATCH":
                response = requests.patch(url, headers=self.headers, json=data)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=self.headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json() if response.content else {}
            
        except requests.exceptions.RequestException as e:
            logger.error(f"HubSpot API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response content: {e.response.text}")
            raise
    
    def get_contacts(self, limit: int = 100, after: str = None) -> Dict:
        """Get contacts from HubSpot"""
        params = {"limit": limit}
        if after:
            params["after"] = after
            
        return self._make_request("GET", "/crm/v3/objects/contacts", params)
    
    def create_contact(self, contact_data: Dict) -> Dict:
        """Create a new contact in HubSpot"""
        payload = {"properties": contact_data}
        return self._make_request("POST", "/crm/v3/objects/contacts", payload)
    
    def update_contact(self, contact_id: str, contact_data: Dict) -> Dict:
        """Update an existing contact in HubSpot"""
        payload = {"properties": contact_data}
        return self._make_request("PATCH", f"/crm/v3/objects/contacts/{contact_id}", payload)
    
    def get_contact_by_email(self, email: str) -> Optional[Dict]:
        """Find a contact by email address"""
        try:
            params = {
                "filterGroups": [
                    {
                        "filters": [
                            {
                                "propertyName": "email",
                                "operator": "EQ",
                                "value": email
                            }
                        ]
                    }
                ]
            }
            result = self._make_request("POST", "/crm/v3/objects/contacts/search", params)
            return result.get("results", [{}])[0] if result.get("results") else None
        except Exception as e:
            logger.error(f"Error finding contact by email {email}: {e}")
            return None
    
    def create_note(self, contact_id: str, note_content: str, call_id: str = None) -> Dict:
        """Create a note associated with a contact"""
        note_data = {
            "properties": {
                "hs_note_body": note_content,
                "hs_timestamp": datetime.utcnow().isoformat(),
            }
        }
        
        if call_id:
            note_data["properties"]["hs_note_source"] = f"Dialara Call ID: {call_id}"
        
        note = self._make_request("POST", "/crm/v3/objects/notes", note_data)
        
        # Associate note with contact
        if note.get("id"):
            association_data = {
                "inputs": [
                    {
                        "from": {"id": note["id"]},
                        "to": {"id": contact_id},
                        "type": "note_to_contact"
                    }
                ]
            }
            self._make_request("POST", "/crm/v3/associations/notes/contacts/batch/create", association_data)
        
        return note
    
    def get_deals(self, contact_id: str) -> List[Dict]:
        """Get deals associated with a contact"""
        try:
            endpoint = f"/crm/v3/objects/contacts/{contact_id}/associations/deals"
            result = self._make_request("GET", endpoint)
            return result.get("results", [])
        except Exception as e:
            logger.error(f"Error getting deals for contact {contact_id}: {e}")
            return []


class HubSpotSync:
    """Handles synchronization between Dialara and HubSpot"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.credentials = self._get_credentials()
        self.api = HubSpotAPI(self.credentials.access_token) if self.credentials else None
    
    def _get_credentials(self) -> Optional[HubSpotCredentials]:
        """Get HubSpot credentials for user from database"""
        try:
            result = supabase.table("integrations").select("*").eq("user_id", self.user_id).eq("provider", "hubspot").maybe_single().execute()
            
            if not result.data:
                return None
            
            data = result.data
            return HubSpotCredentials(
                access_token=data["access_token"],
                refresh_token=data["refresh_token"],
                expires_at=datetime.fromisoformat(data["expires_at"]),
                portal_id=data["portal_id"]
            )
        except Exception as e:
            logger.error(f"Error getting HubSpot credentials: {e}")
            return None
    
    def _refresh_token_if_needed(self):
        """Refresh access token if it's expired"""
        if not self.credentials:
            return False
        
        if datetime.utcnow() < self.credentials.expires_at:
            return True  # Token is still valid
        
        try:
            # Refresh token logic would go here
            # For now, we'll assume tokens are long-lived
            logger.warning("HubSpot token refresh needed but not implemented")
            return False
        except Exception as e:
            logger.error(f"Error refreshing HubSpot token: {e}")
            return False
    
    def sync_contacts_to_dialara(self) -> Dict[str, Any]:
        """Import HubSpot contacts into Dialara as leads"""
        if not self.api:
            return {"error": "HubSpot not connected"}
        
        try:
            imported_count = 0
            errors = []
            
            # Get contacts from HubSpot
            contacts_data = self.api.get_contacts(limit=100)
            contacts = contacts_data.get("results", [])
            
            for contact in contacts:
                try:
                    properties = contact.get("properties", {})
                    
                    # Map HubSpot contact to Dialara lead
                    lead_data = {
                        "clinic_name": properties.get("company", "Unknown Company"),
                        "full_name": f"{properties.get('firstname', '')} {properties.get('lastname', '')}".strip(),
                        "phone_number": properties.get("phone", ""),
                        "email": properties.get("email", ""),
                        "source": "HubSpot Import",
                        "status": self._map_hubspot_status(properties.get("hs_lead_status", "")),
                        "user_id": self.user_id,
                        "call_status": "pending",
                        "hubspot_id": contact.get("id"),
                        "consent_confirmed": True,  # Assume consent from HubSpot
                        "consent_date": datetime.utcnow().isoformat(),
                        "data_source": "hubspot_import"
                    }
                    
                    # Only import if we have required fields
                    if lead_data["full_name"] and (lead_data["phone_number"] or lead_data["email"]):
                        # Check if lead already exists
                        existing = supabase.table("leads").select("id").eq("hubspot_id", contact.get("id")).maybe_single().execute()
                        
                        if existing.data:
                            # Update existing lead
                            supabase.table("leads").update(lead_data).eq("id", existing.data["id"]).execute()
                        else:
                            # Create new lead
                            supabase.table("leads").insert(lead_data).execute()
                        
                        imported_count += 1
                    
                except Exception as e:
                    errors.append(f"Error importing contact {contact.get('id')}: {str(e)}")
            
            return {
                "status": "success",
                "imported_count": imported_count,
                "total_contacts": len(contacts),
                "errors": errors
            }
            
        except Exception as e:
            logger.exception("Error syncing HubSpot contacts to Dialara")
            return {"error": str(e)}
    
    def sync_call_to_hubspot(self, call_data: Dict) -> Dict[str, Any]:
        """Sync a Dialara call to HubSpot as a note or activity"""
        if not self.api:
            return {"error": "HubSpot not connected"}
        
        try:
            # Find contact by phone number or email
            contact = None
            if call_data.get("caller_number"):
                # Try to find contact by phone number first
                contacts = self.api.get_contacts()
                for c in contacts.get("results", []):
                    props = c.get("properties", {})
                    if props.get("phone") == call_data["caller_number"]:
                        contact = c
                        break
            
            if not contact:
                # Create a new contact if not found
                contact_data = {
                    "phone": call_data.get("caller_number", ""),
                    "firstname": "Unknown",
                    "lastname": "Caller",
                    "hs_lead_status": "NEW"
                }
                contact = self.api.create_contact(contact_data)
            
            if contact and contact.get("id"):
                # Create note about the call
                note_content = f"""
Call Summary - {call_data.get('timestamp', datetime.utcnow().isoformat())}

Duration: {call_data.get('duration', 0)} seconds
Status: {call_data.get('status', 'completed')}
Sentiment: {call_data.get('sentiment', 'neutral')}
Score: {call_data.get('score', 'N/A')}/10

Summary: {call_data.get('summary', 'No summary available')}

Call Type: {call_data.get('call_type', 'unknown')}
End Reason: {call_data.get('ended_reason', 'N/A')}

Generated by Dialara AI Call Management System
                """.strip()
                
                note = self.api.create_note(
                    contact["id"], 
                    note_content, 
                    call_data.get("call_id")
                )
                
                return {
                    "status": "success",
                    "contact_id": contact["id"],
                    "note_id": note.get("id")
                }
            
            return {"error": "Could not find or create contact"}
            
        except Exception as e:
            logger.exception("Error syncing call to HubSpot")
            return {"error": str(e)}
    
    def _map_hubspot_status(self, hubspot_status: str) -> str:
        """Map HubSpot lead status to Dialara status"""
        status_mapping = {
            "NEW": "new",
            "OPEN": "contacted", 
            "IN_PROGRESS": "qualified",
            "QUALIFIED": "qualified",
            "UNQUALIFIED": "closed",
            "CUSTOMER": "closed",
            "EVANGELIST": "closed"
        }
        return status_mapping.get(hubspot_status.upper(), "new")


def save_hubspot_credentials(user_id: str, credentials: Dict) -> bool:
    """Save HubSpot OAuth credentials to database"""
    try:
        cred_data = {
            "user_id": user_id,
            "provider": "hubspot",
            "access_token": credentials["access_token"],
            "refresh_token": credentials.get("refresh_token"),
            "expires_at": credentials.get("expires_at"),
            "portal_id": credentials.get("hub_id"),
            "scopes": credentials.get("scope"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Upsert credentials
        result = supabase.table("integrations").upsert(cred_data, on_conflict=["user_id", "provider"]).execute()
        
        return bool(result.data)
        
    except Exception as e:
        logger.exception("Error saving HubSpot credentials")
        return False


def get_hubspot_sync_status(user_id: str) -> Dict[str, Any]:
    """Get HubSpot integration status for a user"""
    try:
        result = supabase.table("integrations").select("*").eq("user_id", user_id).eq("provider", "hubspot").maybe_single().execute()
        
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
            "portal_id": data.get("portal_id"),
            "scopes": data.get("scopes"),
            "last_sync": data.get("updated_at"),
            "expires_at": data.get("expires_at")
        }
        
    except Exception as e:
        logger.exception("Error getting HubSpot sync status")
        return {
            "connected": False,
            "status": "error",
            "error": str(e)
        }
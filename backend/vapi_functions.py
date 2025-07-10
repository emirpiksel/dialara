"""
Vapi Function Call Definitions for Calendar Integration
These functions can be called by the AI assistant during calls
"""

import json
from datetime import datetime
from calendar_service import ai_find_available_times, ai_schedule_meeting, ai_get_next_available

# Function definitions for Vapi assistant configuration
VAPI_FUNCTION_DEFINITIONS = [
    {
        "name": "find_available_times",
        "description": "Find available meeting times in the user's calendar",
        "parameters": {
            "type": "object",
            "properties": {
                "start_date": {
                    "type": "string",
                    "description": "Start date to search for availability (ISO format, e.g., '2024-01-15T09:00:00Z')"
                },
                "duration": {
                    "type": "string",
                    "description": "Meeting duration in minutes (default: 60)",
                    "default": "60"
                }
            },
            "required": ["start_date"]
        }
    },
    {
        "name": "schedule_meeting",
        "description": "Schedule a meeting with the specified details",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Meeting title/subject"
                },
                "start_time": {
                    "type": "string",
                    "description": "Meeting start time (ISO format, e.g., '2024-01-15T14:00:00Z')"
                },
                "duration": {
                    "type": "string",
                    "description": "Meeting duration in minutes (default: 60)",
                    "default": "60"
                },
                "attendee_email": {
                    "type": "string",
                    "description": "Email address of the attendee to invite (optional)"
                },
                "description": {
                    "type": "string",
                    "description": "Meeting description or agenda (optional)"
                }
            },
            "required": ["title", "start_time"]
        }
    },
    {
        "name": "get_next_available",
        "description": "Get the next available time slot for quick scheduling",
        "parameters": {
            "type": "object",
            "properties": {
                "duration": {
                    "type": "string",
                    "description": "Meeting duration in minutes (default: 60)",
                    "default": "60"
                }
            }
        }
    },
    {
        "name": "search_knowledge",
        "description": "Search the user's knowledge base for relevant information",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query to find relevant documents and information"
                },
                "max_results": {
                    "type": "string",
                    "description": "Maximum number of results to return (default: 3)",
                    "default": "3"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "lookup_lead",
        "description": "Look up lead information by phone number or email",
        "parameters": {
            "type": "object",
            "properties": {
                "identifier": {
                    "type": "string",
                    "description": "Phone number or email address to search for"
                },
                "identifier_type": {
                    "type": "string",
                    "description": "Type of identifier: 'phone' or 'email'",
                    "enum": ["phone", "email"]
                }
            },
            "required": ["identifier", "identifier_type"]
        }
    },
    {
        "name": "update_lead_status",
        "description": "Update the status of a lead",
        "parameters": {
            "type": "object",
            "properties": {
                "lead_id": {
                    "type": "string",
                    "description": "ID of the lead to update"
                },
                "new_status": {
                    "type": "string",
                    "description": "New status for the lead",
                    "enum": ["new", "contacted", "qualified", "converted", "lost", "follow_up"]
                },
                "notes": {
                    "type": "string",
                    "description": "Optional notes about the status change"
                }
            },
            "required": ["lead_id", "new_status"]
        }
    },
    {
        "name": "get_call_history",
        "description": "Get recent call history for a lead or general call history",
        "parameters": {
            "type": "object",
            "properties": {
                "lead_phone": {
                    "type": "string",
                    "description": "Phone number to get call history for (optional)"
                },
                "limit": {
                    "type": "string",
                    "description": "Number of recent calls to return (default: 5)",
                    "default": "5"
                }
            }
        }
    },
    {
        "name": "create_follow_up_task",
        "description": "Create a follow-up task or reminder",
        "parameters": {
            "type": "object",
            "properties": {
                "task_description": {
                    "type": "string",
                    "description": "Description of the follow-up task"
                },
                "due_date": {
                    "type": "string",
                    "description": "Due date for the task (ISO format)"
                },
                "lead_id": {
                    "type": "string",
                    "description": "Associated lead ID (optional)"
                },
                "priority": {
                    "type": "string",
                    "description": "Task priority level",
                    "enum": ["low", "medium", "high"],
                    "default": "medium"
                }
            },
            "required": ["task_description", "due_date"]
        }
    },
    {
        "name": "log_call_outcome",
        "description": "Log the outcome and notes from the current call",
        "parameters": {
            "type": "object",
            "properties": {
                "call_id": {
                    "type": "string",
                    "description": "Current call ID"
                },
                "outcome": {
                    "type": "string",
                    "description": "Call outcome",
                    "enum": ["interested", "not_interested", "follow_up", "callback", "no_answer", "voicemail", "busy", "wrong_number", "appointment_set", "sale_made"]
                },
                "notes": {
                    "type": "string",
                    "description": "Detailed notes about the call"
                },
                "next_action": {
                    "type": "string",
                    "description": "Recommended next action"
                }
            },
            "required": ["call_id", "outcome"]
        }
    },
    {
        "name": "calculate_pricing",
        "description": "Calculate pricing for products or services based on customer requirements",
        "parameters": {
            "type": "object",
            "properties": {
                "product_type": {
                    "type": "string",
                    "description": "Type of product or service"
                },
                "quantity": {
                    "type": "string",
                    "description": "Quantity or volume required"
                },
                "duration": {
                    "type": "string",
                    "description": "Duration or term (for services)"
                },
                "customer_type": {
                    "type": "string",
                    "description": "Customer type for pricing tiers",
                    "enum": ["individual", "small_business", "enterprise"]
                }
            },
            "required": ["product_type"]
        }
    }
]

# Function call handlers - these will be called by Vapi
def handle_vapi_function_call(function_name: str, parameters: dict, user_id: str) -> dict:
    """
    Handle Vapi function calls for calendar operations
    This function should be called from your Vapi webhook handler
    """
    try:
        if function_name == "find_available_times":
            start_date = parameters.get("start_date")
            duration = parameters.get("duration", "60")
            return ai_find_available_times(user_id, start_date, duration)
            
        elif function_name == "schedule_meeting":
            title = parameters.get("title")
            start_time = parameters.get("start_time")
            duration = parameters.get("duration", "60")
            attendee_email = parameters.get("attendee_email", "")
            description = parameters.get("description", "")
            return ai_schedule_meeting(user_id, title, start_time, duration, attendee_email, description)
            
        elif function_name == "get_next_available":
            duration = parameters.get("duration", "60")
            return ai_get_next_available(user_id, duration)
            
        elif function_name == "search_knowledge":
            query = parameters.get("query")
            max_results = parameters.get("max_results", "3")
            from knowledge_base_service import ai_search_knowledge
            return ai_search_knowledge(user_id, query, max_results)
            
        elif function_name == "lookup_lead":
            identifier = parameters.get("identifier")
            identifier_type = parameters.get("identifier_type")
            return ai_lookup_lead(user_id, identifier, identifier_type)
            
        elif function_name == "update_lead_status":
            lead_id = parameters.get("lead_id")
            new_status = parameters.get("new_status")
            notes = parameters.get("notes", "")
            return ai_update_lead_status(user_id, lead_id, new_status, notes)
            
        elif function_name == "get_call_history":
            lead_phone = parameters.get("lead_phone")
            limit = parameters.get("limit", "5")
            return ai_get_call_history(user_id, lead_phone, limit)
            
        elif function_name == "create_follow_up_task":
            task_description = parameters.get("task_description")
            due_date = parameters.get("due_date")
            lead_id = parameters.get("lead_id")
            priority = parameters.get("priority", "medium")
            return ai_create_follow_up_task(user_id, task_description, due_date, lead_id, priority)
            
        elif function_name == "log_call_outcome":
            call_id = parameters.get("call_id")
            outcome = parameters.get("outcome")
            notes = parameters.get("notes", "")
            next_action = parameters.get("next_action", "")
            return ai_log_call_outcome(user_id, call_id, outcome, notes, next_action)
            
        elif function_name == "calculate_pricing":
            product_type = parameters.get("product_type")
            quantity = parameters.get("quantity", "1")
            duration = parameters.get("duration", "")
            customer_type = parameters.get("customer_type", "individual")
            return ai_calculate_pricing(user_id, product_type, quantity, duration, customer_type)
            
        else:
            return {
                "status": "error",
                "message": f"Unknown function: {function_name}"
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error executing function {function_name}: {str(e)}"
        }

# Language configurations for STT/TTS
LANGUAGE_CONFIGS = {
    "en": {
        "name": "English",
        "voice": {
            "provider": "11labs",
            "voiceId": "21m00Tcm4TlvDq8ikWAM"  # Default English voice
        },
        "transcriber": {
            "provider": "deepgram",
            "model": "nova-2",
            "language": "en-US"
        },
        "greeting": "Hello! I'm your AI assistant. I can help you schedule meetings and find information from your knowledge base. How can I help you today?"
    },
    "tr": {
        "name": "Turkish",
        "voice": {
            "provider": "11labs",
            "voiceId": "pNInz6obpgDQGcFmaJgB"  # Turkish voice - adjust as needed
        },
        "transcriber": {
            "provider": "deepgram",
            "model": "nova-2",
            "language": "tr"
        },
        "greeting": "Merhaba! Ben AI asistanınızım. Toplantı planlamanızda ve bilgi tabanınızdan bilgi bulmanızda size yardımcı olabilirim. Size nasıl yardımcı olabilirim?"
    },
    "es": {
        "name": "Spanish",
        "voice": {
            "provider": "11labs",
            "voiceId": "pNInz6obpgDQGcFmaJgB"  # Spanish voice - adjust as needed
        },
        "transcriber": {
            "provider": "deepgram",
            "model": "nova-2",
            "language": "es"
        },
        "greeting": "¡Hola! Soy tu asistente de IA. Puedo ayudarte a programar reuniones y encontrar información de tu base de conocimientos. ¿Cómo puedo ayudarte hoy?"
    }
}

def get_language_config(language_code: str = "en") -> dict:
    """Get language-specific configuration for Vapi assistant"""
    return LANGUAGE_CONFIGS.get(language_code, LANGUAGE_CONFIGS["en"])

def get_available_languages() -> list:
    """Get list of available languages for voice/transcription"""
    return [
        {"code": code, "name": config["name"]} 
        for code, config in LANGUAGE_CONFIGS.items()
    ]

# Example Vapi assistant configuration with calendar functions
def get_vapi_assistant_config_for_language(language_code: str = "en") -> dict:
    """Get Vapi assistant configuration for specific language"""
    lang_config = get_language_config(language_code)
    
    system_messages = {
        "en": """You are a helpful AI assistant with access to calendar scheduling and knowledge base search capabilities. You have access to these functions:

Calendar Functions:
1. find_available_times(start_date, duration) - Find available meeting slots
2. schedule_meeting(title, start_time, duration, attendee_email, description) - Schedule a meeting
3. get_next_available(duration) - Get the next available time slot

Knowledge Base Functions:
4. search_knowledge(query, max_results) - Search user's documents for relevant information

Database Functions:
5. lookup_lead(identifier, identifier_type) - Look up lead information by phone or email
6. update_lead_status(lead_id, new_status, notes) - Update lead status
7. get_call_history(lead_phone, limit) - Get recent call history
8. create_follow_up_task(task_description, due_date, lead_id, priority) - Create follow-up tasks
9. log_call_outcome(call_id, outcome, notes, next_action) - Log call outcomes
10. calculate_pricing(product_type, quantity, duration, customer_type) - Calculate pricing

When helping users:

For meeting scheduling:
1. Ask for meeting details (title, duration, attendee if needed)
2. Use find_available_times or get_next_available to check availability
3. Present options and get user confirmation
4. Use schedule_meeting to book the meeting
5. Confirm the details and provide meeting link

For information requests:
1. Use search_knowledge to find relevant information from their documents
2. Provide accurate answers based on the search results
3. Cite the source documents when possible
4. If no relevant information is found, let them know

For customer interactions:
1. Use lookup_lead to find customer information when they call
2. Update lead status as conversations progress
3. Create follow-up tasks when needed
4. Log call outcomes for tracking
5. Provide pricing when requested

Always be helpful, accurate, and confirm important details before taking actions.""",
        
        "tr": """Takvim planlama ve bilgi tabanı arama yeteneklerine sahip yardımcı bir AI asistanısınız. Bu fonksiyonlara erişiminiz var:

Takvim Fonksiyonları:
1. find_available_times(start_date, duration) - Müsait toplantı saatlerini bul
2. schedule_meeting(title, start_time, duration, attendee_email, description) - Toplantı planla
3. get_next_available(duration) - Sonraki müsait zamanı bul

Bilgi Tabanı Fonksiyonları:
4. search_knowledge(query, max_results) - Kullanıcının belgelerinde ilgili bilgiyi ara

Veritabanı Fonksiyonları:
5. lookup_lead(identifier, identifier_type) - Telefon veya e-posta ile potansiyel müşteri bilgilerini ara
6. update_lead_status(lead_id, new_status, notes) - Potansiyel müşteri durumunu güncelle
7. get_call_history(lead_phone, limit) - Son arama geçmişini al
8. create_follow_up_task(task_description, due_date, lead_id, priority) - Takip görevleri oluştur
9. log_call_outcome(call_id, outcome, notes, next_action) - Arama sonuçlarını kaydet
10. calculate_pricing(product_type, quantity, duration, customer_type) - Fiyatlandırma hesapla

Kullanıcılara yardım ederken:

Toplantı planlaması için:
1. Toplantı detaylarını sorun (başlık, süre, katılımcı)
2. Müsaitlik kontrolü için find_available_times veya get_next_available kullanın
3. Seçenekleri sunun ve kullanıcı onayını alın
4. Toplantıyı planlamak için schedule_meeting kullanın
5. Detayları onaylayın ve toplantı linkini sağlayın

Bilgi talepleri için:
1. Belgelerinde ilgili bilgiyi bulmak için search_knowledge kullanın
2. Arama sonuçlarına dayalı doğru cevaplar verin
3. Mümkün olduğunda kaynak belgeleri belirtin
4. İlgili bilgi bulunamazsa bunu bildirin

Müşteri etkileşimleri için:
1. Aradıklarında müşteri bilgilerini bulmak için lookup_lead kullanın
2. Konuşma ilerledikçe potansiyel müşteri durumunu güncelleyin
3. Gerektiğinde takip görevleri oluşturun
4. İzleme için arama sonuçlarını kaydedin
5. İstendiğinde fiyatlandırma sağlayın

Her zaman yardımcı, doğru olun ve önemli detayları eylem almadan önce onaylayın."""
    }
    
    return {
        "name": f"AI Assistant ({lang_config['name']})",
        "firstMessage": lang_config["greeting"],
        "model": {
            "provider": "openai",
            "model": "gpt-4",
            "temperature": 0.7,
            "systemMessage": system_messages.get(language_code, system_messages["en"])
        },
        "voice": lang_config["voice"],
        "transcriber": lang_config["transcriber"],
        "functions": VAPI_FUNCTION_DEFINITIONS
    }

# Keep the original for backward compatibility
VAPI_ASSISTANT_CONFIG_EXAMPLE = get_vapi_assistant_config_for_language("en")

Calendar Functions:
1. find_available_times(start_date, duration) - Find available meeting slots
2. schedule_meeting(title, start_time, duration, attendee_email, description) - Schedule a meeting
3. get_next_available(duration) - Get the next available time slot

Knowledge Base Functions:
4. search_knowledge(query, max_results) - Search user's documents for relevant information

When helping users:

For meeting scheduling:
1. Ask for meeting details (title, duration, attendee if needed)
2. Use find_available_times or get_next_available to check availability
3. Present options and get user confirmation
4. Use schedule_meeting to book the meeting
5. Confirm the details and provide meeting link

For information requests:
1. Use search_knowledge to find relevant information from their documents
2. Provide accurate answers based on the search results
3. Cite the source documents when possible
4. If no relevant information is found, let them know

Always be helpful, accurate, and confirm important details before taking actions."""
    },
    "voice": {
        "provider": "11labs",
        "voiceId": "21m00Tcm4TlvDq8ikWAM"
    },
    "functions": VAPI_FUNCTION_DEFINITIONS
}

def get_vapi_function_definitions():
    """Get the function definitions for Vapi assistant configuration"""
    return VAPI_FUNCTION_DEFINITIONS

def get_example_assistant_config():
    """Get example Vapi assistant configuration with calendar functions"""
    return VAPI_ASSISTANT_CONFIG_EXAMPLE

# AI Prompt templates for calendar functions
CALENDAR_PROMPTS = {
    "find_availability": """The user is asking about availability for a meeting. Use the find_available_times function to check their calendar. 

User request: "{user_message}"

If they haven't specified a date, ask them when they'd like to schedule the meeting. If they haven't specified duration, assume 60 minutes.""",

    "schedule_meeting": """The user wants to schedule a meeting. Use the schedule_meeting function with the details they've provided.

User request: "{user_message}"

Make sure you have all required details:
- Meeting title/subject
- Date and time
- Duration (if not specified, use 60 minutes)
- Attendee email (if they want to invite someone)

If any required information is missing, ask for it before scheduling.""",

    "quick_schedule": """The user wants to quickly schedule something. Use get_next_available to find the next open slot, then confirm with them before scheduling.

User request: "{user_message}"

If they approve the suggested time, use schedule_meeting to book it."""
}

def get_calendar_prompts():
    """Get AI prompt templates for calendar operations"""
    return CALENDAR_PROMPTS

# Database function implementations
def ai_lookup_lead(user_id: str, identifier: str, identifier_type: str) -> dict:
    """Look up lead information by phone number or email"""
    try:
        from database import get_supabase_client
        supabase = get_supabase_client()
        
        # Build query based on identifier type
        if identifier_type == "phone":
            query = supabase.table('leads').select('*').eq('phone_number', identifier).eq('user_id', user_id)
        elif identifier_type == "email":
            query = supabase.table('leads').select('*').eq('email', identifier).eq('user_id', user_id)
        else:
            return {
                "status": "error",
                "message": "Invalid identifier type. Must be 'phone' or 'email'"
            }
        
        result = query.execute()
        
        if result.data:
            lead = result.data[0]
            return {
                "status": "success",
                "lead": {
                    "id": lead["id"],
                    "clinic_name": lead["clinic_name"],
                    "full_name": lead["full_name"],
                    "phone_number": lead["phone_number"],
                    "email": lead.get("email", ""),
                    "status": lead["status"],
                    "source": lead["source"],
                    "notes": lead.get("notes", ""),
                    "last_contact_date": lead.get("last_contact_date", ""),
                    "created_at": lead["created_at"]
                },
                "message": f"Found lead: {lead['full_name']} from {lead['clinic_name']}"
            }
        else:
            return {
                "status": "not_found",
                "message": f"No lead found with {identifier_type}: {identifier}"
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error looking up lead: {str(e)}"
        }

def ai_update_lead_status(user_id: str, lead_id: str, new_status: str, notes: str = "") -> dict:
    """Update the status of a lead"""
    try:
        from database import get_supabase_client
        from datetime import datetime
        supabase = get_supabase_client()
        
        # Update lead status
        update_data = {
            "status": new_status,
            "updated_at": datetime.now().isoformat(),
            "last_contact_date": datetime.now().isoformat()
        }
        
        if notes:
            # Append notes to existing notes
            existing_lead = supabase.table('leads').select('notes').eq('id', lead_id).eq('user_id', user_id).execute()
            if existing_lead.data:
                existing_notes = existing_lead.data[0].get('notes', '')
                new_notes = f"{existing_notes}\n\n{datetime.now().strftime('%Y-%m-%d %H:%M')}: {notes}" if existing_notes else notes
                update_data["notes"] = new_notes
        
        result = supabase.table('leads').update(update_data).eq('id', lead_id).eq('user_id', user_id).execute()
        
        if result.data:
            return {
                "status": "success",
                "message": f"Lead status updated to '{new_status}'" + (f" with notes: {notes}" if notes else ""),
                "lead_id": lead_id,
                "new_status": new_status
            }
        else:
            return {
                "status": "error",
                "message": "Lead not found or unauthorized"
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error updating lead status: {str(e)}"
        }

def ai_get_call_history(user_id: str, lead_phone: str = None, limit: str = "5") -> dict:
    """Get recent call history for a lead or general call history"""
    try:
        from database import get_supabase_client
        supabase = get_supabase_client()
        
        query = supabase.table('call_logs').select('*').eq('user_id', user_id)
        
        if lead_phone:
            query = query.or_(f'caller_number.eq.{lead_phone},dialed_number.eq.{lead_phone}')
        
        result = query.order('created_at', desc=True).limit(int(limit)).execute()
        
        calls = []
        for call in result.data or []:
            calls.append({
                "call_id": call["call_id"],
                "date": call["created_at"],
                "duration": call.get("duration", 0),
                "caller_number": call.get("caller_number", ""),
                "status": call.get("status", ""),
                "summary": call.get("summary", ""),
                "sentiment": call.get("sentiment", ""),
                "call_type": call.get("call_type", "")
            })
        
        return {
            "status": "success",
            "calls": calls,
            "total_calls": len(calls),
            "message": f"Found {len(calls)} recent calls" + (f" for {lead_phone}" if lead_phone else "")
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error retrieving call history: {str(e)}"
        }

def ai_create_follow_up_task(user_id: str, task_description: str, due_date: str, lead_id: str = None, priority: str = "medium") -> dict:
    """Create a follow-up task or reminder"""
    try:
        from database import get_supabase_client
        from datetime import datetime
        supabase = get_supabase_client()
        
        # For now, we'll log this as an event since we don't have a dedicated tasks table
        # In a full implementation, you'd create a tasks table
        
        task_data = {
            "call_id": f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "event_type": "follow_up_task_created",
            "payload": {
                "task_description": task_description,
                "due_date": due_date,
                "lead_id": lead_id,
                "priority": priority,
                "user_id": user_id,
                "status": "pending",
                "created_at": datetime.now().isoformat()
            }
        }
        
        result = supabase.table('event_logs').insert(task_data).execute()
        
        if result.data:
            return {
                "status": "success",
                "message": f"Follow-up task created: {task_description}",
                "task": {
                    "id": result.data[0]["id"],
                    "description": task_description,
                    "due_date": due_date,
                    "priority": priority,
                    "lead_id": lead_id
                }
            }
        else:
            return {
                "status": "error",
                "message": "Failed to create follow-up task"
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error creating follow-up task: {str(e)}"
        }

def ai_log_call_outcome(user_id: str, call_id: str, outcome: str, notes: str = "", next_action: str = "") -> dict:
    """Log the outcome and notes from the current call"""
    try:
        from database import get_supabase_client
        from datetime import datetime
        supabase = get_supabase_client()
        
        # Update call log with outcome information
        update_data = {
            "status": "completed",
            "summary": f"Outcome: {outcome}. {notes}".strip(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Add outcome-specific fields if they exist in the schema
        if hasattr(supabase.table('call_logs'), 'feedback'):
            update_data["feedback"] = f"Outcome: {outcome}. Next action: {next_action}. Notes: {notes}".strip()
        
        result = supabase.table('call_logs').update(update_data).eq('call_id', call_id).eq('user_id', user_id).execute()
        
        # Also log as an event for tracking
        event_data = {
            "call_id": call_id,
            "event_type": "call_outcome_logged",
            "payload": {
                "outcome": outcome,
                "notes": notes,
                "next_action": next_action,
                "user_id": user_id,
                "logged_at": datetime.now().isoformat()
            }
        }
        
        supabase.table('event_logs').insert(event_data).execute()
        
        return {
            "status": "success",
            "message": f"Call outcome logged: {outcome}",
            "call_id": call_id,
            "outcome": outcome,
            "next_action": next_action
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error logging call outcome: {str(e)}"
        }

def ai_calculate_pricing(user_id: str, product_type: str, quantity: str = "1", duration: str = "", customer_type: str = "individual") -> dict:
    """Calculate pricing for products or services based on customer requirements"""
    try:
        # This is a basic pricing calculator - in a real implementation,
        # you'd have a pricing table or service integration
        
        base_prices = {
            "dialara_basic": 49,
            "dialara_pro": 99,
            "dialara_enterprise": 199,
            "training_session": 25,
            "ai_assistant": 19,
            "custom_integration": 500
        }
        
        # Customer type multipliers
        multipliers = {
            "individual": 1.0,
            "small_business": 0.9,  # 10% discount
            "enterprise": 0.8       # 20% discount
        }
        
        # Duration discounts (for monthly pricing)
        duration_discounts = {
            "monthly": 1.0,
            "quarterly": 0.95,
            "yearly": 0.85
        }
        
        product_lower = product_type.lower().replace(" ", "_")
        base_price = base_prices.get(product_lower, 100)  # Default price
        
        qty = int(quantity) if quantity.isdigit() else 1
        multiplier = multipliers.get(customer_type, 1.0)
        duration_discount = duration_discounts.get(duration.lower(), 1.0) if duration else 1.0
        
        unit_price = base_price * multiplier * duration_discount
        total_price = unit_price * qty
        
        return {
            "status": "success",
            "pricing": {
                "product_type": product_type,
                "quantity": qty,
                "customer_type": customer_type,
                "duration": duration or "monthly",
                "unit_price": round(unit_price, 2),
                "total_price": round(total_price, 2),
                "currency": "USD",
                "discounts_applied": {
                    "customer_discount": round((1 - multiplier) * 100, 1),
                    "duration_discount": round((1 - duration_discount) * 100, 1)
                }
            },
            "message": f"Pricing calculated: ${total_price:.2f} for {qty} {product_type} ({customer_type} pricing)"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error calculating pricing: {str(e)}"
        }
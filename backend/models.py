"""
Pydantic models for API request/response validation
"""
from pydantic import BaseModel

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

class LeadImportRequest(BaseModel):
    leads: list
    user_id: str
    consent_confirmed: bool = False
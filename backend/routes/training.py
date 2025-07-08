from fastapi import APIRouter, HTTPException
from supabase import create_client, Client
import os
from dotenv import load_dotenv  # Ensure dotenv is loaded for environment variables

# Load environment variables from the .env file
load_dotenv()

# Retrieve Supabase URL and Key from environment variables
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")

# Ensure Supabase credentials are available
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase URL and Key are required")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize APIRouter
router = APIRouter()

@router.get("/api/getTrainingCategories")
def get_training_categories():
    try:
        response = supabase.table("training_categories").select("*").order("created_at").execute()
        print("📦 Categories response →", response)
        return response.data
    except Exception as e:
        print("❌ Error in getTrainingCategories:", e)
        raise HTTPException(status_code=500, detail=f"Error fetching categories: {str(e)}")


@router.get("/api/getModulesByCategory/{category_id}")
def get_modules_by_category(category_id: str):
    try:
        response = supabase.table("training_modules").select("*").eq("category_id", category_id).execute()
        return response.data or []  # ← graceful fallback
    except Exception as e:
        print("❌ Error in getModulesByCategory:", e)
        raise HTTPException(status_code=500, detail=f"Error fetching modules: {str(e)}")



@router.get("/api/getTrainingAgentsByModule/{module_id}")
def get_training_agents_by_module(module_id: str):
    try:
        response = supabase.table("training_agents").select("*").eq("module_id", module_id).execute()
        if response.data:
            return response.data
        else:
            raise HTTPException(status_code=404, detail="No agents found for this module.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

"""
Configuration management for the backend application.
Centralizes all configuration values and provides type safety.
"""

import os
from typing import List, Dict, Any
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables from .env file in parent directory
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)


@dataclass
class ScoringConfig:
    """Configuration for the scoring system"""
    
    # Duration thresholds (in seconds)
    duration_very_short: int = 15
    duration_short: int = 30
    duration_medium: int = 60
    duration_long: int = 90
    duration_very_long: int = 120
    
    # Score weights
    engagement_weight: float = 0.25
    communication_weight: float = 0.25
    problem_solving_weight: float = 0.25
    professionalism_weight: float = 0.15
    duration_factor_weight: float = 0.10
    
    # Difficulty multiplier range
    difficulty_min_multiplier: float = 0.7
    difficulty_step: float = 0.06
    
    # XP calculation
    base_xp_multiplier: int = 10
    perfect_score_bonus: int = 20
    high_engagement_bonus: int = 10
    long_conversation_bonus: int = 15
    high_difficulty_bonus: int = 5
    
    # Scoring thresholds
    perfect_score_threshold: float = 9.5
    high_engagement_threshold: int = 8
    long_conversation_threshold: int = 90
    high_difficulty_threshold: int = 8
    
    # Inappropriate words filter
    inappropriate_words: List[str] = None
    
    def __post_init__(self):
        if self.inappropriate_words is None:
            self.inappropriate_words = [
                'damn', 'hell', 'stupid', 'idiot', 'moron',
                'dumb', 'fool', 'loser', 'jerk', 'ass'
            ]


@dataclass
class AppConfig:
    """Main application configuration"""
    
    # Universal agent ID for training
    universal_agent_id: str = "17c2b88e-097d-4b53-aea3-b4871cb48339"
    
    # Database configuration
    supabase_url: str = None
    supabase_key: str = None
    
    # Vapi configuration
    vapi_private_key: str = None
    vapi_assistant_id: str = None
    vapi_webhook_secret: str = None
    
    # Webhook configuration
    webhook_timeout: int = 20
    webhook_url: str = None
    
    # Logging configuration
    log_level: str = "INFO"
    log_file_training: str = "training_debug.log"
    log_file_errors: str = "training_errors.log"
    
    # Scoring configuration
    scoring: ScoringConfig = None
    
    def __post_init__(self):
        if self.scoring is None:
            self.scoring = ScoringConfig()
        
        # Load from environment variables with proper fallbacks
        self.supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
        self.vapi_private_key = os.getenv("VAPI_PRIVATE_KEY")
        self.vapi_assistant_id = os.getenv("VAPI_ASSISTANT_ID")
        self.vapi_webhook_secret = os.getenv("VAPI_WEBHOOK_SECRET")
        self.webhook_url = os.getenv("WEBHOOK_URL")
        
        # Override with environment variables if present
        if os.getenv("UNIVERSAL_AGENT_ID"):
            self.universal_agent_id = os.getenv("UNIVERSAL_AGENT_ID")
        
        if os.getenv("WEBHOOK_TIMEOUT"):
            self.webhook_timeout = int(os.getenv("WEBHOOK_TIMEOUT"))
        
        if os.getenv("LOG_LEVEL"):
            self.log_level = os.getenv("LOG_LEVEL")
    
    def validate(self) -> None:
        """Validate that all required configuration is present"""
        required_fields = [
            ("supabase_url", self.supabase_url),
            ("supabase_key", self.supabase_key),
            ("vapi_private_key", self.vapi_private_key),
            ("vapi_assistant_id", self.vapi_assistant_id),
        ]
        
        missing_fields = [field for field, value in required_fields if not value]
        
        if missing_fields:
            raise ValueError(f"Missing required configuration: {', '.join(missing_fields)}")


# Global configuration instance - initialize with environment variables
config = AppConfig()


def get_config() -> AppConfig:
    """Get the global configuration instance"""
    return config


def validate_config() -> None:
    """Validate the global configuration"""
    config.validate()
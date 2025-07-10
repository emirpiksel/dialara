"""
Webhook security utilities for verifying request signatures and ensuring authenticity.
"""

import hmac
import hashlib
import logging
from typing import Optional
from fastapi import HTTPException, Request
from config import get_config

logger = logging.getLogger(__name__)
config = get_config()


def verify_vapi_signature(
    request_body: bytes, 
    signature_header: str, 
    secret: Optional[str] = None
) -> bool:
    """
    Verify Vapi webhook signature to ensure request authenticity.
    
    Args:
        request_body: Raw request body bytes
        signature_header: Signature from X-Vapi-Signature header
        secret: Webhook secret (defaults to config value)
    
    Returns:
        bool: True if signature is valid
    """
    if not secret:
        secret = config.vapi_webhook_secret
    
    if not secret:
        logger.warning("No webhook secret configured - signature verification disabled")
        return True  # Allow through if no secret is configured (dev mode)
    
    if not signature_header:
        logger.error("Missing signature header")
        return False
    
    try:
        # Vapi uses HMAC-SHA256 with the format: sha256=<hash>
        if not signature_header.startswith('sha256='):
            logger.error(f"Invalid signature format: {signature_header}")
            return False
        
        expected_signature = signature_header[7:]  # Remove 'sha256=' prefix
        
        # Generate expected signature
        computed_signature = hmac.new(
            secret.encode('utf-8'),
            request_body,
            hashlib.sha256
        ).hexdigest()
        
        # Secure comparison to prevent timing attacks
        is_valid = hmac.compare_digest(expected_signature, computed_signature)
        
        if is_valid:
            logger.info("✅ Webhook signature verified successfully")
        else:
            logger.error("❌ Webhook signature verification failed")
            logger.debug(f"Expected: {computed_signature}")
            logger.debug(f"Received: {expected_signature}")
        
        return is_valid
        
    except Exception as e:
        logger.exception(f"Error verifying webhook signature: {e}")
        return False


def verify_webhook_timestamp(timestamp_header: str, tolerance_seconds: int = 300) -> bool:
    """
    Verify webhook timestamp to prevent replay attacks.
    
    Args:
        timestamp_header: Timestamp from X-Vapi-Timestamp header
        tolerance_seconds: Maximum age of webhook in seconds (default 5 minutes)
    
    Returns:
        bool: True if timestamp is within tolerance
    """
    if not timestamp_header:
        logger.warning("Missing timestamp header")
        return True  # Allow through if no timestamp (for backward compatibility)
    
    try:
        import time
        webhook_time = int(timestamp_header)
        current_time = int(time.time())
        age = current_time - webhook_time
        
        if age > tolerance_seconds:
            logger.error(f"Webhook too old: {age}s > {tolerance_seconds}s")
            return False
        
        if age < -tolerance_seconds:  # Webhook from future
            logger.error(f"Webhook from future: {age}s")
            return False
        
        logger.debug(f"✅ Webhook timestamp valid (age: {age}s)")
        return True
        
    except (ValueError, TypeError) as e:
        logger.error(f"Invalid timestamp format: {timestamp_header} - {e}")
        return False


async def validate_webhook_request(request: Request) -> bytes:
    """
    Validate incoming webhook request for security.
    
    Args:
        request: FastAPI Request object
    
    Returns:
        bytes: Raw request body if validation passes
    
    Raises:
        HTTPException: If validation fails
    """
    try:
        # Get raw request body
        raw_body = await request.body()
        
        # Get headers
        signature = request.headers.get('X-Vapi-Signature') or request.headers.get('x-vapi-signature')
        timestamp = request.headers.get('X-Vapi-Timestamp') or request.headers.get('x-vapi-timestamp')
        
        logger.info(f"🔒 Validating webhook request with signature: {signature is not None}")
        
        # Verify timestamp first (prevent replay attacks)
        if not verify_webhook_timestamp(timestamp):
            logger.error("Webhook timestamp validation failed")
            raise HTTPException(
                status_code=401, 
                detail="Webhook timestamp validation failed"
            )
        
        # Verify signature
        if not verify_vapi_signature(raw_body, signature):
            logger.error("Webhook signature validation failed")
            raise HTTPException(
                status_code=401, 
                detail="Webhook signature validation failed"
            )
        
        logger.info("✅ Webhook request validation successful")
        return raw_body
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error validating webhook request: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Error validating webhook request"
        )


def log_webhook_security_event(event_type: str, details: dict):
    """
    Log security-related webhook events for monitoring.
    
    Args:
        event_type: Type of security event
        details: Event details dictionary
    """
    logger.info(f"🔒 WEBHOOK_SECURITY_EVENT: {event_type}")
    logger.info(f"Details: {details}")
    
    # In production, this could also send to a SIEM or monitoring system
    # security_monitor.log_event(event_type, details)


class WebhookSecurityConfig:
    """Configuration for webhook security settings."""
    
    def __init__(self):
        self.signature_verification_enabled = bool(config.vapi_webhook_secret)
        self.timestamp_tolerance_seconds = 300  # 5 minutes
        self.log_security_events = True
        self.enforce_https = True  # Require HTTPS in production
    
    def is_secure_request(self, request: Request) -> bool:
        """Check if request meets security requirements."""
        if self.enforce_https and not str(request.url).startswith('https://'):
            # Allow HTTP for localhost/development
            if not any(host in str(request.url) for host in ['localhost', '127.0.0.1', 'ngrok']):
                return False
        return True


# Global security config instance
webhook_security_config = WebhookSecurityConfig()
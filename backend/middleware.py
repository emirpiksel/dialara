"""
Middleware configuration for the FastAPI application
"""
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging all HTTP requests and responses"""
    
    async def dispatch(self, request: Request, call_next):
        method = request.method
        url = str(request.url)
        try:
            body = await request.body()
            if body:
                logger.info(f"🔄 {method} {url} → Body: {body.decode('utf-8')[:500]}...")
            else:
                logger.info(f"🔄 {method} {url} → No body")
        except:
            logger.info(f"🔄 {method} {url} → Body read failed")
        response = await call_next(request)
        logger.info(f"✅ {method} {url} → Response: {response.status_code}")
        return response

def setup_middleware(app):
    """Setup all middleware for the FastAPI application"""
    
    # Add logging middleware
    app.add_middleware(LoggingMiddleware)
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
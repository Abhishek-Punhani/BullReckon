"""
Authentication middleware for transcript server
"""

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


async def verify_token_middleware(request: Request, call_next):
    """
    Optional authentication middleware.
    Only enforces auth if REQUIRE_AUTH is enabled in config.
    """
    from config import config
    
    # Skip auth if not required
    if not getattr(config, 'REQUIRE_AUTH', False):
        response = await call_next(request)
        return response
    
    # Skip auth for health check and docs
    if request.url.path in ["/health", "/", "/docs", "/redoc", "/openapi.json"]:
        response = await call_next(request)
        return response
    
    # Get authorization header
    auth_header = request.headers.get("Authorization")
    
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        # Verify token using auth client
        auth_client = request.app.state.auth_client
        
        # Extract token (remove "Bearer " prefix)
        token = auth_header.replace("Bearer ", "")
        
        # Verify token
        user_data = await auth_client.verify_token(token)
        
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        # Add user data to request state
        request.state.user = user_data
        
        response = await call_next(request)
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


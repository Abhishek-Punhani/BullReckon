import os
from typing import Optional

class Config:
    """Configuration for transcript extraction service"""
    
    # Server config
    PORT: int = int(os.getenv('TRANSCRIPT_SERVER_PORT', 5006))
    HOST: str = os.getenv('TRANSCRIPT_SERVER_HOST', '0.0.0.0')
    DEBUG: bool = os.getenv('DEBUG', 'false').lower() == 'true'
    
    # Authentication (optional)
    REQUIRE_AUTH: bool = os.getenv('REQUIRE_AUTH', 'false').lower() == 'true'
    AUTH_SERVICE_URL: str = os.getenv('AUTH_SERVICE_URL', 'http://localhost:4000')
    JWT_SECRET: str = os.getenv('JWT_SECRET', 'default-secret')
    
    # Internal service authentication
    INTERNAL_API_KEY: str = os.getenv('INTERNAL_API_KEY', 'default-internal-key')
    
    # CORS settings
    CORS_ORIGINS: str = os.getenv('CORS_ORIGINS', '*')
    
    # Upload limits
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024  # 16MB max upload
    
    # Logging
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')

config = Config()


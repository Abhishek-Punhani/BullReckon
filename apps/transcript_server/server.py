import sys
import os
import logging
from pathlib import Path
import importlib.util

# Add project root and shared/py to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "shared" / "py"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import AuthServiceClient from the file with dots in name
def load_auth_client():
    """Load AuthServiceClient from authService.client.py"""
    spec = importlib.util.spec_from_file_location(
        "authService_client",
        project_root / "shared" / "py" / "authService.client.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.AuthServiceClient

AuthServiceClient = load_auth_client()

from config import config
from routes.transcript_routes import router as transcript_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Transcript Server",
    version="1.0.0",
    description="Investment parameter extraction from conversation transcripts",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS.split(',') if config.CORS_ORIGINS != '*' else ['*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize auth client
auth_client = AuthServiceClient()

# Store in app state for access in routes
app.state.auth_client = auth_client

# Include routers
app.include_router(transcript_router, prefix="/api/transcript", tags=["transcript"])

# Root health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "transcript_server",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Transcript Extraction Service",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == '__main__':
    import uvicorn
    logger.info(f"Starting Transcript Server on {config.HOST}:{config.PORT}")
    logger.info(f"Debug mode: {config.DEBUG}")
    uvicorn.run(
        "server:app",
        host=config.HOST,
        port=config.PORT,
        reload=config.DEBUG,
        log_level=config.LOG_LEVEL.lower()
    )


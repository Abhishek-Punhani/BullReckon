from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import logging

from controllers.transcript_controller import TranscriptController

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Request model for text extraction
class TranscriptRequest(BaseModel):
    transcript: str

# Initialize controller
controller = TranscriptController()

# Define routes
@router.post("/extract")
async def extract_from_text(request: TranscriptRequest):
    """
    Extract investment parameters from plain text transcript.
    
    Request body:
    {
        "transcript": "conversation text..."
    }
    """
    return await controller.extract_from_text(request.transcript)

@router.post("/extract-file")
async def extract_from_file(file: UploadFile = File(...)):
    """
    Extract investment parameters from uploaded text file.
    
    Expects multipart/form-data with 'file' field
    """
    return await controller.extract_from_file(file)

@router.get("/health")
async def health_check():
    """Health check endpoint for transcript service"""
    return await controller.health_check()

from fastapi import HTTPException, UploadFile
from pydantic import ValidationError
from datetime import datetime
import logging

from models.transcript_extractor import (
    extract_investment_parameters,
    identify_missing_mandatory_fields,
    InvestmentParameters,
    ExtractionResult
)

logger = logging.getLogger(__name__)


class TranscriptController:
    """Controller for transcript extraction endpoints"""
    
    async def extract_from_text(self, transcript: str):
        """
        Extract investment parameters from plain text transcript.
        """
        try:
            if not isinstance(transcript, str) or len(transcript.strip()) == 0:
                raise HTTPException(
                    status_code=400,
                    detail='Transcript must be a non-empty string'
                )
            
            # Extract parameters
            logger.info(f"Extracting parameters from transcript ({len(transcript)} chars)")
            extraction = extract_investment_parameters(transcript)
            
            # Check for missing mandatory fields
            missing = identify_missing_mandatory_fields(extraction)
            
            if missing:
                logger.warning(f"Incomplete extraction - missing {len(missing)} mandatory fields")
                return {
                    'status': 'incomplete',
                    'missing_mandatory_fields': missing,
                    'partial_extraction': extraction,
                    'timestamp': datetime.now().isoformat()
                }
            
            # Validate with Pydantic
            params = InvestmentParameters(**extraction)
            
            # Create result
            result = ExtractionResult(
                extracted_parameters=params,
                missing_fields=[],
                completion_status="complete"
            )
            
            logger.info("Successfully extracted complete investment parameters")
            return result.model_dump()
            
        except ValidationError as e:
            logger.error(f"Validation error: {e}")
            raise HTTPException(
                status_code=422,
                detail={
                    'error': 'Validation failed',
                    'details': e.errors(),
                    'status': 'validation_failed'
                }
            )
            
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail={
                    'error': str(e),
                    'status': 'error'
                }
            )
    
    async def extract_from_file(self, file: UploadFile):
        """
        Extract investment parameters from uploaded text file.
        """
        try:
            if not file.filename:
                raise HTTPException(
                    status_code=400,
                    detail='No file selected'
                )
            
            # Read file content
            try:
                content = await file.read()
                transcript = content.decode('utf-8')
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail='File must be UTF-8 encoded text'
                )
            
            if len(transcript.strip()) == 0:
                raise HTTPException(
                    status_code=400,
                    detail='File is empty'
                )
            
            # Extract parameters using the same logic
            logger.info(f"Extracting parameters from uploaded file: {file.filename}")
            extraction = extract_investment_parameters(transcript)
            
            # Check for missing mandatory fields
            missing = identify_missing_mandatory_fields(extraction)
            
            if missing:
                logger.warning(f"Incomplete extraction - missing {len(missing)} mandatory fields")
                return {
                    'status': 'incomplete',
                    'missing_mandatory_fields': missing,
                    'partial_extraction': extraction,
                    'timestamp': datetime.now().isoformat()
                }
            
            # Validate with Pydantic
            params = InvestmentParameters(**extraction)
            
            # Create result
            result = ExtractionResult(
                extracted_parameters=params,
                missing_fields=[],
                completion_status="complete"
            )
            
            logger.info("Successfully extracted complete investment parameters from file")
            return result.model_dump()
            
        except HTTPException:
            raise
        except ValidationError as e:
            logger.error(f"Validation error: {e}")
            raise HTTPException(
                status_code=422,
                detail={
                    'error': 'Validation failed',
                    'details': e.errors(),
                    'status': 'validation_failed'
                }
            )
            
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail={
                    'error': str(e),
                    'status': 'error'
                }
            )
    
    async def health_check(self):
        """Health check endpoint"""
        return {
            'status': 'healthy',
            'service': 'transcript_server',
            'timestamp': datetime.now().isoformat()
        }

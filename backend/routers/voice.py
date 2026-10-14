"""Voice transcription endpoints using Gemini"""
import logging
import base64
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel

from backend.routers.auth import get_current_user
from backend.config import settings

# Import Gemini with lazy loading to avoid issues if API key is not configured
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = bool(settings.GEMINI_API_KEY)
    if GEMINI_AVAILABLE:
        genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception as e:
    GEMINI_AVAILABLE = False
    logging.warning(f"Gemini AI not available: {e}")

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voice", tags=["voice"], dependencies=[Depends(get_current_user)])


class TranscriptionResponse(BaseModel):
    success: bool
    transcript: Optional[str] = None
    error: Optional[str] = None
    error_code: Optional[str] = None


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(audio: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """
    Transcribe audio to text using Gemini AI.
    
    This endpoint:
    1. Accepts an audio file (WAV, MP3, WebM, etc.)
    2. Sends it to Gemini for transcription
    3. Returns the transcribed text
    4. DOES NOT execute any business action
    
    The transcribed text must be confirmed by the user and passed through
    the normal action validation pipeline before execution.
    
    Security:
    - Requires JWT authentication
    - API key is server-side only
    - Transcription is not authorization to execute
    """
    if not GEMINI_AVAILABLE:
        return TranscriptionResponse(
            success=False,
            error="Voice transcription is not configured. Please set GEMINI_API_KEY in backend/.env",
            error_code="GEMINI_NOT_CONFIGURED"
        )
    
    try:
        # Read audio file
        audio_data = await audio.read()
        
        if len(audio_data) == 0:
            return TranscriptionResponse(
                success=False,
                error="Audio file is empty",
                error_code="EMPTY_AUDIO"
            )
        
        if len(audio_data) > 10 * 1024 * 1024:  # 10MB limit
            return TranscriptionResponse(
                success=False,
                error="Audio file too large (max 10MB)",
                error_code="AUDIO_TOO_LARGE"
            )
        
        # Determine MIME type from filename
        mime_type = "audio/wav"  # Default
        if audio.filename:
            filename_lower = audio.filename.lower()
            if filename_lower.endswith(".mp3"):
                mime_type = "audio/mp3"
            elif filename_lower.endswith(".webm"):
                mime_type = "audio/webm"
            elif filename_lower.endswith(".ogg"):
                mime_type = "audio/ogg"
            elif filename_lower.endswith(".m4a"):
                mime_type = "audio/mp4"
        
        logger.info(f"Transcribing audio: {audio.filename}, size={len(audio_data)} bytes, mime={mime_type}")
        
        # Use Gemini to transcribe
        try:
            model = genai.GenerativeModel(settings.GEMINI_MODEL)
            
            # Create inline data part
            audio_part = {
                "mime_type": mime_type,
                "data": base64.b64encode(audio_data).decode("utf-8")
            }
            
            prompt = "Transcribe this audio clearly and accurately. Return only the transcribed text without any additional commentary or formatting."
            
            response = model.generate_content([prompt, audio_part])
            
            if not response or not response.text:
                logger.error("Gemini returned empty response")
                return TranscriptionResponse(
                    success=False,
                    error="Transcription failed: No text was generated",
                    error_code="EMPTY_TRANSCRIPTION"
                )
            
            transcript = response.text.strip()
            logger.info(f"Transcription successful: {transcript[:100]}")
            
            return TranscriptionResponse(
                success=True,
                transcript=transcript
            )
        
        except Exception as e:
            logger.error(f"Gemini API error: {e}", exc_info=True)
            return TranscriptionResponse(
                success=False,
                error=f"Transcription service error: {str(e)}",
                error_code="GEMINI_API_ERROR"
            )
    
    except Exception as e:
        logger.error(f"Unexpected error in transcription: {e}", exc_info=True)
        return TranscriptionResponse(
            success=False,
            error="An unexpected error occurred during transcription",
            error_code="UNEXPECTED_ERROR"
        )


@router.get("/status")
async def voice_status(user: dict = Depends(get_current_user)):
    """Check if voice transcription is available"""
    return {
        "available": GEMINI_AVAILABLE,
        "model": settings.GEMINI_MODEL if GEMINI_AVAILABLE else None,
        "configured": bool(settings.GEMINI_API_KEY)
    }

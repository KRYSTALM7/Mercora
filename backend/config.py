"""Configuration Management"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os

_ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")

class Settings(BaseSettings):
    # API Settings
    API_TITLE: str = "E-commerce AI Operations Agent"
    API_VERSION: str = "1.0.0"
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/ecommerce_ai"
    
    # CORS
    CORS_ORIGINS: list = ["*"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Features
    ENABLE_CORS: bool = True

    # LLM - Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_TEMPERATURE: float = 0.3
    GROQ_MAX_TOKENS: int = 2000

    # Auth
    SECRET_KEY: str = "insecure-dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: str = "admin"

    # Cascade Integration
    CASCADE_API_URL: str = "https://cascade-api-1097302968574.asia-south1.run.app"
    CASCADE_DEMO_USER: str = "ops-ravi"  # Demo user ID for Cascade simulation
    CASCADE_TIMEOUT_SECONDS: float = 30.0

    # Gemini AI for Voice Transcription
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    class Config:
        env_file = _ENV_FILE
        case_sensitive = True
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()

"""
Application Configuration Settings.
Loads from environment variables with sensible defaults.
"""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "Edge-AI Predictive Maintenance"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./predictive_maintenance.db")
    
    # Device Authentication Key (for student prototype verification)
    DEVICE_AUTH_TOKEN: str = os.getenv("DEVICE_AUTH_TOKEN", "esp32-secret-iot-token-2026")
    
    # Alert Cooldown in seconds to prevent spamming
    ALERT_COOLDOWN_SECONDS: int = int(os.getenv("ALERT_COOLDOWN_SECONDS", "30"))
    
    # Default Thresholds (ISO 10816 Class II Industrial Rotating Machinery)
    DEFAULT_VIB_WARN_THRESHOLD: float = 2.80   # m/s^2 RMS
    DEFAULT_VIB_CRIT_THRESHOLD: float = 4.50   # m/s^2 RMS
    DEFAULT_TEMP_WARN_THRESHOLD: float = 60.0  # °C
    DEFAULT_TEMP_CRIT_THRESHOLD: float = 75.0  # °C
    
    # CORS Origins for local frontend
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]


settings = Settings()

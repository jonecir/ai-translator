# backend/app/config.py
import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # .../backend
# força carregar exatamente backend/.env e sobrescrever valores existentes
load_dotenv(dotenv_path=BASE_DIR / ".env", override=True)


@dataclass
class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me-too")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/ai_translator",
    )
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    ACCESS_TOKEN_EXPIRES_MIN: int = int(os.getenv("ACCESS_TOKEN_EXPIRES_MIN", "120"))


settings = Settings()

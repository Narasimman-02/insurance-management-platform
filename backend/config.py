import os
from dotenv import load_dotenv

load_dotenv()


def _normalize_db_url(url):
    """
    Render's PostgreSQL connection string starts with 'postgres://' or
    'postgresql://', but SQLAlchemy + psycopg3 needs 'postgresql+psycopg://'.
    """
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = _normalize_db_url(
        os.environ.get("DATABASE_URL", "postgresql+psycopg://postgres:password@localhost:5432/insurance_db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret")
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB max upload
    # In production, set this to your deployed Vercel URL (e.g. https://your-app.vercel.app).
    # Defaults to "*" for local development convenience.
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "*")

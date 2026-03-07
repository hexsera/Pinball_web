# fastapi/app/core/security.py
import bcrypt
from fastapi import HTTPException, Depends
from fastapi.security import APIKeyHeader
from app.core.config import settings

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def verify_api_key(api_key: str = Depends(API_KEY_HEADER)) -> str:
    """API Key 검증 의존성"""
    if api_key is None:
        raise HTTPException(status_code=401, detail="API Key is missing")
    if api_key != settings.API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key

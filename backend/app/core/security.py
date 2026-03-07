# fastapi/app/core/security.py
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher
from fastapi import HTTPException, Depends
from fastapi.security import APIKeyHeader
from app.core.config import settings

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

pwd_context = PasswordHash([BcryptHasher()])


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def verify_api_key(api_key: str = Depends(API_KEY_HEADER)) -> str:
    """API Key 검증 의존성"""
    if api_key is None:
        raise HTTPException(status_code=401, detail="API Key is missing")
    if api_key != settings.API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key

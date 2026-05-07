# backend/app/api/v1/auth.py
import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from sqlalchemy.orm import Session
from authlib.integrations.httpx_client import AsyncOAuth2Client

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.redis_client import redis_client
from app.schemas.user import (
    UserRegisterRequest,
    UserResponse,
    LoginRequest,
    LoginResponse,
    GoogleLoginRequest,
)

# 기존 models.py 사용 (아직 이동하지 않음)
import sys
sys.path.insert(0, '/code')
from models import User

router = APIRouter()

REFRESH_TTL = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600


def _create_login_response(user, response: Response) -> LoginResponse:
    access_token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role, "nickname": user.nickname})

    refresh_token = create_refresh_token()
    redis_client.setex(f"refresh:{refresh_token}", REFRESH_TTL, str(user.id))

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_TTL,
        path="/api/v1/auth",
    )
    return LoginResponse(
        message="Login successful",
        user_id=user.id,
        email=user.email,
        nickname=user.nickname,
        role=user.role,
        access_token=access_token,
        token_type="bearer",
    )


@router.post("/login", response_model=LoginResponse)
def login(
    login_request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """로그인 엔드포인트 (API Key 불필요)"""
    user = db.query(User).filter(User.email == login_request.email).first()
    if user is None or user.auth_provider != "local":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(login_request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    return _create_login_response(user, response)


@router.post("/auth/google", response_model=LoginResponse)
async def google_login(data: GoogleLoginRequest, response: Response, db: Session = Depends(get_db)):
    """구글 로그인: Authorization Code → Token 교환 → userinfo 조회 → DB 사용자 확인"""

    # 1단계: Authorization Code → Access Token 교환
    async with AsyncOAuth2Client(
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
    ) as client:
        token = await client.fetch_token(
            "https://oauth2.googleapis.com/token",
            code=data.code,
            redirect_uri=settings.GOOGLE_REDIRECT_URI,
            grant_type="authorization_code",
        )

    # 2단계: Access Token으로 구글 userinfo 조회
    async with AsyncOAuth2Client(token=token) as client:
        resp = await client.get("https://www.googleapis.com/oauth2/v3/userinfo")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to get Google user info"
        )

    google_user = resp.json()

    # 3단계: google_id(sub) 기준으로 사용자 조회 → 없으면 자동 가입
    user = db.query(User).filter(User.google_id == google_user["sub"]).first()

    if not user:
        existing = db.query(User).filter(User.email == google_user["email"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered with a different provider"
            )
        user = User(
            email=google_user["email"],
            nickname=google_user.get("name", google_user["email"].split("@")[0]),
            password=None,
            birth_date=date.today(),
            role="user",
            google_id=google_user["sub"],
            auth_provider="google"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return _create_login_response(user, response)


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user: UserRegisterRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """일반 회원가입 엔드포인트 (API Key 불필요)"""
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    db_user = User(
        email=user.email,
        nickname=user.nickname,
        password=hash_password(user.password),
        birth_date=user.birth_date,
        role="user"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return _create_login_response(db_user, response)


@router.post("/auth/refresh")
def refresh_access_token(
    refresh_token: str = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")

    user_id = redis_client.get(f"refresh:{refresh_token}")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    new_access = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role, "nickname": user.nickname})
    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/auth/logout")
def logout(
    response: Response,
    refresh_token: str = Cookie(default=None),
):
    import logging
    logging.warning(f"[logout] refresh_token received: {refresh_token}")
    if refresh_token:
        redis_client.delete(f"refresh:{refresh_token}")

    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    return {"message": "Logged out"}

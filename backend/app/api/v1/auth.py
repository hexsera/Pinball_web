# backend/app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from authlib.integrations.httpx_client import AsyncOAuth2Client

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import hash_password, verify_password
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


@router.post("/login", response_model=LoginResponse)
def login(
    login_request: LoginRequest,
    db: Session = Depends(get_db)
):
    """로그인 엔드포인트 (API Key 불필요)"""
    user = db.query(User).filter(User.email == login_request.email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(login_request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    return LoginResponse(
        message="Login successful",
        user_id=user.id,
        email=user.email,
        nickname=user.nickname,
        role=user.role
    )


@router.post("/auth/google", response_model=LoginResponse)
async def google_login(data: GoogleLoginRequest, db: Session = Depends(get_db)):
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

    # 3단계: DB에서 이메일로 사용자 조회
    user = db.query(User).filter(User.email == google_user["email"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found for this Google email. Please register first."
        )

    return LoginResponse(
        message="Login successful",
        user_id=user.id,
        email=user.email,
        nickname=user.nickname,
        role=user.role
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user: UserRegisterRequest,
    db: Session = Depends(get_db)
):
    """일반 회원가입 엔드포인트 (API Key 불필요)"""
    # 이메일 중복 검증
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # DB에 사용자 저장
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

    return db_user

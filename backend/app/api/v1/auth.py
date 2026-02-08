# backend/app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.user import (
    UserRegisterRequest,
    UserResponse,
    LoginRequest,
    LoginResponse,
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

    if user.password != login_request.password:
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
        password=user.password,
        birth_date=user.birth_date,
        role="user"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user

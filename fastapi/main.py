from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from database import wait_for_db, engine, Base, get_db, SessionLocal
from models import User
from auth import verify_api_key
from seed import seed_admin

# 애플리케이션 시작 시 DB 연결 확인
if not wait_for_db():
    raise Exception("Database connection failed after retries")

# 모든 테이블 생성 (존재하지 않는 경우에만)
print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Database tables created successfully")


# Data Seeding
print("Starting data seeding...")
db = SessionLocal()
try:
    seed_admin(db)
finally:
    db.close()
print("Data seeding completed")

app = FastAPI(title="Hexsera API", version="1.0.0")


# Pydantic 스키마
class UserCreateRequest(BaseModel):
    """범용 사용자 생성 요청 (role 포함)"""
    email: str
    nickname: str
    password: str
    birth_date: date
    role: str


class UserRegisterRequest(BaseModel):
    """일반 회원가입 요청 (role 제외)"""
    email: str
    nickname: str
    password: str
    birth_date: date


class UserUpdateRequest(BaseModel):
    """사용자 수정 요청 (모든 필드 선택적)"""
    email: Optional[str] = None
    nickname: Optional[str] = None
    password: Optional[str] = None
    birth_date: Optional[date] = None
    role: Optional[str] = None


class UserResponse(BaseModel):
    """사용자 응답 (password 제외)"""
    id: int
    email: str
    nickname: str
    birth_date: date
    role: str

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """로그인 요청"""
    email: str
    password: str


class LoginResponse(BaseModel):
    """로그인 응답"""
    message: str
    user_id: int
    email: str
    nickname: str


class DeleteResponse(BaseModel):
    """삭제 응답"""
    message: str
    deleted_user_id: int


class ScoreCreateRequest(BaseModel):
    """점수 저장 요청"""
    user_id: int
    score: int


class ScoreResponse(BaseModel):
    """점수 응답"""
    message: str
    user_id: int
    score: int


class FriendRequestRequest(BaseModel):
    """친구 추가 요청 스키마"""
    id: int
    requester_id: int


class FriendRequestResponse(BaseModel):
    """친구 추가 응답 스키마"""
    message: str
    id: int
    requester_id: int


@app.get("/api/")
def health_check():
    return {"status": "ok", "message": "FastAPI is running"}


@app.get("/api/test")
def api_test():
    return {"status": "ok", "message": "API test endpoint"}


@app.post("/api/v1/users", response_model=UserResponse)
def create_user(
    user: UserCreateRequest,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """범용 사용자 생성 엔드포인트 (role 지정 가능, API Key 필요)"""
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
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


@app.get("/api/v1/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """전체 사용자 조회 (API Key 필요)"""
    users = db.query(User).all()
    return users


@app.get("/api/v1/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """특정 사용자 조회 (API Key 필요)"""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )
    return user


@app.put("/api/v1/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdateRequest,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """사용자 정보 수정 (API Key 필요)"""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    # 이메일 변경 시 중복 검증
    if user_update.email and user_update.email != user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    # 수정할 필드만 업데이트
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@app.delete("/api/v1/users/{user_id}", response_model=DeleteResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """사용자 삭제 (API Key 필요)"""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found"
        )

    db.delete(user)
    db.commit()

    return DeleteResponse(
        message="User deleted successfully",
        deleted_user_id=user_id
    )


@app.post("/api/v1/login", response_model=LoginResponse)
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
        nickname=user.nickname
    )


@app.post("/api/v1/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
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


@app.post("/api/v1/scores", response_model=ScoreResponse)
def create_score(score_request: ScoreCreateRequest):
    """점수 수신 엔드포인트 (콘솔 출력만)"""

    # 콘솔에 출력
    print(f"Score received - user_id: {score_request.user_id}, score: {score_request.score}")

    # 응답 반환
    return ScoreResponse(
        message="Score received",
        user_id=score_request.user_id,
        score=score_request.score
    )


@app.post("/api/friend-requests", response_model=FriendRequestResponse)
def create_friend_request(request: FriendRequestRequest):
    """친구 추가 요청을 받는 엔드포인트 (콘솔 출력만)"""

    # 콘솔에 출력
    print(f"요청 받음, {request.id} -> {request.requester_id}")

    # 응답 반환
    return FriendRequestResponse(
        message="Friend request received",
        id=request.id,
        requester_id=request.requester_id
    )

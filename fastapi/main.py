from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from database import wait_for_db, engine, Base, get_db, SessionLocal
from models import User, Score, Friendship
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

# 친구 요청 메모리 저장소 (임시)
friend_requests: List[dict] = []


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
    """점수 기록 생성 요청"""
    user_id: int
    score: int


class ScoreResponse(BaseModel):
    """점수 기록 응답"""
    id: int
    user_id: int
    score: int
    created_at: datetime

    class Config:
        from_attributes = True


class ScoreListResponse(BaseModel):
    """점수 기록 목록 응답"""
    scores: List[ScoreResponse]
    total: int


class FriendRequestRequest(BaseModel):
    """친구 추가 요청 스키마"""
    requester_id: int    # 친구 요청을 보내는 사람
    receiver_id: int    # 친구 요청을 받는 사람
    

class FriendRequestResponse(BaseModel):
    """친구 추가 응답 스키마"""
    message: str
    requester_id: int
    receiver_id: int
    


class FriendRequestData(BaseModel):
    """친구 요청 데이터 (조회용)"""
    id: int
    requester_id: int
    status: str


class FriendRequestListResponse(BaseModel):
    """친구 요청 목록 응답"""
    requests: List[FriendRequestData]


class FriendRequestActionRequest(BaseModel):
    """친구 요청 승인/거절 요청"""
    requester_id: int
    receiver_id: int
    


class FriendRequestActionResponse(BaseModel):
    """친구 요청 승인/거절 응답"""
    message: str
    requester_id: int
    receiver_id: int
    status: str


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


@app.post("/api/friend-requests", response_model=FriendRequestResponse)
def create_friend_request(request: FriendRequestRequest, db: Session = Depends(get_db)):
    """친구 추가 요청을 받는 엔드포인트 (DB와 메모리에 저장)"""

    # 1. DB에 Friendship 레코드 생성
    db_friendship = Friendship(
        requester_id=request.requester_id,
        receiver_id=request.receiver_id,
        status="pending"
    )
    db.add(db_friendship)
    db.commit()
    db.refresh(db_friendship)



    print(f"친구 요청 저장됨 (DB+메모리): {request.requester_id} -> {request.receiver_id}")

    return FriendRequestResponse(
        message="Friend request received",
        receiver_id=db_friendship.receiver_id,
        requester_id=db_friendship.requester_id
    )


@app.get("/api/friend-requests", response_model=FriendRequestListResponse)
def get_friend_requests(user_id: int):
    """특정 사용자가 받은 친구 요청 조회"""
    # requester_id가 user_id와 일치하는 요청 필터링
    user_requests = [
        req for req in friend_requests
        if req["requester_id"] == user_id
    ]

    return FriendRequestListResponse(requests=user_requests)


@app.post("/api/friend-requests/accept", response_model=FriendRequestActionResponse)
def accept_friend_request(action: FriendRequestActionRequest, db: Session = Depends(get_db)):
    """친구 요청 승인 (DB 연동)"""
    # DB에서 Friendship 레코드 조회
    friendship = db.query(Friendship).filter(
        Friendship.receiver_id == action.receiver_id,
        Friendship.requester_id == action.requester_id
    ).first()

    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )

    # status 업데이트
    friendship.status = "accepted"
    db.commit()
    db.refresh(friendship)

    # 메모리 배열도 업데이트 (하위 호환성)


    print(f"친구 요청 승인됨 (DB): {action.receiver_id} -> {action.requester_id}")
    return FriendRequestActionResponse(
        message="Friend request accepted",
        receiver_id=friendship.receiver_id,
        requester_id=friendship.requester_id,
        status=friendship.status
    )


@app.post("/api/friend-requests/reject", response_model=FriendRequestActionResponse)
def reject_friend_request(action: FriendRequestActionRequest, db: Session = Depends(get_db)):
    """친구 요청 거절 (DB 연동)"""
    # DB에서 Friendship 레코드 조회
    friendship = db.query(Friendship).filter(
        Friendship.receiver_id == action.receiver_id,
        Friendship.requester_id == action.requester_id
    ).first()

    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )

    # status 업데이트
    friendship.status = "rejected"
    db.commit()
    db.refresh(friendship)

    # 메모리 배열도 업데이트 (하위 호환성)


    print(f"친구 요청 거절됨 (DB): {action.receiver_id} -> {action.requester_id}")
    return FriendRequestActionResponse(
        message="Friend request rejected",
        receiver_id=friendship.receiver_id,
        requester_id=friendship.requester_id,
        status=friendship.status
    )


# ==================== Score API ====================

@app.post("/api/v1/scores", response_model=ScoreResponse, status_code=201)
def create_score(score_data: ScoreCreateRequest, db: Session = Depends(get_db)):
    """점수 기록 생성 (user_id를 id로 사용)"""
    # user_id를 id로 설정하여 점수 기록 생성
    db_score = Score(
        
        user_id=score_data.user_id,
        score=score_data.score
    )
    db.add(db_score)
    db.commit()
    db.refresh(db_score)
    return db_score

from fastapi import FastAPI, Depends, HTTPException, status, Request
from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from database import wait_for_db, engine, Base, get_db, SessionLocal
from models import User, Score, Friendship, MonthlyScore, GameVisit
from auth import verify_api_key
from seed import seed_admin


def startup():
    """애플리케이션 시작 시 DB 초기화 및 시딩"""
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


import os
if os.getenv("TESTING") != "1":
    startup()

app = FastAPI(title="Hexsera API", version="1.0.0")


# Helper Functions
def get_client_ip(request: Request) -> str:
    """클라이언트 IP 주소 추출 (프록시 고려)"""
    # X-Forwarded-For 헤더 확인 (프록시/로드밸런서 뒤에 있는 경우)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # 첫 번째 IP가 실제 클라이언트 IP
        return forwarded_for.split(",")[0].strip()

    # X-Real-IP 헤더 확인 (Nginx 등에서 사용)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # 직접 연결된 클라이언트 IP
    return request.client.host


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
    role: str


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


class MonthlyScoreCreateRequest(BaseModel):
    """월간 점수 생성/수정 요청 (Upsert)"""
    user_id: int
    score: int


class MonthlyScoreUpdateRequest(BaseModel):
    """월간 점수 수정 요청"""
    score: int


class MonthlyScoreResponse(BaseModel):
    """월간 점수 응답"""
    nickname: str
    score: int
    created_at: datetime

    class Config:
        from_attributes = True


class MonthlyScoreListResponse(BaseModel):
    """월간 점수 목록 응답"""
    scores: List[MonthlyScoreResponse]
    total: int


class MonthlyScoreDeleteResponse(BaseModel):
    """월간 점수 삭제 응답"""
    message: str
    deleted_user_id: int


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
    receiver_id: int
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


class GameVisitUpdateRequest(BaseModel):
    """게임 접속 기록 수정 요청"""
    user_id: Optional[int] = None
    ip_address: str


class GameVisitUpdateResponse(BaseModel):
    """게임 접속 기록 수정 응답"""
    message: str
    user_id: Optional[int]
    ip_address: str
    is_visits: bool
    updated_at: datetime


class GameVisitCreateRequest(BaseModel):
    """게임 접속 기록 생성 요청"""
    user_id: Optional[int] = None


class GameVisitCreateResponse(BaseModel):
    """게임 접속 기록 생성 응답"""
    message: str
    user_id: Optional[int]
    ip_address: str
    created_at: datetime
    is_new_record: bool


class DailyVisitStats(BaseModel):
    """일별 접속자 수 통계"""
    date: str  # YYYY-MM-DD 형식
    user_count: int


class DailyVisitStatsResponse(BaseModel):
    """일별 접속자 수 통계 응답"""
    stats: List[DailyVisitStats]
    total_days: int
    start_date: str
    end_date: str


class GameVisitDeleteRequest(BaseModel):
    """게임 접속 기록 삭제 요청 (날짜 범위)"""
    start_date: date
    end_date: date


class GameVisitDeleteResponse(BaseModel):
    """게임 접속 기록 삭제 응답"""
    message: str
    start_date: str
    end_date: str


@app.get("/api/")
def health_check():
    return {"status": "ok", "message": "FastAPI is running"}


@app.get("/api/test")
def api_test():
    return {"status": "ok", "message": "API test endpoint"}


@app.post("/api/v1/users", response_model=UserResponse)
def create_user(
    user: UserCreateRequest,
    db: Session = Depends(get_db)
):
    """범용 사용자 생성 엔드포인트 (role 지정 가능)"""
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
    db: Session = Depends(get_db)
):
    """전체 사용자 조회"""
    users = db.query(User).all()
    return users


@app.get("/api/v1/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """특정 사용자 조회"""
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
    db: Session = Depends(get_db)
):
    """사용자 정보 수정"""
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
    db: Session = Depends(get_db)
):
    """사용자 삭제"""
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
        nickname=user.nickname,
        role=user.role
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
    """친구 추가 요청 (중복 및 역방향 검증)"""

    # 자기 자신에게 친구 요청 방지
    if request.requester_id == request.receiver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send friend request to yourself"
        )

    # 중복 검증: A→B 요청이 이미 존재하는지 확인
    existing_request = db.query(Friendship).filter(
        Friendship.requester_id == request.requester_id,
        Friendship.receiver_id == request.receiver_id
    ).first()

    if existing_request:
        if existing_request.status == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Friend request already sent"
            )
        elif existing_request.status == "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already friends"
            )
        elif existing_request.status == "rejected":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Friend request was rejected"
            )

    # 역방향 검증: B→A 요청이 이미 존재하는지 확인
    reverse_request = db.query(Friendship).filter(
        Friendship.requester_id == request.receiver_id,
        Friendship.receiver_id == request.requester_id
    ).first()

    if reverse_request:
        if reverse_request.status == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This user already sent you a friend request. Please accept or reject it first."
            )
        elif reverse_request.status == "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already friends"
            )
        elif reverse_request.status == "rejected":
            # rejected 상태여도 역방향 요청은 허용하지 않음
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot send friend request. Previous request was rejected."
            )

    # 모든 검증 통과 시 친구 요청 생성
    db_friendship = Friendship(
        requester_id=request.requester_id,
        receiver_id=request.receiver_id,
        status="pending"
    )
    db.add(db_friendship)
    db.commit()
    db.refresh(db_friendship)

    print(f"친구 요청 생성됨: {request.requester_id} -> {request.receiver_id}")

    return FriendRequestResponse(
        message="Friend request sent successfully",
        receiver_id=db_friendship.receiver_id,
        requester_id=db_friendship.requester_id
    )


VALID_FRIEND_STATUSES = {"pending", "accepted", "rejected", "all"}

@app.get("/api/friend-requests", response_model=FriendRequestListResponse)
def get_friend_requests(user_id: int, friend_status: str = "pending", db: Session = Depends(get_db)):
    """특정 사용자의 친구 요청 조회 (양방향, status 필터)"""
    # status 유효성 검증
    if friend_status not in VALID_FRIEND_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Allowed values: {sorted(VALID_FRIEND_STATUSES)}"
        )

    # 양방향 조건: user_id가 requester_id 또는 receiver_id인 경우
    direction_filter = or_(
        Friendship.requester_id == user_id,
        Friendship.receiver_id == user_id
    )

    # status 필터 구성: "all"이면 status 필터 미적용
    if friend_status == "all":
        query = db.query(Friendship).filter(direction_filter)
    else:
        query = db.query(Friendship).filter(
            direction_filter,
            Friendship.status == friend_status
        )

    requests = query.all()

    # FriendRequestData 형식으로 변환
    request_data = [
        FriendRequestData(
            id=req.id,
            requester_id=req.requester_id,
            receiver_id=req.receiver_id,
            status=req.status
        )
        for req in requests
    ]

    return FriendRequestListResponse(requests=request_data)


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



# ==================== Monthly Score API ====================

@app.post("/api/v1/monthly-scores", response_model=MonthlyScoreResponse)
def create_or_update_monthly_score(
    score_data: MonthlyScoreCreateRequest,
    db: Session = Depends(get_db)
):
    """월간 점수 생성 또는 수정 (최고 점수만 저장)"""
    # User 테이블에서 nickname 조회
    user = db.query(User).filter(User.id == score_data.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=404,
            detail=f"User with id {score_data.user_id} not found"
        )

    existing_score = db.query(MonthlyScore).filter(
        MonthlyScore.user_id == score_data.user_id
    ).first()

    if existing_score:
        if score_data.score > existing_score.score:
            existing_score.score = score_data.score
            existing_score.nickname = user.nickname  # nickname 갱신
            db.commit()
            db.refresh(existing_score)
        return existing_score
    else:
        new_score = MonthlyScore(
            user_id=score_data.user_id,
            nickname=user.nickname,  # nickname 저장
            score=score_data.score
        )
        db.add(new_score)
        db.commit()
        db.refresh(new_score)
        return new_score


@app.get("/api/v1/monthly-scores", response_model=MonthlyScoreListResponse)
def get_monthly_scores(
    db: Session = Depends(get_db)
):
    """전체 월간 점수 조회 (score 내림차순)"""
    scores = db.query(MonthlyScore).order_by(
        MonthlyScore.score.desc()
    ).all()

    return MonthlyScoreListResponse(
        scores=scores,
        total=len(scores)
    )


@app.get("/api/v1/monthly-scores/{user_id}", response_model=MonthlyScoreResponse)
def get_monthly_score(
    user_id: int,
    db: Session = Depends(get_db)
):
    """특정 사용자 월간 점수 조회"""
    score = db.query(MonthlyScore).filter(
        MonthlyScore.user_id == user_id
    ).first()

    if score is None:
        raise HTTPException(
            status_code=404,
            detail=f"Monthly score for user {user_id} not found"
        )

    return score


@app.put("/api/v1/monthly-scores/{user_id}", response_model=MonthlyScoreResponse)
def update_monthly_score(
    user_id: int,
    score_data: MonthlyScoreUpdateRequest,
    db: Session = Depends(get_db)
):
    """특정 사용자 월간 점수 수정"""
    score = db.query(MonthlyScore).filter(
        MonthlyScore.user_id == user_id
    ).first()

    if score is None:
        raise HTTPException(
            status_code=404,
            detail=f"Monthly score for user {user_id} not found"
        )

    score.score = score_data.score
    db.commit()
    db.refresh(score)
    return score


@app.delete("/api/v1/monthly-scores/{user_id}", response_model=MonthlyScoreDeleteResponse)
def delete_monthly_score(
    user_id: int,
    db: Session = Depends(get_db)
):
    """특정 사용자 월간 점수 삭제"""
    score = db.query(MonthlyScore).filter(
        MonthlyScore.user_id == user_id
    ).first()

    if score is None:
        raise HTTPException(
            status_code=404,
            detail=f"Monthly score for user {user_id} not found"
        )

    db.delete(score)
    db.commit()

    return MonthlyScoreDeleteResponse(
        message="Monthly score deleted successfully",
        deleted_user_id=user_id
    )


# ==================== Game Visit API ====================

@app.post("/api/v1/game_visits", response_model=GameVisitCreateResponse, status_code=201)
def create_game_visit(
    visit_data: GameVisitCreateRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """게임 접속 기록 생성 (오늘 날짜 + IP 기준 중복 방지)"""
    from sqlalchemy import func

    # 클라이언트 IP 추출
    client_ip = get_client_ip(request)

    # 오늘 날짜와 IP로 레코드 조회
    today = func.date(func.now())
    existing_visit = db.query(GameVisit).filter(
        and_(
            func.date(GameVisit.created_at) == today,
            GameVisit.ip_address == client_ip
        )
    ).first()

    if existing_visit:
        # 레코드가 존재하면 user_id가 null인 경우에만 업데이트
        if existing_visit.user_id is None and visit_data.user_id is not None:
            existing_visit.user_id = visit_data.user_id
            db.commit()
            db.refresh(existing_visit)

        return GameVisitCreateResponse(
            message="Game visit record updated",
            user_id=existing_visit.user_id,
            ip_address=existing_visit.ip_address,
            created_at=existing_visit.created_at,
            is_new_record=False
        )
    else:
        # 레코드가 없으면 새로 생성
        new_visit = GameVisit(
            user_id=visit_data.user_id,
            ip_address=client_ip,
            is_visits=True
        )
        db.add(new_visit)
        db.commit()
        db.refresh(new_visit)

        return GameVisitCreateResponse(
            message="Game visit record created",
            user_id=new_visit.user_id,
            ip_address=new_visit.ip_address,
            created_at=new_visit.created_at,
            is_new_record=True
        )


@app.put("/api/v1/game_visits", response_model=GameVisitUpdateResponse)
def update_game_visit(
    visit_data: GameVisitUpdateRequest,
    db: Session = Depends(get_db)
):
    """IP 주소 기반 게임 접속 기록 업데이트 (is_visits = True)"""
    # IP 주소로 레코드 조회
    game_visit = db.query(GameVisit).filter(
        GameVisit.ip_address == visit_data.ip_address
    ).first()

    if game_visit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game visit record for IP {visit_data.ip_address} not found"
        )

    # user_id와 is_visits 필드 업데이트
    if visit_data.user_id is not None:
        game_visit.user_id = visit_data.user_id
    game_visit.is_visits = True
    db.commit()
    db.refresh(game_visit)

    return GameVisitUpdateResponse(
        message="Game visit updated successfully",
        user_id=game_visit.user_id,
        ip_address=game_visit.ip_address,
        is_visits=game_visit.is_visits,
        updated_at=game_visit.updated_at
    )


@app.get("/api/v1/game_visits/", response_model=DailyVisitStatsResponse)
def get_daily_visit_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """게임 일일 접속자 수 조회 (날짜 범위 필터)"""
    from datetime import timedelta
    from sqlalchemy import func

    # 기본값 설정: 최근 7일
    if not end_date:
        end_date_obj = date.today()
    else:
        end_date_obj = date.fromisoformat(end_date)

    if not start_date:
        start_date_obj = end_date_obj - timedelta(days=6)
    else:
        start_date_obj = date.fromisoformat(start_date)


    # 날짜별 접속자 수 집계 (POST에서 이미 일별 IP 중복 방지)
    stats = db.query(
        func.date(GameVisit.created_at).label('visit_date'),
        func.count(GameVisit.id).label('user_count')
    ).filter(
        func.date(GameVisit.created_at) >= start_date_obj,
        func.date(GameVisit.created_at) <= end_date_obj
    ).group_by(
        func.date(GameVisit.created_at)
    ).order_by(
        func.date(GameVisit.created_at)
    ).all()

    # 응답 형식으로 변환
    result = [
        DailyVisitStats(
            date=str(stat.visit_date),
            user_count=stat.user_count
        )
        for stat in stats
    ]

    return DailyVisitStatsResponse(
        stats=result,
        total_days=len(result),
        start_date=str(start_date_obj),
        end_date=str(end_date_obj)
    )


@app.delete("/api/v1/game_visits/", response_model=GameVisitDeleteResponse)
def delete_game_visits(
    delete_data: GameVisitDeleteRequest,
    db: Session = Depends(get_db)
):
    """게임 접속 기록 삭제 (날짜 범위 기반)"""
    from sqlalchemy import func

    # 날짜 유효성 검증
    if delete_data.start_date > delete_data.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be less than or equal to end_date"
        )

    # 날짜 범위에 해당하는 레코드 삭제
    db.query(GameVisit).filter(
        func.date(GameVisit.created_at) >= delete_data.start_date,
        func.date(GameVisit.created_at) <= delete_data.end_date
    ).delete(synchronize_session=False)

    db.commit()

    return GameVisitDeleteResponse(
        message="Game visit records deleted successfully",
        start_date=str(delete_data.start_date),
        end_date=str(delete_data.end_date)
    )

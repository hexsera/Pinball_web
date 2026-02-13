# backend/app/api/v1/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from typing import Optional
from fastapi import Query

from app.api.deps import get_db
from app.schemas.user import (
    UserCreateRequest,
    UserUpdateRequest,
    UserResponse,
    DeleteResponse,
)

# 기존 models.py 사용
import sys
sys.path.insert(0, '/code')
from models import User, MonthlyScore, Friendship, HighScore, GameVisit

router = APIRouter()


@router.post("", response_model=UserResponse)
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


@router.get("", response_model=List[UserResponse])
def get_all_users(
    nickname: Optional[str] = Query(None, description="검색할 닉네임"),
    db: Session = Depends(get_db)
):
    
    query = db.query(User)

    if nickname:
        query = query.filter(User.nickname.contains(nickname))

    """전체 사용자 조회"""
    users = query.all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
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


@router.put("/{user_id}", response_model=UserResponse)
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
            if field == "nickname":
                month = db.query(MonthlyScore).filter(MonthlyScore.user_id == user_id).all()
                for i in month:
                    i.nickname = value

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=DeleteResponse)
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

    # FK 참조 테이블 데이터 먼저 삭제
    # GameVisit의 user_id를 NULL로 설정 (방문 기록 보존, FK 위반 방지)
    db.query(GameVisit).filter(GameVisit.user_id == user_id)\
        .update({"user_id": None}, synchronize_session=False)

    db.query(Friendship).filter(
        (Friendship.requester_id == user_id) | (Friendship.receiver_id == user_id)
    ).delete(synchronize_session=False)

    db.query(MonthlyScore).filter(MonthlyScore.user_id == user_id)\
        .delete(synchronize_session=False)

    db.query(HighScore).filter(HighScore.user_id == user_id)\
        .delete(synchronize_session=False)

    db.delete(user)
    db.commit()

    return DeleteResponse(
        message="User deleted successfully",
        deleted_user_id=user_id
    )

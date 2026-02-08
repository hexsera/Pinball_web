# backend/app/api/v1/friends.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.deps import get_db
from app.schemas.friendship import (
    FriendRequestRequest,
    FriendRequestResponse,
    FriendRequestData,
    FriendRequestListResponse,
    FriendRequestActionRequest,
    FriendRequestActionResponse,
)

# 기존 models.py 사용
import sys
sys.path.insert(0, '/code')
from models import User, Friendship

router = APIRouter()

VALID_FRIEND_STATUSES = {"pending", "accepted", "rejected", "all"}


@router.post("/", response_model=FriendRequestResponse)
def create_friend_request(request: FriendRequestRequest, db: Session = Depends(get_db)):
    """친구 추가 요청 (중복 및 역방향 검증)"""
    # 자기 자신에게 친구 요청 방지
    if request.requester_id == request.receiver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send friend request to yourself"
        )

    # FK 제약조건 검증: 두 사용자가 모두 존재하는지 확인 (1회 쿼리)
    users = db.query(User).filter(User.id.in_([request.requester_id, request.receiver_id])).all()
    user_ids = {user.id for user in users}

    if request.requester_id not in user_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requester user not found"
        )
    if request.receiver_id not in user_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receiver user not found"
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


@router.get("/", response_model=FriendRequestListResponse)
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


@router.post("/accept", response_model=FriendRequestActionResponse)
def accept_friend_request(action: FriendRequestActionRequest, db: Session = Depends(get_db)):
    """친구 요청 승인 (DB 연동)"""
    friendship = db.query(Friendship).filter(
        Friendship.receiver_id == action.receiver_id,
        Friendship.requester_id == action.requester_id
    ).first()

    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )

    friendship.status = "accepted"
    db.commit()
    db.refresh(friendship)

    print(f"친구 요청 승인됨 (DB): {action.receiver_id} -> {action.requester_id}")
    return FriendRequestActionResponse(
        message="Friend request accepted",
        receiver_id=friendship.receiver_id,
        requester_id=friendship.requester_id,
        status=friendship.status
    )


@router.post("/reject", response_model=FriendRequestActionResponse)
def reject_friend_request(action: FriendRequestActionRequest, db: Session = Depends(get_db)):
    """친구 요청 거절 (DB 연동)"""
    friendship = db.query(Friendship).filter(
        Friendship.receiver_id == action.receiver_id,
        Friendship.requester_id == action.requester_id
    ).first()

    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )

    friendship.status = "rejected"
    db.commit()
    db.refresh(friendship)

    print(f"친구 요청 거절됨 (DB): {action.receiver_id} -> {action.requester_id}")
    return FriendRequestActionResponse(
        message="Friend request rejected",
        receiver_id=friendship.receiver_id,
        requester_id=friendship.requester_id,
        status=friendship.status
    )

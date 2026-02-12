# backend/app/schemas/friendship.py
from pydantic import BaseModel
from typing import List


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
    requester_nickname: str
    receiver_id: int
    receiver_nickname: str
    status: str
    
    class Config:
        from_attributes = True


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

# backend/app/schemas/monthly_score.py
from pydantic import BaseModel
from datetime import datetime
from typing import List


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

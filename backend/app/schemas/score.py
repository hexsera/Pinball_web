# backend/app/schemas/score.py
from pydantic import BaseModel
from datetime import datetime
from typing import List


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

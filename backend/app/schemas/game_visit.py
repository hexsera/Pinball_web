# backend/app/schemas/game_visit.py
from pydantic import BaseModel
from datetime import date, datetime
from typing import List, Optional


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

# backend/app/schemas/high_score.py
from pydantic import BaseModel
from datetime import datetime


class HighScoreCreate(BaseModel):
    user_id: int
    score: int


class HighScoreResponse(BaseModel):
    id: int
    user_id: int
    score: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

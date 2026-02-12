# backend/app/api/v1/scores.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.score import ScoreCreateRequest, ScoreResponse

# 기존 models.py 사용
import sys
sys.path.insert(0, '/code')
from models import Score

router = APIRouter()


@router.post("", response_model=ScoreResponse, status_code=201)
def create_score(score_data: ScoreCreateRequest, db: Session = Depends(get_db)):
    """점수 기록 생성 (user_id를 id로 사용)"""
    db_score = Score(
        user_id=score_data.user_id,
        score=score_data.score
    )
    db.add(db_score)
    db.commit()
    db.refresh(db_score)
    return db_score

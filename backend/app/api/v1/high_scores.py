# backend/app/api/v1/high_scores.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.high_score import HighScoreCreate, HighScoreResponse

# 기존 models.py 사용
import sys
sys.path.insert(0, '/code')
from models import HighScore

router = APIRouter()


@router.post("/", response_model=HighScoreResponse, status_code=status.HTTP_201_CREATED)
def create_or_update_high_score(payload: HighScoreCreate, db: Session = Depends(get_db)):
    """개인 최고 기록 생성/업데이트"""
    # 기존 기록이 있는지 확인
    existing_score = db.query(HighScore).filter(HighScore.user_id == payload.user_id).first()

    if not existing_score:
        # 기록이 없으면 새로 생성 (최초 최고 기록)
        new_high_score = HighScore(user_id=payload.user_id, score=payload.score)
        db.add(new_high_score)
        db.commit()
        db.refresh(new_high_score)
        return new_high_score

    # 기존 기록이 있다면 점수 비교
    if payload.score > existing_score.score:
        # 새 점수가 더 높을 때만 업데이트
        existing_score.score = payload.score
        db.commit()
        db.refresh(existing_score)

    # 새 점수가 낮더라도 201 상태코드와 함께 기존(혹은 업데이트된) 데이터를 반환
    return existing_score


@router.get("/", response_model=HighScoreResponse)
def get_high_score(user_id: int, db: Session = Depends(get_db)):
    """사용자의 개인 최고 기록 조회"""
    # user_id 음수 검증
    if user_id < 0:
        raise HTTPException(status_code=422, detail="user_id must be positive")

    # DB에서 조회
    high_score = db.query(HighScore).filter(HighScore.user_id == user_id).first()

    if not high_score:
        raise HTTPException(status_code=404, detail="High score not found")

    return high_score

# backend/app/api/v1/monthly_scores.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from datetime import datetime
from calendar import monthrange

from app.redis_client import redis_client

from app.api.deps import get_db
from app.schemas.monthly_score import (
    MonthlyScoreCreateRequest,
    MonthlyScoreUpdateRequest,
    MonthlyScoreResponse,
    MonthlyScoreListResponse,
    MonthlyScoreDeleteResponse,
)

# 기존 models.py 사용
import sys
sys.path.insert(0, '/code')
from models import User, MonthlyScore

router = APIRouter()


def get_cache_key() -> str:
    now = datetime.now()
    return f"monthly_scores:{now.year}-{now.month:02d}"


def get_current_month_range():
    """이번 달 시작(1일 00:00:00)과 끝(말일 23:59:59)을 반환"""
    now = datetime.now()
    year, month = now.year, now.month
    _, last_day = monthrange(year, month)
    start = datetime(year, month, 1, 0, 0, 0)
    end = datetime(year, month, last_day, 23, 59, 59)
    return start, end


def warm_up_sorted_set(db: Session):
    """DB에서 이번 달 점수를 읽어 Redis Sorted Set을 재구성"""
    start, end = get_current_month_range()
    scores = db.query(MonthlyScore).filter(
        MonthlyScore.created_at >= start,
        MonthlyScore.created_at <= end
    ).all()
    if scores:
        mapping = {f"{s.user_id}:{s.nickname}": float(s.score) for s in scores}
        redis_client.zadd(get_cache_key(), mapping)


@router.post("", response_model=MonthlyScoreResponse)
def create_or_update_monthly_score(
    score_data: MonthlyScoreCreateRequest,
    db: Session = Depends(get_db)
):
    """월간 점수 생성 또는 수정 (최고 점수만 저장)"""
    user = db.query(User).filter(User.id == score_data.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=404,
            detail=f"User with id {score_data.user_id} not found"
        )
    

    start, end = get_current_month_range()

    existing_score = db.query(MonthlyScore).filter(
        MonthlyScore.user_id == score_data.user_id,
        MonthlyScore.created_at >= start,
        MonthlyScore.created_at <= end
    ).first()

    if existing_score:
        if score_data.score > existing_score.score:
            existing_score.score = score_data.score
            existing_score.nickname = user.nickname  # nickname 갱신
            db.commit()
            db.refresh(existing_score)
            try:
                key = get_cache_key()
                member = f"{score_data.user_id}:{user.nickname}"
                current = redis_client.zscore(key, member)
                if current is None or score_data.score > current:
                    redis_client.zadd(key, {member: float(score_data.score)})
            except Exception:
                pass
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
        try:
            key = get_cache_key()
            member = f"{score_data.user_id}:{user.nickname}"
            redis_client.zadd(key, {member: float(score_data.score)})
        except Exception:
            pass
        return new_score


@router.get("", response_model=MonthlyScoreListResponse)
def get_monthly_scores(
    db: Session = Depends(get_db)
):
    """전체 월간 점수 조회 (score 내림차순) - Redis Sorted Set 주 경로"""
    try:
        key = get_cache_key()
        raw = redis_client.zrevrangebyscore(key, "+inf", "-inf", withscores=True)
        if not raw:
            warm_up_sorted_set(db)
            raw = redis_client.zrevrangebyscore(key, "+inf", "-inf", withscores=True)
        month_start = get_current_month_range()[0]
        scores = [
            MonthlyScoreResponse(
                nickname=m.split(":", 1)[1],
                score=int(s),
                created_at=month_start
            )
            for m, s in raw
        ]
        return MonthlyScoreListResponse(scores=scores, total=len(scores))
    except Exception:
        pass  # Redis 장애 시 DB 직접 조회로 폴백

    start, end = get_current_month_range()
    scores = db.query(MonthlyScore).filter(
        MonthlyScore.created_at >= start,
        MonthlyScore.created_at <= end
    ).order_by(MonthlyScore.score.desc()).all()
    return MonthlyScoreListResponse(scores=scores, total=len(scores))


@router.get("/{user_id}", response_model=MonthlyScoreResponse)
def get_monthly_score(
    user_id: int,
    db: Session = Depends(get_db)
):
    """특정 사용자 월간 점수 조회"""
    start, end = get_current_month_range()

    score = db.query(MonthlyScore).filter(
        MonthlyScore.user_id == user_id,
        MonthlyScore.created_at >= start,
        MonthlyScore.created_at <= end
    ).first()

    if score is None:
        raise HTTPException(
            status_code=404,
            detail=f"Monthly score for user {user_id} not found"
        )

    return score


@router.put("/{user_id}", response_model=MonthlyScoreResponse)
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
    try:
        redis_client.zadd(get_cache_key(), {f"{user_id}:{score.nickname}": float(score_data.score)})
    except Exception:
        pass
    return score


@router.delete("/{user_id}", response_model=MonthlyScoreDeleteResponse)
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

    member = f"{user_id}:{score.nickname}"
    db.delete(score)
    db.commit()
    try:
        redis_client.zrem(get_cache_key(), member)
    except Exception:
        pass

    return MonthlyScoreDeleteResponse(
        message="Monthly score deleted successfully",
        deleted_user_id=user_id
    )

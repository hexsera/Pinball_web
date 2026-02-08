# backend/app/api/v1/game_visits.py
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date
from typing import Optional

from app.api.deps import get_db
from app.schemas.game_visit import (
    GameVisitCreateRequest,
    GameVisitCreateResponse,
    GameVisitUpdateRequest,
    GameVisitUpdateResponse,
    DailyVisitStats,
    DailyVisitStatsResponse,
    GameVisitDeleteRequest,
    GameVisitDeleteResponse,
)

# 기존 models.py 사용
import sys
sys.path.insert(0, '/code')
from models import GameVisit


# Helper function (main.py에서 가져옴)
def get_client_ip(request: Request) -> str:
    """클라이언트 IP 주소 추출 (프록시 고려)"""
    # X-Forwarded-For 헤더 확인 (프록시/로드밸런서 뒤에 있는 경우)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # 첫 번째 IP가 실제 클라이언트 IP
        return forwarded_for.split(",")[0].strip()

    # X-Real-IP 헤더 확인 (Nginx 등에서 사용)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # 직접 연결된 클라이언트 IP
    return request.client.host


router = APIRouter()


@router.post("/", response_model=GameVisitCreateResponse, status_code=201)
def create_game_visit(
    visit_data: GameVisitCreateRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """게임 접속 기록 생성 (오늘 날짜 + IP 기준 중복 방지)"""
    # 클라이언트 IP 추출
    client_ip = get_client_ip(request)

    # 오늘 날짜와 IP로 레코드 조회
    today = func.date(func.now())
    existing_visit = db.query(GameVisit).filter(
        and_(
            func.date(GameVisit.created_at) == today,
            GameVisit.ip_address == client_ip
        )
    ).first()

    if existing_visit:
        # 레코드가 존재하면 user_id가 null인 경우에만 업데이트
        if existing_visit.user_id is None and visit_data.user_id is not None:
            existing_visit.user_id = visit_data.user_id
            db.commit()
            db.refresh(existing_visit)

        return GameVisitCreateResponse(
            message="Game visit record updated",
            user_id=existing_visit.user_id,
            ip_address=existing_visit.ip_address,
            created_at=existing_visit.created_at,
            is_new_record=False
        )
    else:
        # 레코드가 없으면 새로 생성
        new_visit = GameVisit(
            user_id=visit_data.user_id,
            ip_address=client_ip,
            is_visits=True
        )
        db.add(new_visit)
        db.commit()
        db.refresh(new_visit)

        return GameVisitCreateResponse(
            message="Game visit record created",
            user_id=new_visit.user_id,
            ip_address=new_visit.ip_address,
            created_at=new_visit.created_at,
            is_new_record=True
        )


@router.put("/", response_model=GameVisitUpdateResponse)
def update_game_visit(
    visit_data: GameVisitUpdateRequest,
    db: Session = Depends(get_db)
):
    """IP 주소 기반 게임 접속 기록 업데이트 (is_visits = True)"""
    # IP 주소로 레코드 조회
    game_visit = db.query(GameVisit).filter(
        GameVisit.ip_address == visit_data.ip_address
    ).first()

    if game_visit is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game visit record for IP {visit_data.ip_address} not found"
        )

    # user_id와 is_visits 필드 업데이트
    if visit_data.user_id is not None:
        game_visit.user_id = visit_data.user_id
    game_visit.is_visits = True
    db.commit()
    db.refresh(game_visit)

    return GameVisitUpdateResponse(
        message="Game visit updated successfully",
        user_id=game_visit.user_id,
        ip_address=game_visit.ip_address,
        is_visits=game_visit.is_visits,
        updated_at=game_visit.updated_at
    )


@router.get("/", response_model=DailyVisitStatsResponse)
def get_daily_visit_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """게임 일일 접속자 수 조회 (날짜 범위 필터)"""
    from datetime import timedelta

    # 기본값 설정: 최근 7일
    if not end_date:
        end_date_obj = date.today()
    else:
        end_date_obj = date.fromisoformat(end_date)

    if not start_date:
        start_date_obj = end_date_obj - timedelta(days=6)
    else:
        start_date_obj = date.fromisoformat(start_date)

    # 날짜별 접속자 수 집계 (POST에서 이미 일별 IP 중복 방지)
    stats = db.query(
        func.date(GameVisit.created_at).label('visit_date'),
        func.count(GameVisit.id).label('user_count')
    ).filter(
        func.date(GameVisit.created_at) >= start_date_obj,
        func.date(GameVisit.created_at) <= end_date_obj
    ).group_by(
        func.date(GameVisit.created_at)
    ).order_by(
        func.date(GameVisit.created_at)
    ).all()

    # 응답 형식으로 변환
    result = [
        DailyVisitStats(
            date=str(stat.visit_date),
            user_count=stat.user_count
        )
        for stat in stats
    ]

    return DailyVisitStatsResponse(
        stats=result,
        total_days=len(result),
        start_date=str(start_date_obj),
        end_date=str(end_date_obj)
    )


@router.delete("/", response_model=GameVisitDeleteResponse)
def delete_game_visits(
    delete_data: GameVisitDeleteRequest,
    db: Session = Depends(get_db)
):
    """게임 접속 기록 삭제 (날짜 범위 기반)"""
    # 날짜 유효성 검증
    if delete_data.start_date > delete_data.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be less than or equal to end_date"
        )

    # 날짜 범위에 해당하는 레코드 삭제
    db.query(GameVisit).filter(
        func.date(GameVisit.created_at) >= delete_data.start_date,
        func.date(GameVisit.created_at) <= delete_data.end_date
    ).delete(synchronize_session=False)

    db.commit()

    return GameVisitDeleteResponse(
        message="Game visit records deleted successfully",
        start_date=str(delete_data.start_date),
        end_date=str(delete_data.end_date)
    )

# 게임 일일 접속수 GET API 실행계획

## 요구사항 요약

**요구사항**: FastAPI에 게임 일일 접속자 수를 조회하는 GET 엔드포인트를 생성합니다. 시작일과 종료일을 쿼리 파라미터로 받아, 해당 기간 동안 하루마다 접속한 유저 수를 집계하여 반환합니다.

**목적**: Admin 페이지에서 게임 접속 통계를 시각화하기 위해 일별 접속자 수 데이터를 제공합니다. 이를 통해 게임 트래픽 추이를 파악하고 사용자 참여도를 분석할 수 있습니다.

## 현재상태 분석

- `game_visits` 테이블이 이미 존재하며, `created_at`, `user_id`, `ip_address` 필드를 포함합니다
- POST `/api/v1/game_visits` 엔드포인트로 게임 접속 기록이 생성되고 있습니다
- 일별 접속자 수를 집계하는 GET 엔드포인트는 아직 구현되지 않았습니다
- SQLAlchemy의 `func.date()`, `func.count()`, `func.distinct()` 함수를 사용하여 날짜별 그룹화 및 집계가 가능합니다

## 구현 방법

SQLAlchemy의 그룹화 및 집계 함수를 사용하여 구현합니다:
1. 쿼리 파라미터로 `start_date`, `end_date`를 받습니다 (선택 사항, 기본값: 최근 7일)
2. `game_visits` 테이블에서 `created_at`이 해당 기간에 속하는 레코드를 필터링합니다
3. `func.date(created_at)`로 날짜별 그룹화하고, `func.count()`로 레코드 수를 집계합니다 (POST 엔드포인트에서 이미 일별 IP 중복을 방지하므로 DISTINCT 불필요)
4. 결과를 `[{날짜, 유저수}, ...]` 형식의 JSON 배열로 반환합니다
5. 테스트용 Mock 데이터를 생성하는 스크립트를 작성합니다

## 구현 단계

### 1. Pydantic 스키마 정의
```python
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
```
- `DailyVisitStats`: 날짜와 접속자 수를 담는 스키마
- `DailyVisitStatsResponse`: 통계 배열과 메타 정보(총 일수, 시작일, 종료일)를 담는 응답 스키마
- `date`는 문자열 형식으로 반환하여 프론트엔드에서 파싱하기 쉽게 합니다

### 2. GET 엔드포인트 구현
```python
from datetime import date, timedelta
from sqlalchemy import func

@app.get("/api/v1/game_visits/stats", response_model=DailyVisitStatsResponse)
def get_daily_visit_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """게임 일일 접속자 수 조회 (날짜 범위 필터)"""
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
```
- 쿼리 파라미터로 `start_date`, `end_date`를 받습니다 (선택 사항)
- 기본값: `end_date`는 오늘, `start_date`는 7일 전
- `func.date(created_at)`로 날짜별 그룹화
- `func.count(GameVisit.id)`로 레코드 수 집계 (POST에서 이미 일별 IP 중복 방지)
- 날짜 오름차순으로 정렬하여 반환

### 3. Mock 데이터 생성 스크립트
```python
# backend/create_mock_visits.py
import random
from datetime import datetime, timedelta
from database import SessionLocal
from models import GameVisit

def create_mock_game_visits(days: int = 30):
    """게임 접속 기록 Mock 데이터 생성"""
    db = SessionLocal()
    try:
        today = datetime.now()

        for day_offset in range(days):
            visit_date = today - timedelta(days=day_offset)
            # 하루에 랜덤하게 5~20명 접속
            num_visits = random.randint(5, 20)

            for i in range(num_visits):
                # 랜덤 IP 생성
                ip = f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}"
                # 50% 확률로 user_id 할당
                user_id = random.randint(1, 10) if random.random() > 0.5 else None

                # 랜덤 시간 설정 (0~23시)
                visit_time = visit_date.replace(
                    hour=random.randint(0, 23),
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59)
                )

                visit = GameVisit(
                    user_id=user_id,
                    ip_address=ip,
                    is_visits=True,
                    created_at=visit_time
                )
                db.add(visit)

        db.commit()
        print(f"Mock data created: {days}일 동안 접속 기록 생성 완료")
    except Exception as e:
        db.rollback()
        print(f"Error creating mock data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_mock_game_visits(30)
```
- 최근 30일 동안의 Mock 데이터 생성
- 하루에 5~20명의 랜덤 접속자 생성
- 랜덤 IP 주소 생성 (192.168.x.x 대역)
- 50% 확률로 user_id 할당 (비회원 접속 시뮬레이션)
- 랜덤 시간대에 접속 기록 생성

### 4. Docker 컨테이너 내부에서 Mock 데이터 생성
```bash
# backend/create_mock_visits.py 파일을 컨테이너에 복사 (이미 볼륨 마운트로 동기화됨)
# 컨테이너 내부에서 스크립트 실행
docker exec fastapi-server python /code/create_mock_visits.py
```
- Docker 컨테이너 내부에서 Python 스크립트 실행
- `/code`는 backend 폴더가 마운트된 경로입니다
- 데이터베이스에 Mock 데이터가 생성됩니다

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| backend/main.py | 수정 | Pydantic 스키마 추가 (DailyVisitStats, DailyVisitStatsResponse), GET /api/v1/game_visits/stats 엔드포인트 추가 |
| backend/create_mock_visits.py | 생성 | Mock 데이터 생성 스크립트 작성 |

## 완료 체크리스트

- [o] GET /api/v1/game_visits/stats 엔드포인트가 정상적으로 응답하는지 확인 (Swagger UI 또는 curl)
- [o] 쿼리 파라미터 없이 호출 시 최근 7일 데이터가 반환되는지 확인
- [o] start_date, end_date를 지정하여 호출 시 해당 기간 데이터가 반환되는지 확인
- [o] 응답 형식이 `[{date, user_count}, ...]` 배열 형태인지 확인
- [o] Mock 데이터가 데이터베이스에 정상적으로 생성되는지 확인 (MySQL 직접 조회)
- [o] 날짜별로 접속자 수가 정확히 집계되는지 확인
- [o] API 호출 시 에러 없이 실행되는지 확인

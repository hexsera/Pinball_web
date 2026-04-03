# Redis TTL 캐시 도입 실행계획 (Phase 1)

## 요구사항 요약

**요구사항**: `GET /api/v1/monthly-scores` 응답을 Redis에 TTL 30초로 캐시

**목적**: 매 요청마다 PostgreSQL 풀스캔이 발생하는 것을 줄여 랭킹 조회 성능을 개선한다.

## 현재상태 분석

- `redis_client.py`: Redis 연결 객체(`redis.Redis`) 이미 존재. 호스트명 `redis-server`, 포트 6379.
- `docker-compose.yml`: `redis:8.6.2` 컨테이너(`redis-server`) 이미 정의됨. fastapi가 redis에 `depends_on` 설정됨.
- `requirements.txt`: `redis==7.1.1` 이미 설치됨.
- `monthly_scores.py`: `GET ""` 라우터가 매 요청마다 DB 날짜 범위 필터 + score 내림차순 정렬 쿼리를 실행함.
- **캐시 무효화 없음**: TTL 만료 시 자연 갱신 방식 채택. POST/PUT/DELETE는 캐시에 영향 없음.

## 구현 방법

`GET /api/v1/monthly-scores` 라우터 내부에서:
1. 먼저 Redis에서 캐시 키 `monthly_scores:current_month`를 조회한다.
2. 캐시가 있으면 JSON 역직렬화 후 즉시 반환한다.
3. 캐시가 없으면 DB를 조회하고, 결과를 JSON 직렬화해 Redis에 TTL 30초로 저장 후 반환한다.

## 구현 단계

### 1. MonthlyScoreResponse 직렬화 헬퍼 추가

```python
# backend/app/api/v1/monthly_scores.py 상단 import에 추가
import json
from app.redis_client import redis_client
```
- `json`은 캐시 저장/로드 시 직렬화에 사용한다.
- `redis_client`는 기존 `redis_client.py`의 연결 객체를 재사용한다.

### 2. GET 라우터에 캐시 로직 추가

```python
CACHE_KEY = "monthly_scores:current_month"
CACHE_TTL = 30  # 초

@router.get("", response_model=MonthlyScoreListResponse)
def get_monthly_scores(db: Session = Depends(get_db)):
    cached = redis_client.get(CACHE_KEY)
    if cached:
        data = json.loads(cached)
        return MonthlyScoreListResponse(**data)

    start, end = get_current_month_range()
    scores = db.query(MonthlyScore).filter(
        MonthlyScore.created_at >= start,
        MonthlyScore.created_at <= end
    ).order_by(MonthlyScore.score.desc()).all()

    result = MonthlyScoreListResponse(scores=scores, total=len(scores))
    redis_client.setex(CACHE_KEY, CACHE_TTL, result.model_dump_json())
    return result
```
- `redis_client.get(CACHE_KEY)`: Redis에서 캐시를 읽는다. 없으면 `None` 반환.
- `redis_client.setex(key, ttl, value)`: TTL과 함께 값을 저장한다. 30초 후 자동 만료.
- `result.model_dump_json()`: Pydantic 모델을 JSON 문자열로 직렬화한다.

### 3. Redis 연결 오류 방어 처리

```python
@router.get("", response_model=MonthlyScoreListResponse)
def get_monthly_scores(db: Session = Depends(get_db)):
    try:
        cached = redis_client.get(CACHE_KEY)
        if cached:
            data = json.loads(cached)
            return MonthlyScoreListResponse(**data)
    except Exception:
        pass  # Redis 장애 시 DB 직접 조회로 폴백

    start, end = get_current_month_range()
    scores = db.query(MonthlyScore).filter(
        MonthlyScore.created_at >= start,
        MonthlyScore.created_at <= end
    ).order_by(MonthlyScore.score.desc()).all()

    result = MonthlyScoreListResponse(scores=scores, total=len(scores))
    try:
        redis_client.setex(CACHE_KEY, CACHE_TTL, result.model_dump_json())
    except Exception:
        pass  # 캐시 저장 실패해도 응답은 정상 반환
    return result
```
- Redis가 다운되어도 DB 직접 조회로 폴백하여 서비스가 중단되지 않는다.
- 캐시 저장 실패도 예외를 무시하고 정상 응답을 반환한다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/api/v1/monthly_scores.py` | 수정 | import 추가, GET 라우터에 Redis 캐시 로직 추가 |

## 완료 체크리스트

- [ ] `GET /api/v1/monthly-scores` 첫 요청 시 DB를 조회하고 Redis에 캐시가 저장되는지 확인 (`docker compose exec redis-server redis-cli get monthly_scores:current_month`)
- [ ] 30초 이내 재요청 시 DB 쿼리 없이 Redis에서 응답이 반환되는지 확인 (FastAPI 로그에 DB 쿼리 없음)
- [ ] 30초 후 캐시가 자동 만료되어 다음 요청 시 DB를 재조회하는지 확인
- [ ] Redis 컨테이너 중지 상태에서도 `GET /api/v1/monthly-scores`가 200 응답을 반환하는지 확인
- [ ] 에러 없이 FastAPI 컨테이너가 정상 기동되는지 확인 (`docker compose logs fastapi`)

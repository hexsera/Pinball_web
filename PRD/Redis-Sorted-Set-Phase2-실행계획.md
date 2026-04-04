# Redis Sorted Set Phase 2 실행계획

## 요구사항 요약

**요구사항**: `GET /api/v1/monthly-scores`의 Redis 캐시 방식을 TTL JSON 캐시에서 Redis Sorted Set으로 전환하고, POST/PUT/DELETE 시 Redis를 동기화한다.

**목적**: Redis를 단순 캐시가 아닌 랭킹 조회의 주 경로로 만들어, DB 풀스캔 없이 랭킹을 반환한다. 공부 목적으로 Redis Sorted Set 이중 쓰기 패턴을 실습한다.

## 현재상태 분석

- `monthly_scores.py`: GET에 TTL 30초 JSON 캐시 적용됨. POST/PUT/DELETE는 DB만 사용.
- 캐시 키: `monthly_scores:current_month` (고정 문자열)
- `MonthlyScoreListResponse`: `scores: List[MonthlyScoreResponse]`, `total: int`
- `MonthlyScoreResponse`: `nickname`, `score`, `created_at` 필드. `created_at`은 Redis Sorted Set에 없으므로 응답 시 별도 처리 필요.

## 구현 방법

Redis Sorted Set에 `member = "user_id:nickname"`, `score = 점수` 형태로 저장한다. GET은 `ZREVRANGEBYSCORE`로 Redis만 조회한다. POST/PUT/DELETE는 DB 작업 후 Redis도 동기화(이중 쓰기)한다. Redis가 비어있으면 워밍업 함수로 DB에서 Sorted Set을 재구성한다.

`created_at`은 Sorted Set에 저장할 수 없으므로, GET 응답 시 `created_at` 필드를 현재 월 1일로 고정 반환한다.

## 구현 단계

### 1. 캐시 키 헬퍼 및 상수 교체

```python
def get_cache_key() -> str:
    now = datetime.now()
    return f"monthly_scores:{now.year}-{now.month:02d}"
```

- Phase 1의 고정 키 `CACHE_KEY = "monthly_scores:current_month"`와 `CACHE_TTL`을 제거하고 이 함수로 교체한다.
- 월별로 키가 분리되므로 달이 바뀌면 새 키가 자동 생성된다.

### 2. 워밍업 함수 추가

```python
def warm_up_sorted_set(db: Session):
    start, end = get_current_month_range()
    scores = db.query(MonthlyScore).filter(
        MonthlyScore.created_at >= start,
        MonthlyScore.created_at <= end
    ).all()
    if scores:
        mapping = {f"{s.user_id}:{s.nickname}": float(s.score) for s in scores}
        redis_client.zadd(get_cache_key(), mapping)
```

- Redis 재시작 등으로 Sorted Set이 비었을 때 DB에서 데이터를 읽어 Redis를 재구성한다.
- GET 라우터에서 결과가 비어있을 때 호출한다.

### 3. GET 라우터 교체

```python
@router.get("", response_model=MonthlyScoreListResponse)
def get_monthly_scores(db: Session = Depends(get_db)):
    try:
        raw = redis_client.zrevrangebyscore(get_cache_key(), "+inf", "-inf", withscores=True)
        if not raw:
            warm_up_sorted_set(db)
            raw = redis_client.zrevrangebyscore(get_cache_key(), "+inf", "-inf", withscores=True)
        month_start = get_current_month_range()[0]
        scores = [
            MonthlyScoreResponse(nickname=m.decode().split(":", 1)[1], score=int(s), created_at=month_start)
            for m, s in raw
        ]
        return MonthlyScoreListResponse(scores=scores, total=len(scores))
    except Exception:
        pass  # Redis 장애 시 DB 폴백

    start, end = get_current_month_range()
    scores = db.query(MonthlyScore).filter(
        MonthlyScore.created_at >= start,
        MonthlyScore.created_at <= end
    ).order_by(MonthlyScore.score.desc()).all()
    return MonthlyScoreListResponse(scores=scores, total=len(scores))
```

- `zrevrangebyscore`로 score 내림차순 전체 조회한다.
- `withscores=True`로 member와 score를 함께 반환받는다.
- member 문자열 `"user_id:nickname"`을 `split(":", 1)`로 파싱해 nickname을 추출한다.
- `created_at`은 Sorted Set에 없으므로 이번 달 1일로 고정 반환한다.
- Redis 예외 시 기존 DB 직접 조회로 폴백한다.

### 4. POST 라우터에 ZADD 추가

```python
# DB 저장/수정 완료 후 (기존 return 직전)
try:
    key = get_cache_key()
    member = f"{score_data.user_id}:{user.nickname}"
    current = redis_client.zscore(key, member)
    if current is None or score_data.score > current:
        redis_client.zadd(key, {member: float(score_data.score)})
except Exception:
    pass
```

- DB의 "최고 점수만 저장" 로직과 동일하게, 기존 Redis score보다 높을 때만 `ZADD`한다.
- `zscore`로 현재 저장된 score를 확인한 뒤 조건 분기한다.

### 5. PUT 라우터에 ZADD 추가

```python
# db.commit() 후
try:
    existing = db.query(MonthlyScore).filter(MonthlyScore.user_id == user_id).first()
    redis_client.zadd(get_cache_key(), {f"{user_id}:{existing.nickname}": float(score_data.score)})
except Exception:
    pass
```

- PUT은 강제 수정이므로 score 비교 없이 바로 `ZADD`로 덮어쓴다.
- nickname은 DB에서 조회해 member 문자열을 구성한다.

### 6. DELETE 라우터에 ZREM 추가

```python
# db.delete(score) 전에 nickname 확보 후
try:
    redis_client.zrem(get_cache_key(), f"{user_id}:{score.nickname}")
except Exception:
    pass
```

- `db.delete()` 전에 `score.nickname`을 읽어 member 문자열을 구성한다.
- `ZREM`으로 해당 member를 Sorted Set에서 제거한다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/api/v1/monthly_scores.py` | 수정 | 캐시 키 헬퍼 교체, 워밍업 함수 추가, GET/POST/PUT/DELETE 라우터 수정 |

## 완료 체크리스트

- [ ] `POST` 후 `docker exec redis-server redis-cli ZREVRANGEBYSCORE monthly_scores:$(date +%Y-%m) +inf -inf WITHSCORES`로 점수가 즉시 반영되는지 확인
- [ ] `GET` 시 FastAPI 로그에 DB 쿼리(SELECT)가 찍히지 않는지 확인
- [ ] `docker restart redis-server` 후 첫 `GET /api/v1/monthly-scores`가 정상 응답 반환되는지 확인
- [ ] `DELETE` 후 `GET` 응답에 해당 사용자가 없는지 확인
- [ ] `docker stop redis-server` 상태에서 `GET /api/v1/monthly-scores`가 200 반환되는지 확인
- [ ] FastAPI 컨테이너가 에러 없이 기동되는지 확인 (`docker compose logs fastapi`)

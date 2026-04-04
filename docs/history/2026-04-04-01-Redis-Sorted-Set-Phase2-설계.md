# Redis Sorted Set Phase 2 설계

## 기본 정보
- 날짜: 2026-04-04 (토)
- 작성자: hexsera

## 배경

Phase 1(TTL 30초 JSON 캐시)이 정상 동작하는 상태에서, 공부 목적으로 Redis Sorted Set 기반 Phase 2 전환을 진행한다.

Phase 1과의 핵심 차이: Redis가 캐시(임시 복사본)가 아닌 **랭킹 조회의 주 경로**가 된다.

---

## 데이터 구조 설계

### Sorted Set 키

```
monthly_scores:2026-04
```

월별로 키가 분리된다. 달이 바뀌면 새 키가 자동 생성되므로 별도 초기화 불필요.

### member / score 구조

```
ZADD monthly_scores:2026-04  600  "42:testuser"
                              ↑        ↑
                           score    "user_id:nickname"
```

member에 `user_id:nickname`을 같이 넣는 이유: Redis Sorted Set은 member가 단순 문자열이라 user_id와 nickname을 함께 담아야 응답 직렬화 시 DB를 다시 조회하지 않아도 된다.

### 조회 명령

```
ZREVRANGEBYSCORE monthly_scores:2026-04 +inf -inf WITHSCORES
```

score 내림차순으로 전체 반환. O(log N + M) (N=전체 멤버, M=반환 개수).

---

## 엔드포인트별 변경 설계

### GET /api/v1/monthly-scores

**현재 (Phase 1)**
```
Redis JSON 캐시 확인 → miss면 DB 풀스캔 → Redis setex
```

**변경 후 (Phase 2)**
```
Redis ZREVRANGEBYSCORE → 결과 직렬화 → 반환
(DB 접근 없음)
```

Redis가 비어있을 때(재시작 등): 워밍업 함수 호출 → DB에서 Sorted Set 재구성 → 재조회

**워밍업이 필요한 이유**

Phase 1은 Redis가 캐시(임시 복사본)였으므로 miss가 나면 DB 조회가 당연한 흐름이었다. Phase 2는 Redis가 주 조회 경로라 DB를 보지 않는다. 그런데 Redis는 인메모리라 재시작 시 데이터가 사라진다. 이 상태에서 GET을 하면 DB에 데이터가 멀쩡히 있어도 빈 랭킹이 반환된다.

워밍업은 이를 감지하고 복구한다: 빈 결과가 반환되면 DB를 한 번 조회해 Sorted Set을 재구성한 뒤 재조회한다. 이후 요청부터는 Redis가 채워져 있으므로 DB를 다시 보지 않는다.

"Redis가 비어서 빈 결과"인지 "진짜 데이터가 없어서 빈 결과"인지는 구분할 수 없으므로, 빈 결과가 나오면 무조건 워밍업을 실행한다. DB도 비어있으면 워밍업 후에도 빈 결과가 반환되며, 이는 정상 동작이다.

---

### POST /api/v1/monthly-scores (점수 upsert)

**현재**: DB에만 저장

**변경 후**: DB 저장(영속성) + Redis ZADD (랭킹 즉시 반영)

```python
# DB 저장 성공 후
redis_client.zadd(cache_key, {f"{user_id}:{nickname}": score})
```

`ZADD`는 기본적으로 같은 member가 있으면 score를 덮어쓴다. 단, 현재 로직이 "최고 점수만 저장"이므로 DB와 동일하게 조건 분기가 필요하다.

```python
# 기존 Redis score 확인 후 더 높을 때만 ZADD
current = redis_client.zscore(cache_key, f"{user_id}:{nickname}")
if current is None or score > current:
    redis_client.zadd(cache_key, {f"{user_id}:{nickname}": score})
```

---

### PUT /api/v1/monthly-scores/{user_id}

**현재**: DB만 수정

**변경 후**: DB 수정 + Redis ZADD (score 덮어쓰기)

member 문자열에 nickname이 포함되어 있으므로, PUT 시점에 현재 nickname을 DB에서 조회해 member를 구성한 뒤 ZADD한다.

---

### DELETE /api/v1/monthly-scores/{user_id}

**현재**: DB만 삭제

**변경 후**: DB 삭제 + Redis ZREM

```python
redis_client.zrem(cache_key, f"{user_id}:{nickname}")
```

삭제 전에 member 문자열(nickname 포함)을 알아야 하므로 DB 삭제 전에 score 레코드를 먼저 조회한다.

---

## 워밍업 로직

Redis 재시작 등으로 Sorted Set이 비어있을 때 자동 복구.

```python
def warm_up_sorted_set(db: Session):
    """DB에서 이번 달 점수를 읽어 Redis Sorted Set을 재구성"""
    start, end = get_current_month_range()
    scores = db.query(MonthlyScore).filter(
        MonthlyScore.created_at >= start,
        MonthlyScore.created_at <= end
    ).all()
    if scores:
        mapping = {f"{s.user_id}:{s.nickname}": s.score for s in scores}
        redis_client.zadd(get_cache_key(), mapping)
```

호출 시점: `GET` 라우터에서 ZREVRANGEBYSCORE 결과가 비어있을 때.

단, "데이터가 실제로 없는 경우"와 "Redis가 비어있는 경우"를 구분할 수 없으므로, 빈 결과가 반환되면 무조건 워밍업 후 재조회하는 방식으로 처리한다. (DB도 비어있으면 워밍업 후에도 빈 결과 반환 — 정상 동작)

---

## 캐시 키 헬퍼

```python
def get_cache_key() -> str:
    now = datetime.now()
    return f"monthly_scores:{now.year}-{now.month:02d}"
```

Phase 1의 고정 키 `monthly_scores:current_month`에서 월별 동적 키로 변경.

---

## Phase 1과의 코드 변경 비교

| 항목 | Phase 1 | Phase 2 |
|------|---------|---------|
| 캐시 키 | `monthly_scores:current_month` | `monthly_scores:2026-04` |
| GET | `redis_client.get` / `setex` | `zrevrangebyscore` + 워밍업 |
| POST | DB만 | DB + `zadd` |
| PUT | DB만 | DB + `zadd` |
| DELETE | DB만 | DB + `zrem` |
| TTL | 30초 | 없음 (월 단위 키) |
| DB 조회 빈도 | 30초에 1회 | 워밍업 시에만 |

---

## 예외 처리 방침

Phase 1과 동일하게 Redis 연산은 `try/except`로 감싼다.

- `zadd/zrem` 실패: 로그 없이 무시. DB는 이미 정상 저장됨. 다음 워밍업 시 복구됨.
- `zrevrangebyscore` 실패: DB 직접 조회로 폴백 (Phase 1 방식 유지).

---

## 수정할 파일

| 파일 | 변경 내용 |
|------|-----------|
| `backend/app/api/v1/monthly_scores.py` | 전체 캐시 로직 교체 |

---

## 완료 체크리스트

- [ ] `POST` 후 `ZREVRANGEBYSCORE`로 점수가 즉시 반영되는지 확인
- [ ] `GET` 응답이 DB 쿼리 없이 Redis만으로 반환되는지 확인 (FastAPI 로그)
- [ ] Redis 재시작 후 첫 `GET` 시 워밍업이 실행되고 정상 응답 반환되는지 확인
- [ ] `DELETE` 후 랭킹에서 해당 사용자가 제거되는지 확인
- [ ] Redis 중지 상태에서 `GET`이 DB 폴백으로 200 반환되는지 확인

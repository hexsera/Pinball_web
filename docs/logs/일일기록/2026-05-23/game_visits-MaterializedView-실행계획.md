# game_visits Materialized View 실행계획

## 요구사항 요약

**요구사항**: `game_visits` 테이블의 일별 방문자 집계 쿼리에 Materialized View를 적용한다.

**목적**: 포트폴리오용 DB 캐시 기술 경험. mock 데이터로 대용량 상황을 재현하고 MV 적용 전후 쿼리 속도를 수치로 비교한다.

## 현재상태 분석

- `game_visits` 테이블: `id`, `user_id(nullable)`, `ip_address`, `is_visits`, `created_at`, `updated_at` 컬럼 구성
- `GET /api/v1/game-visits`: 날짜 범위 필터 + `GROUP BY date(created_at)` + `COUNT(id)` 집계 쿼리 실행
- 데이터가 늘어날수록 매 조회마다 전체 테이블 풀스캔 발생
- 현재 데이터 부족 → mock 데이터 삽입 필요

## 구현 방법

1. mock 데이터를 수십만 건 삽입해 대용량 환경 재현
2. `EXPLAIN ANALYZE`로 MV 적용 전 쿼리 속도 측정 (Before)
3. Materialized View `mv_daily_visit_stats` 생성
4. `GET /api/v1/game-visits` API가 MV를 조회하도록 수정
5. `EXPLAIN ANALYZE`로 MV 적용 후 속도 측정 (After)
6. `pg_cron`으로 매일 자정 REFRESH 자동화

## 구현 단계

### 1. mock 데이터 삽입 스크립트 작성

```sql
INSERT INTO game_visits (user_id, ip_address, is_visits, created_at)
SELECT
    NULL,
    '10.' || (random() * 255)::int || '.' || (random() * 255)::int || '.' || (random() * 255)::int,
    true,
    NOW() - (random() * INTERVAL '365 days')
FROM generate_series(1, 500000);
```
- **무엇을 하는가**: 1년치 방문 기록 50만 건을 무작위 IP와 날짜로 생성
- `generate_series(1, 500000)`으로 반복 없이 대량 INSERT 수행
- `random() * INTERVAL '365 days'`로 날짜를 균등하게 분산

### 2. MV 적용 전 속도 측정 (Before)

```sql
EXPLAIN ANALYZE
SELECT
    date(created_at) AS visit_date,
    COUNT(id)        AS user_count
FROM game_visits
GROUP BY date(created_at)
ORDER BY date(created_at);
```
- **무엇을 하는가**: 현재 쿼리의 실행 계획과 소요 시간을 출력
- `Seq Scan` 여부와 `Execution Time` 수치를 기록해 After와 비교

### 3. Materialized View 생성

```sql
CREATE MATERIALIZED VIEW mv_daily_visit_stats AS
SELECT
    date(created_at) AS visit_date,
    COUNT(id)        AS user_count
FROM game_visits
GROUP BY date(created_at)
ORDER BY date(created_at);

-- 조회 속도를 위한 인덱스
CREATE UNIQUE INDEX idx_mv_daily_visit_stats_date
    ON mv_daily_visit_stats (visit_date);
```
- **무엇을 하는가**: 집계 결과를 디스크에 물리적으로 저장하는 뷰 생성
- UNIQUE INDEX를 추가해야 `REFRESH CONCURRENTLY` 사용 가능 (조회 블로킹 방지)

### 4. API 쿼리를 MV 조회로 교체

```python
# backend/app/api/v1/game_visits.py - get_daily_visit_stats()
from sqlalchemy import text

stats = db.execute(text("""
    SELECT visit_date, user_count
    FROM mv_daily_visit_stats
    WHERE visit_date >= :start AND visit_date <= :end
    ORDER BY visit_date
"""), {"start": start_date_obj, "end": end_date_obj}).fetchall()
```
- **무엇을 하는가**: 원본 테이블 집계 대신 MV에서 이미 계산된 결과를 직접 조회
- 파라미터 바인딩(`:start`, `:end`)으로 SQL Injection 방지

### 5. pg_cron으로 자동 REFRESH 설정

```sql
-- postgres 컨테이너에서 실행
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'refresh-daily-visit-stats',  -- 작업 이름
    '0 0 * * *',                  -- 매일 자정
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_visit_stats'
);
```
- **무엇을 하는가**: 매일 자정 MV를 자동 갱신하도록 스케줄 등록
- `CONCURRENTLY`로 REFRESH 중에도 기존 데이터 조회 가능

### 6. MV 적용 후 속도 측정 (After)

```sql
EXPLAIN ANALYZE
SELECT visit_date, user_count
FROM mv_daily_visit_stats
WHERE visit_date >= '2025-01-01' AND visit_date <= '2025-12-31';
```
- **무엇을 하는가**: MV 조회의 실행 계획과 소요 시간 확인
- `Index Scan`으로 전환됐는지, `Execution Time` 수치를 Before와 비교해 기록

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/api/v1/game_visits.py` | 수정 | `get_daily_visit_stats()`를 MV 조회로 교체 |
| `backend/alembic/versions/xxxx_add_mv_daily_visit_stats.py` | 생성 | MV 및 인덱스 생성 마이그레이션 |
| `scripts/mock_game_visits.sql` | 생성 | 50만 건 mock 데이터 삽입 스크립트 |

## 완료 체크리스트

- [ ] mock 데이터 50만 건 삽입 확인 (`SELECT COUNT(*) FROM game_visits`)
- [ ] Before `EXPLAIN ANALYZE` 결과에서 `Seq Scan` 및 `Execution Time` 기록
- [ ] `mv_daily_visit_stats` 뷰 생성 확인 (`\dv` 명령)
- [ ] After `EXPLAIN ANALYZE` 결과에서 `Index Scan` 전환 및 `Execution Time` 기록
- [ ] `GET /api/v1/game-visits` 응답 데이터가 MV 적용 전과 동일한지 확인
- [ ] pg_cron 스케줄 등록 확인 (`SELECT * FROM cron.job`)
- [ ] Before/After 수치 차이를 history 문서에 기록

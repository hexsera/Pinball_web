# monthly_scores 이번 달 범위 제한 실행계획

## 요구사항 요약

**요구사항**: `POST /api/v1/monthly-scores`에서 기존 점수 조회 시, `GET /api/v1/monthly-scores/{user_id}`에서 점수 조회 시 이번 달(1일~말일) 범위의 레코드만 대상으로 한다.

**목적**: 월이 바뀌었을 때 이전 달의 점수가 이번 달 점수로 오인되어 갱신되거나 조회되는 것을 방지한다.

## 현재상태 분석

- `POST`: `MonthlyScore.user_id == user_id` 조건만으로 기존 레코드 조회 → 이전 달 레코드를 이번 달 레코드로 착각하고 업데이트할 수 있음
- `GET /` (전체 조회): 이번 달 범위 필터가 이미 존재하나, `end_date`를 `date(year, month, last_day)`로 비교하면 마지막 날 `00:00:00` 이후 데이터가 누락됨
- `GET /{user_id}` (단일 조회): 날짜 필터 없음 → 이전 달 레코드 반환 가능

## 구현 방법

- 이번 달 범위를 `start_of_month = datetime(year, month, 1, 0, 0, 0)`, `end_of_month = datetime(year, month, last_day, 23, 59, 59)`로 정의하여 `DateTime` 컬럼과 정확히 비교
- POST/GET 모두 동일한 범위 계산 로직을 사용해 일관성 확보
- 범위 계산 코드를 헬퍼 함수로 분리하여 중복 제거

## 구현 단계

### 1. 이번 달 범위 계산 헬퍼 함수 추가

```python
from datetime import datetime
from calendar import monthrange

def get_current_month_range():
    """이번 달 시작(1일 00:00:00)과 끝(말일 23:59:59)을 반환"""
    now = datetime.now()
    year, month = now.year, now.month
    _, last_day = monthrange(year, month)
    start = datetime(year, month, 1, 0, 0, 0)
    end = datetime(year, month, last_day, 23, 59, 59)
    return start, end
```
- **무엇을 하는가**: 이번 달 범위를 `datetime` 타입으로 반환하는 함수 — POST/GET에서 공통으로 사용
- `monthrange(year, month)`는 해당 월의 마지막 날짜(28~31)를 반환
- `DateTime` 컬럼(`created_at`)과 직접 비교 가능하도록 `datetime` 객체로 생성

### 2. POST — 기존 점수 조회에 이번 달 범위 필터 추가

```python
start, end = get_current_month_range()

existing_score = db.query(MonthlyScore).filter(
    MonthlyScore.user_id == score_data.user_id,
    MonthlyScore.created_at >= start,
    MonthlyScore.created_at <= end
).first()
```
- **무엇을 하는가**: 이번 달에 생성된 레코드만 "기존 점수"로 인식 — 이전 달 레코드는 별개의 레코드로 취급
- 이번 달 레코드가 없으면 새 레코드를 INSERT, 있으면 최고점 UPDATE

### 3. GET `/` — 전체 조회의 end_date 누락 버그 수정

```python
start, end = get_current_month_range()

scores = db.query(MonthlyScore).filter(
    MonthlyScore.created_at >= start,
    MonthlyScore.created_at <= end
).order_by(MonthlyScore.score.desc()).all()
```
- **무엇을 하는가**: 기존 `date` 타입 비교를 `datetime` 타입으로 교체해 말일 전체(00:00:00~23:59:59) 포함
- 기존 `end_date = date(year, month, last_day)` 비교는 말일 00:00:00 이후 데이터를 누락시킴

### 4. GET `/{user_id}` — 단일 조회에 이번 달 범위 필터 추가

```python
start, end = get_current_month_range()

score = db.query(MonthlyScore).filter(
    MonthlyScore.user_id == user_id,
    MonthlyScore.created_at >= start,
    MonthlyScore.created_at <= end
).first()
```
- **무엇을 하는가**: 특정 사용자의 이번 달 점수만 반환 — 이전 달 레코드가 있어도 404 반환
- 이번 달 레코드가 없으면 기존과 동일하게 HTTP 404 반환

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/api/v1/monthly_scores.py` | 수정 | 헬퍼 함수 추가, POST/GET 전체/GET 단일에 이번 달 범위 필터 적용 |

## 완료 체크리스트

- [ ] 이전 달에 점수를 등록한 사용자가 이번 달에 POST 요청 시 새 레코드가 생성됨
- [ ] 이전 달에 점수를 등록한 사용자가 `GET /{user_id}` 요청 시 404 반환됨
- [ ] `GET /` 요청 시 이번 달 말일 데이터(23:59 등록)가 정상적으로 포함됨
- [ ] 이번 달 점수가 있을 때 POST 요청 시 최고 점수만 업데이트됨 (기존 동작 유지)
- [ ] `GET /` 요청 시 이전 달 데이터가 포함되지 않음

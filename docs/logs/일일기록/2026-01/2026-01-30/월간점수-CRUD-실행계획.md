# 월간 점수 CRUD API 실행계획

## 요구사항 요약

**요구사항**: MonthlyScore 모델 기반 CRUD API를 생성한다. DB 연결 없이 메모리 저장소로 테스트하며, Create는 같은 user_id가 존재하면 점수를 수정하는 Upsert 방식으로 동작한다.

**목적**: 월간 랭킹 기능 개발을 위한 API 프로토타입 구축. 빠른 테스트를 위해 메모리 저장소를 사용하고, 향후 DB 연동으로 전환한다.

## 현재상태 분석

- `fastapi/main.py`에 기존 CRUD 패턴 존재 (User, Score, Friend Request)
- API 경로 패턴: `/api/v1/` 프리픽스 사용
- 메모리 저장소 예시: `friend_requests: List[dict] = []` (line 33)
- MonthlyScore 모델은 이미 `models.py`에 정의됨 (id, user_id, score, created_at)
- Pydantic 스키마는 main.py 상단에 정의 (line 36-157)

## 구현 방법

FastAPI + Pydantic을 사용하여 RESTful CRUD API를 구현한다.
- 메모리 저장소: `List[dict]` 형태로 데이터 저장
- Upsert 로직: user_id로 검색 → 존재하면 업데이트, 없으면 생성
- 응답 모델: Pydantic BaseModel + `response_model` 지정
- 에러 처리: HTTPException + 상태 코드 (404 Not Found)

## 구현 단계

### 1. 메모리 저장소 변수 추가
```python
# 친구 요청 메모리 저장소 (임시)
friend_requests: List[dict] = []

# 월간 점수 메모리 저장소 (임시)
monthly_scores: List[dict] = []
monthly_score_id_counter: int = 0
```
- **무엇을 하는가**: 월간 점수 데이터를 메모리에 저장하는 변수 선언
- `monthly_scores`: 점수 레코드 리스트 (각 dict는 id, user_id, score, created_at 포함)
- `monthly_score_id_counter`: AUTO_INCREMENT 동작을 모방하는 카운터
- main.py line 33 다음에 추가

### 2. Pydantic 스키마 정의
```python
class MonthlyScoreCreateRequest(BaseModel):
    """월간 점수 생성/수정 요청 (Upsert)"""
    user_id: int
    score: int

class MonthlyScoreUpdateRequest(BaseModel):
    """월간 점수 수정 요청"""
    score: int

class MonthlyScoreResponse(BaseModel):
    """월간 점수 응답"""
    id: int
    user_id: int
    score: int
    created_at: datetime

    class Config:
        from_attributes = True

class MonthlyScoreListResponse(BaseModel):
    """월간 점수 목록 응답"""
    scores: List[MonthlyScoreResponse]
    total: int

class MonthlyScoreDeleteResponse(BaseModel):
    """월간 점수 삭제 응답"""
    message: str
    deleted_user_id: int
```
- **무엇을 하는가**: API 요청/응답 데이터 구조를 정의
- CreateRequest: user_id와 score 필수 (Upsert용)
- UpdateRequest: score만 필요 (user_id는 경로 파라미터로 제공)
- Response: from_attributes = True로 dict를 Pydantic 모델로 자동 변환
- main.py line 117 다음에 추가 (ScoreListResponse 아래)

### 3. POST 엔드포인트 (Upsert)
```python
@app.post("/api/v1/monthly-scores", response_model=MonthlyScoreResponse)
def create_or_update_monthly_score(score_data: MonthlyScoreCreateRequest):
    """월간 점수 생성 또는 수정 (Upsert)"""
    global monthly_score_id_counter

    # 기존 레코드 검색
    existing_score = next(
        (s for s in monthly_scores if s["user_id"] == score_data.user_id),
        None
    )

    if existing_score:
        # 업데이트: score만 수정, created_at 유지
        existing_score["score"] = score_data.score
        return existing_score
    else:
        # 생성: 새 레코드 추가
        from datetime import datetime
        monthly_score_id_counter += 1
        new_score = {
            "id": monthly_score_id_counter,
            "user_id": score_data.user_id,
            "score": score_data.score,
            "created_at": datetime.now()
        }
        monthly_scores.append(new_score)
        return new_score
```
- **무엇을 하는가**: 같은 user_id가 존재하면 점수 업데이트, 없으면 새로 생성
- `next()`: 리스트에서 조건에 맞는 첫 번째 요소 찾기 (없으면 None)
- 업데이트 시 created_at 유지 (최초 생성 시각 보존)
- global 키워드로 id_counter 변경

### 4. GET 엔드포인트 (전체 조회)
```python
@app.get("/api/v1/monthly-scores", response_model=MonthlyScoreListResponse)
def get_monthly_scores(
    order_by: str = "score",
    order: str = "desc"
):
    """전체 월간 점수 조회 (정렬)"""
    sorted_scores = monthly_scores.copy()

    # 정렬
    reverse = (order == "desc")
    if order_by == "score":
        sorted_scores.sort(key=lambda x: x["score"], reverse=reverse)
    elif order_by == "created_at":
        sorted_scores.sort(key=lambda x: x["created_at"], reverse=reverse)
    elif order_by == "user_id":
        sorted_scores.sort(key=lambda x: x["user_id"], reverse=reverse)

    return MonthlyScoreListResponse(
        scores=sorted_scores,
        total=len(sorted_scores)
    )
```
- **무엇을 하는가**: 전체 월간 점수를 정렬하여 반환
- order_by: 정렬 기준 (score, created_at, user_id) - 기본값 score
- order: 정렬 방향 (desc, asc) - 기본값 desc (내림차순)
- 람다 함수로 정렬 키 지정

### 5. GET 엔드포인트 (단일 조회)
```python
@app.get("/api/v1/monthly-scores/{user_id}", response_model=MonthlyScoreResponse)
def get_monthly_score(user_id: int):
    """특정 사용자 월간 점수 조회"""
    score = next(
        (s for s in monthly_scores if s["user_id"] == user_id),
        None
    )

    if score is None:
        raise HTTPException(
            status_code=404,
            detail=f"Monthly score for user {user_id} not found"
        )

    return score
```
- **무엇을 하는가**: 특정 user_id의 월간 점수 조회
- 경로 파라미터로 user_id 받기
- 없으면 404 Not Found 에러 반환

### 6. PUT 엔드포인트 (수정)
```python
@app.put("/api/v1/monthly-scores/{user_id}", response_model=MonthlyScoreResponse)
def update_monthly_score(user_id: int, score_data: MonthlyScoreUpdateRequest):
    """특정 사용자 월간 점수 수정"""
    score = next(
        (s for s in monthly_scores if s["user_id"] == user_id),
        None
    )

    if score is None:
        raise HTTPException(
            status_code=404,
            detail=f"Monthly score for user {user_id} not found"
        )

    score["score"] = score_data.score
    return score
```
- **무엇을 하는가**: 기존 레코드의 점수만 수정
- POST와 차이점: PUT은 업데이트만, POST는 Upsert (생성 또는 업데이트)
- 레코드가 없으면 404 반환 (생성하지 않음)

### 7. DELETE 엔드포인트 (삭제)
```python
@app.delete("/api/v1/monthly-scores/{user_id}", response_model=MonthlyScoreDeleteResponse)
def delete_monthly_score(user_id: int):
    """특정 사용자 월간 점수 삭제"""
    global monthly_scores

    score = next(
        (s for s in monthly_scores if s["user_id"] == user_id),
        None
    )

    if score is None:
        raise HTTPException(
            status_code=404,
            detail=f"Monthly score for user {user_id} not found"
        )

    monthly_scores = [s for s in monthly_scores if s["user_id"] != user_id]

    return MonthlyScoreDeleteResponse(
        message="Monthly score deleted successfully",
        deleted_user_id=user_id
    )
```
- **무엇을 하는가**: 특정 user_id의 월간 점수 삭제
- 리스트 컴프리헨션으로 해당 레코드 제외한 새 리스트 생성
- global 키워드로 monthly_scores 재할당
- 삭제 확인 메시지 반환

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| fastapi/main.py | 수정 | 메모리 저장소 변수 2개, 스키마 5개, 엔드포인트 5개 추가 |

## 완료 체크리스트


- [o] POST /api/v1/monthly-scores 엔드포인트 추가 (Upsert 동작)
- [o] GET /api/v1/monthly-scores 엔드포인트 추가 (전체 조회)
- [o] GET /api/v1/monthly-scores/{user_id} 엔드포인트 추가 (단일 조회)
- [o] PUT /api/v1/monthly-scores/{user_id} 엔드포인트 추가 (수정)
- [o] DELETE /api/v1/monthly-scores/{user_id} 엔드포인트 추가 (삭제)
- [o] FastAPI 서버가 에러 없이 실행됨 (`docker compose logs fastapi`)
- [o] Swagger UI에서 모든 엔드포인트 확인 (`http://localhost:8000/docs`)
- [o] Upsert 동작 검증 (같은 user_id로 2번 POST → 레코드 1개만 존재)
- [o] 정렬 기능 확인 (점수 내림차순)

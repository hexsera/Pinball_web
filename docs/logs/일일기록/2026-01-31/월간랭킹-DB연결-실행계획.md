# 월간 랭킹 테이블 DB 연결 실행계획

## 요구사항 요약

**요구사항**: /api/v1/monthly-scores의 POST, GET, PUT, DELETE를 메모리 저장소에서 DB로 연결

**목적**: 메모리 저장소는 앱 재시작 시 데이터가 초기화되므로, DB에 저장하여 영속성을 확보

## 현재상태 분석

```
backend/main.py
├── monthly_scores: List[dict] = []        (라인 32-33) ← 메모리 저장소
├── POST /api/v1/monthly-scores            (라인 556-579) ← 메모리 기반 Upsert
├── GET  /api/v1/monthly-scores            (라인 582-602) ← 메모리 기반 정렬 조회
├── GET  /api/v1/monthly-scores/{user_id}  (라인 605-619) ← 메모리 기반 개별 조회
├── PUT  /api/v1/monthly-scores/{user_id}  (라인 622-637) ← 메모리 기반 수정
└── DELETE /api/v1/monthly-scores/{user_id}(라인 640-661) ← 메모리 기반 삭제

backend/models.py
└── MonthlyScore 모델 (라인 49-56) ← 이미 정의됨 (id, user_id, score, created_at)
```

- MonthlyScore 모델과 DB 테이블은 이미 존재
- 엔드포인트 5개 모두 메모리 저장소(`monthly_scores` 리스트)를 사용
- `get_db()` 의존성은 기존 엔드포인트에서 사용 중이므로 동일하게 사용 가능

## 구현 방법

- **PHASE 1**: POST와 DELETE를 DB로 변경 (메모리 저장소 유지)
- **PHASE 2**: GET과 PUT을 DB로 변경 후 메모리 저장소 제거
- 각 엔드포인트에 `db: Session = Depends(get_db)` 의존성 추가
- POST의 Upsert는 `db.query().filter().first()`로 기존 레코드 검색 후 분기 처리
- 전체 GET의 정렬은 SQLAlchemy의 `.order_by()`로 처리

## 구현 단계

---

### PHASE 1

#### 1. POST 엔드포인트 DB 연결

```python
# backend/main.py - POST /api/v1/monthly-scores 교체
@app.post("/api/v1/monthly-scores", response_model=MonthlyScoreResponse)
def create_or_update_monthly_score(
    score_data: MonthlyScoreCreateRequest,
    db: Session = Depends(get_db)
):
    """월간 점수 생성 또는 수정 (최고 점수만 저장)"""
    existing_score = db.query(MonthlyScore).filter(
        MonthlyScore.user_id == score_data.user_id
    ).first()

    if existing_score:
        if score_data.score > existing_score.score:
            existing_score.score = score_data.score
            db.commit()
            db.refresh(existing_score)
        return existing_score
    else:
        new_score = MonthlyScore(
            user_id=score_data.user_id,
            score=score_data.score
        )
        db.add(new_score)
        db.commit()
        db.refresh(new_score)
        return new_score
```
- **무엇을 하는가**: 메모리 저장소 대신 DB에서 user_id로 기존 레코드 검색
- 기존 레코드가 있고 새 점수가 더 높으면 score만 UPDATE, 아니면 기존 유지
- 기존 레코드가 없으면 INSERT
- `created_at`은 모델의 `server_default=func.now()`로 자동 생성되므로 명시 불필요

#### 2. DELETE 엔드포인트 DB 연결

```python
# backend/main.py - DELETE /api/v1/monthly-scores/{user_id} 교체
@app.delete("/api/v1/monthly-scores/{user_id}", response_model=MonthlyScoreDeleteResponse)
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

    db.delete(score)
    db.commit()

    return MonthlyScoreDeleteResponse(
        message="Monthly score deleted successfully",
        deleted_user_id=user_id
    )
```
- **무엇을 하는가**: DB에서 user_id로 레코드를 검색한 후 삭제
- 레코드가 없으면 404 반환
- `global monthly_scores`와 리스트 필터링은 제거

#### 3. PHASE 1 검증

```bash
# POST 테스트 - 새 레코드 생성
curl -X POST http://localhost:8000/api/v1/monthly-scores \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": 10000}'

# POST 테스트 - 더 높은 점수로 갱신
curl -X POST http://localhost:8000/api/v1/monthly-scores \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": 20000}'

# POST 테스트 - 더 낮은 점수 (갱신되지 않아야 함)
curl -X POST http://localhost:8000/api/v1/monthly-scores \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": 5000}'

# DELETE 테스트
curl -X DELETE http://localhost:8000/api/v1/monthly-scores/1

# DELETE 테스트 - 존재하지 않는 user_id (404여야 함)
curl -X DELETE http://localhost:8000/api/v1/monthly-scores/999
```
- **무엇을 하는가**: POST와 DELETE가 DB에 정상 연결되었는지 확인
- POST는 생성, 갱신, 낮은 점수 유지 3가지 경우 모두 테스트
- DELETE는 정상 삭제와 404 응답 테스트

---

### PHASE 2

#### 4. GET 전체 조회 엔드포인트 DB 연결

```python
# backend/main.py - GET /api/v1/monthly-scores 교체
@app.get("/api/v1/monthly-scores", response_model=MonthlyScoreListResponse)
def get_monthly_scores(
    db: Session = Depends(get_db)
):
    """전체 월간 점수 조회 (score 내림차순)"""
    scores = db.query(MonthlyScore).order_by(
        MonthlyScore.score.desc()
    ).all()

    return MonthlyScoreListResponse(
        scores=scores,
        total=len(scores)
    )
```
- **무엇을 하는가**: DB에서 전체 월간 점수를 score 내림차순으로 조회
- SQLAlchemy의 `.order_by(MonthlyScore.score.desc())`로 정렬 처리
- 기존 `order_by`, `order` 쿼리 파라미터와 메모리 기반 정렬 로직 제거

#### 5. GET 개별 조회 엔드포인트 DB 연결

```python
# backend/main.py - GET /api/v1/monthly-scores/{user_id} 교체
@app.get("/api/v1/monthly-scores/{user_id}", response_model=MonthlyScoreResponse)
def get_monthly_score(
    user_id: int,
    db: Session = Depends(get_db)
):
    """특정 사용자 월간 점수 조회"""
    score = db.query(MonthlyScore).filter(
        MonthlyScore.user_id == user_id
    ).first()

    if score is None:
        raise HTTPException(
            status_code=404,
            detail=f"Monthly score for user {user_id} not found"
        )

    return score
```
- **무엇을 하는가**: DB에서 user_id로 특정 사용자의 월간 점수 조회
- 레코드가 없으면 404 반환

#### 6. PUT 엔드포인트 DB 연결

```python
# backend/main.py - PUT /api/v1/monthly-scores/{user_id} 교체
@app.put("/api/v1/monthly-scores/{user_id}", response_model=MonthlyScoreResponse)
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
    return score
```
- **무엇을 하는가**: DB에서 user_id로 레코드를 찾아 score를 직접 수정
- 레코드가 없으면 404 반환

#### 7. 메모리 저장소 제거

```python
# backend/main.py 라인 32-33 삭제
# 다음 두 줄을 제거:
# monthly_scores: List[dict] = []
```
- **무엇을 하는가**: POST, GET, PUT, DELETE 모두 DB로 이동했으므로 메모리 저장소 제거
- 이 단계는 PHASE 2의 모든 엔드포인트 변경 후에만 수행

#### 8. PHASE 2 검증

```bash
# POST로 테스트 데이터 생성
curl -X POST http://localhost:8000/api/v1/monthly-scores \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": 30000}'

curl -X POST http://localhost:8000/api/v1/monthly-scores \
  -H "Content-Type: application/json" \
  -d '{"user_id": 2, "score": 50000}'

curl -X POST http://localhost:8000/api/v1/monthly-scores \
  -H "Content-Type: application/json" \
  -d '{"user_id": 3, "score": 10000}'

# GET 전체 조회 - score 내림차순이어야 함 (50000, 30000, 10000)
curl http://localhost:8000/api/v1/monthly-scores

# GET 개별 조회
curl http://localhost:8000/api/v1/monthly-scores/1

# PUT 수정
curl -X PUT http://localhost:8000/api/v1/monthly-scores/1 \
  -H "Content-Type: application/json" \
  -d '{"score": 99999}'

# GET 전체 조회 - 수정된 점수가 반영되어야 함
curl http://localhost:8000/api/v1/monthly-scores
```
- **무엇을 하는가**: PHASE 2의 GET, PUT과 메모리 저장소 제거 후 전체 기능 검증
- GET 전체 조회가 score 내림차순으로 반환되는지 확인
- PUT 수정 후 GET에서 변경된 값이 반영되는지 확인

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | Phase | 변경 내용 |
|-----------|-----------|-------|-----------|
| backend/main.py | 수정 | PHASE 1 | POST 엔드포인트를 DB 기반으로 변경 |
| backend/main.py | 수정 | PHASE 1 | DELETE 엔드포인트를 DB 기반으로 변경 |
| backend/main.py | 수정 | PHASE 2 | GET 전체 조회를 DB 기반으로 변경 |
| backend/main.py | 수정 | PHASE 2 | GET 개별 조회를 DB 기반으로 변경 |
| backend/main.py | 수정 | PHASE 2 | PUT 엔드포인트를 DB 기반으로 변경 |
| backend/main.py | 수정 | PHASE 2 | 메모리 저장소 `monthly_scores` 제거 |

## 완료 체크리스트

### PHASE 1
- [o] POST로 새 user_id를 생성하면 DB에 레코드가 생긴다
- [o] POST로 같은 user_id에 더 높은 점수를 보내면 score가 갱신된다
- [o] POST로 같은 user_id에 더 낮은 점수를 보내면 기존 score가 유지된다
- [o] DELETE로 존재하는 user_id를 삭제하면 DB에서 레코드가 제거된다
- [o] DELETE로 존재하지 않는 user_id를 삭제하면 404가 반환된다

### PHASE 2
- [o] GET 전체 조회가 score 내림차순으로 반환된다
- [o] GET 개별 조회로 특정 user_id의 점수를 조회할 수 있다
- [o] GET 개별 조회로 존재하지 않는 user_id를 조회하면 404가 반환된다
- [o] PUT으로 특정 user_id의 점수를 수정하면 DB에 반영된다
- [o] PUT으로 존재하지 않는 user_id를 수정하면 404가 반환된다


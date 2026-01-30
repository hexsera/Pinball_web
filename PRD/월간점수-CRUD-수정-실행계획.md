# 월간 점수 CRUD 수정 실행계획

## 요구사항 요약

**요구사항**: MonthlyScore 모델과 API를 수정하여 id를 제거하고 user_id를 PRIMARY KEY로 사용. POST API에서 기존 user_id가 있으면 더 큰 점수로 자동 갱신.

**목적**: 한 사용자당 하나의 월간 점수만 저장하고, 새로운 점수가 기존 점수보다 높을 때만 갱신하여 월간 최고 점수를 유지.

## 현재상태 분석

**MonthlyScore 모델 (models.py:44-50)**:
- id가 PRIMARY KEY로 설정되어 있음 (AUTO_INCREMENT)
- user_id는 일반 컬럼 (중복 가능)
- 동일 사용자가 여러 월간 점수를 저장할 수 있는 구조

**MonthlyScore API (main.py:497-606)**:
- 현재 메모리 기반 (monthly_scores 리스트)
- POST는 Upsert 방식 (기존 user_id 있으면 무조건 덮어씀)
- 점수 비교 로직 없음 (새 점수가 낮아도 덮어씀)

## 구현 방법

**메모리 기반 API 유지**:
- DB 연결 없이 현재 메모리 기반 (monthly_scores 리스트) 유지
- id 필드 제거 (user_id를 식별자로 사용)
- monthly_score_id_counter 제거 (id 생성 불필요)

**API 로직 수정**:
- POST API에서 기존 user_id 조회
- 기존 점수와 새 점수 비교
- 새 점수가 더 크면 UPDATE, 낮으면 기존 점수 유지, 없으면 INSERT

## 구현 단계

### 1. Pydantic 스키마 수정 (MonthlyScoreResponse)

```python
class MonthlyScoreResponse(BaseModel):
    """월간 점수 응답"""
    user_id: int
    score: int
    created_at: datetime

    class Config:
        from_attributes = True
```

- **무엇을 하는가**: 응답 스키마에서 id 필드 제거 (user_id가 식별자 역할)
- id 필드 삭제
- user_id가 고유 식별자로 사용됨

### 2. POST API 로직 수정 (점수 비교 추가)

```python
@app.post("/api/v1/monthly-scores", response_model=MonthlyScoreResponse)
def create_or_update_monthly_score(score_data: MonthlyScoreCreateRequest):
    """월간 점수 생성 또는 수정 (최고 점수만 저장)"""
    # 기존 레코드 검색
    existing_score = next(
        (s for s in monthly_scores if s["user_id"] == score_data.user_id),
        None
    )

    if existing_score:
        # 새 점수가 기존 점수보다 큰 경우에만 업데이트
        if score_data.score > existing_score["score"]:
            existing_score["score"] = score_data.score
        # 새 점수가 작거나 같으면 기존 점수 유지
        return existing_score
    else:
        # 생성: 새 레코드 추가 (id 필드 없음)
        new_score = {
            "user_id": score_data.user_id,
            "score": score_data.score,
            "created_at": datetime.now()
        }
        monthly_scores.append(new_score)
        return new_score
```

- **무엇을 하는가**: 기존 점수와 새 점수를 비교하여 더 큰 점수로만 갱신
- 메모리 리스트에서 user_id로 기존 레코드 검색
- `score_data.score > existing_score["score"]` 조건으로 점수 비교
- 조건 충족 시에만 UPDATE, 미충족 시 기존 점수 유지
- id 필드 제거 (user_id가 식별자 역할)



### 7. monthly_score_id_counter 변수 제거

```python
# main.py 상단의 다음 라인 삭제
monthly_score_id_counter: int = 0
```

- **무엇을 하는가**: id 필드를 제거했으므로 id 생성 카운터 불필요
- 37번 줄 삭제
- monthly_scores 리스트는 유지 (메모리 저장소로 계속 사용)

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| fastapi/main.py | 수정 | MonthlyScoreResponse 스키마: id 필드 제거 |
| fastapi/main.py | 수정 | POST /api/v1/monthly-scores: 점수 비교 로직 추가, id 필드 제거 |
| fastapi/main.py | 수정 | monthly_score_id_counter 변수 제거 |

## 완료 체크리스트

- [o] POST /api/v1/monthly-scores 호출 시 기존 점수보다 높은 점수만 갱신됨
- [o] POST /api/v1/monthly-scores 호출 시 기존 점수보다 낮은 점수는 무시됨 (기존 점수 유지)
- [o] POST /api/v1/monthly-scores로 생성된 레코드에 id 필드가 없음 (user_id, score, created_at만 있음)
- [o] 동일 user_id로 여러 월간 점수를 저장할 수 없음 (메모리 리스트에서 중복 방지)
- [o] GET /api/v1/monthly-scores로 전체 월간 점수 조회 가능 (메모리 기반)
- [o] GET /api/v1/monthly-scores/{user_id}로 특정 사용자 점수 조회 가능
- [o] PUT /api/v1/monthly-scores/{user_id}로 점수 수정 가능
- [o] DELETE /api/v1/monthly-scores/{user_id}로 점수 삭제 가능
- [o] FastAPI 서버가 에러 없이 실행됨


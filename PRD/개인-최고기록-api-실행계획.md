# 개인 최고기록 API 구현 계획 (TDD)

## Context

사용자가 PRD 문서(`/home/hexsera/Pinball_web/PRD/개인 최고기록 api.md`)를 기반으로 개인 최고기록 저장 API를 요청했습니다.

**요구사항**:
- 경로: `/api/v1/high-scores` (RESTful)
- 메서드: POST만 구현
- 목적: 개인용 최고 기록 저장

**현재 상황**:
- 프로젝트에는 이미 `/api/v1/scores` 엔드포인트가 존재 (모든 점수 기록)
- `/api/v1/monthly-scores` 엔드포인트도 존재 (월간 최고 점수, 업데이트 로직 포함)
- 새로운 `/api/v1/high-scores`는 **개인의 역대 최고 기록**을 저장하는 용도

**TDD 접근**:
- 사용자가 TDD 스킬을 명시적으로 요청
- RED 단계에서 테스트 파일 작성 전 사용자 승인 필요
- 모든 프로덕션 코드 작성 전 실패하는 테스트를 먼저 작성

## Implementation Plan

### Phase 1: RED - 실패하는 테스트 작성

**테스트 파일 생성**: `/home/hexsera/Pinball_web/backend/tests/test_high_scores.py`

**테스트 케이스**:

1. **test_create_high_score_success**
   - 목적: 최초 최고 기록 생성 성공 케이스
   - 검증: 201 Created, user_id/score/created_at 반환

2. **test_create_high_score_updates_if_higher**
   - 목적: 기존 점수보다 높은 점수로 업데이트
   - 전제: user_id=1, score=1000인 기록 존재
   - 요청: user_id=1, score=1500
   - 검증: score가 1500으로 업데이트됨

3. **test_create_high_score_keeps_existing_if_lower**
   - 목적: 기존 점수보다 낮으면 기존 점수 유지
   - 전제: user_id=1, score=2000인 기록 존재
   - 요청: user_id=1, score=1000
   - 검증: score가 2000 그대로 유지됨

4. **test_create_high_score_without_user_id**
   - 목적: user_id 필수 검증
   - 요청: user_id 없이 score만 전송
   - 검증: 422 Unprocessable Entity

**API 스펙 (테스트 기반)**:
```python
# Request
{
    "user_id": int,
    "score": int
}

# Response (201 Created)
{
    "user_id": int,
    "score": int,
    "created_at": datetime
}
```

### Phase 2: RED 검증 - 테스트 실패 확인

```bash
cd backend && pytest tests/test_high_scores.py -v
```

**기대 결과**:
- 모든 테스트가 FAIL (endpoint 미구현으로 404 또는 ImportError)
- 에러가 아닌 실패여야 함
- 실패 이유: `/api/v1/high-scores` 엔드포인트가 존재하지 않음

### Phase 3: Database Model 추가 (필요 시)

**파일**: `/home/hexsera/Pinball_web/backend/models.py`

기존 `Score`, `MonthlyScore` 테이블과 구분되는 `HighScore` 모델 추가:

```python
class HighScore(Base):
    __tablename__ = "high_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, nullable=False, index=True)  # UNIQUE: 한 사용자당 하나의 레코드
    score = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
```

**특징**:
- `user_id`에 UNIQUE 제약: 한 사용자당 하나의 최고 기록만 유지
- `updated_at`: 점수 갱신 시각 추적

### Phase 4: GREEN - Pydantic 스키마 추가

**파일**: `/home/hexsera/Pinball_web/backend/main.py`

```python
class HighScoreCreateRequest(BaseModel):
    """최고 기록 생성 요청"""
    user_id: int
    score: int

class HighScoreResponse(BaseModel):
    """최고 기록 응답"""
    user_id: int
    score: int
    created_at: datetime

    class Config:
        from_attributes = True
```

### Phase 5: GREEN - 엔드포인트 구현

**파일**: `/home/hexsera/Pinball_web/backend/main.py`

```python
@app.post("/api/v1/high-scores", response_model=HighScoreResponse, status_code=201)
def create_or_update_high_score(
    score_data: HighScoreCreateRequest,
    db: Session = Depends(get_db)
):
    """개인 최고 기록 생성 또는 업데이트"""
    existing_record = db.query(HighScore).filter(
        HighScore.user_id == score_data.user_id
    ).first()

    if existing_record:
        # 기존 기록보다 높으면 업데이트
        if score_data.score > existing_record.score:
            existing_record.score = score_data.score
            db.commit()
            db.refresh(existing_record)
        # 낮거나 같으면 기존 기록 반환
        return existing_record
    else:
        # 새로운 최고 기록 생성
        new_record = HighScore(
            user_id=score_data.user_id,
            score=score_data.score
        )
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        return new_record
```

**구현 로직**:
1. user_id로 기존 기록 조회
2. 기존 기록이 있고 새 점수가 더 높으면: UPDATE
3. 기존 기록이 있고 새 점수가 낮거나 같으면: 기존 기록 반환
4. 기존 기록이 없으면: INSERT

### Phase 6: GREEN 검증 - 테스트 통과 확인

```bash
cd backend && pytest tests/test_high_scores.py -v
```

**기대 결과**:
- 모든 테스트 PASS
- 출력에 에러, 경고 없음
- 각 테스트가 예상된 시나리오 검증

### Phase 7: REFACTOR - 코드 정리

1. **중복 제거**: MonthlyScore와 유사한 로직이지만 목적이 다르므로 그대로 유지
2. **이름 개선**: 변수/함수명이 명확한지 확인
3. **주석 추가**: 필요 시 비즈니스 로직 설명 추가

### Phase 8: 완료 체크리스트 확인

- [ ] 모든 새 함수/메서드에 테스트가 존재한다
- [ ] 각 테스트의 실패를 확인한 후 구현했다
- [ ] 각 테스트가 예상된 이유로 실패했다 (기능 미구현)
- [ ] 각 테스트를 통과하는 최소한의 코드만 작성했다
- [ ] 모든 테스트가 통과한다
- [ ] 출력에 에러, 경고가 없다
- [ ] 테스트가 실제 코드를 사용한다
- [ ] 엣지 케이스와 에러 상황을 포함한다

## Critical Files

- `/home/hexsera/Pinball_web/backend/tests/test_high_scores.py` - 테스트 파일 (새로 생성)
- `/home/hexsera/Pinball_web/backend/models.py` - HighScore 모델 추가
- `/home/hexsera/Pinball_web/backend/main.py` - API 엔드포인트 및 스키마 추가

## Verification

**테스트 실행**:
```bash
# 특정 테스트 실행
cd backend && pytest tests/test_high_scores.py -v

# 전체 테스트 실행 (회귀 방지)
cd backend && pytest -v
```

**수동 테스트** (선택 사항):
```bash
# 최초 기록 생성
curl -X POST "http://localhost:8000/api/v1/high-scores" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": 1000}'

# 더 높은 점수로 업데이트
curl -X POST "http://localhost:8000/api/v1/high-scores" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": 1500}'

# 낮은 점수로 시도 (기존 점수 유지)
curl -X POST "http://localhost:8000/api/v1/high-scores" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": 500}'
```

## Notes

- **MonthlyScore와의 차이점**:
  - MonthlyScore: 월간 랭킹용 (매월 초기화 가능)
  - HighScore: 개인 역대 최고 기록 (영구 보존)

- **Score와의 차이점**:
  - Score: 모든 게임 플레이 기록 저장
  - HighScore: 최고 기록만 저장 (한 사용자당 하나)

- **TDD 준수**:
  - 절대 법칙: 실패하는 테스트 없이 프로덕션 코드 작성 금지
  - 각 단계에서 테스트 실행 결과 확인 필수

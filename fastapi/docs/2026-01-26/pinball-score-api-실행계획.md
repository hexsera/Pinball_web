# 핀볼 게임 점수 저장 API 실행 계획

## 개요

이 문서는 [pinball-score-api.md](./pinball-score-api.md) PRD를 기반으로 작성된 실행 계획입니다.

**목표**: POST /api/v1/scores 엔드포인트 구현 (콘솔 출력만)

**특징**:
- DB 저장 없음
- DB 의존성 없음
- Score 모델 불필요
- 요청 데이터를 콘솔에 print만 수행

## 실행 단계

### Step 1: 현재 코드 확인

**목적**: 기존 코드 구조 파악

**작업**:
1. `fastapi/main.py` 확인
   - 기존 import 구조 파악
   - 기존 Pydantic 스키마 위치 확인
   - FastAPI app 인스턴스 확인

**예상 결과**:
- main.py 구조 파악 완료 → Step 2로 진행

---

### Step 2: Pydantic 스키마 추가

**파일**: `fastapi/main.py`

**작업**:
1. ScoreCreateRequest 스키마 추가
   ```python
   class ScoreCreateRequest(BaseModel):
       user_id: int
       score: int
   ```

2. ScoreResponse 스키마 추가
   ```python
   class ScoreResponse(BaseModel):
       message: str
       user_id: int
       score: int
   ```

**위치**: 기존 Pydantic 스키마 클래스들 다음 (UserResponse, LoginResponse 등 다음)

**검증**: Python 문법 오류 없이 정의되었는지 확인

---

### Step 3: POST /api/v1/scores 엔드포인트 구현

**파일**: `fastapi/main.py`

**작업**:
1. 엔드포인트 함수 추가 (기존 엔드포인트 다음, 파일 끝 부분)
   ```python
   @app.post("/api/v1/scores", response_model=ScoreResponse)
   def create_score(score_request: ScoreCreateRequest):
       """점수 수신 엔드포인트 (콘솔 출력만)"""

       # 콘솔에 출력
       print(f"Score received - user_id: {score_request.user_id}, score: {score_request.score}")

       # 응답 반환
       return ScoreResponse(
           message="Score received",
           user_id=score_request.user_id,
           score=score_request.score
       )
   ```

**위치**: 기존 POST /api/v1/register 엔드포인트 다음

**주의사항**:
- 매우 단순한 엔드포인트 (유효성 검증 없음)
- DB 의존성 없음
- 외부 모델 import 불필요

---

### Step 4: FastAPI 재시작

**작업**:
```bash
docker compose restart fastapi
```

**검증**:
```bash
# 로그 확인
docker compose logs -f fastapi

# 에러 없이 시작되었는지 확인
# "Application startup complete" 메시지 확인
```

**예상 문제**:
- 문법 오류: 코드 작성 실수

---

### Step 5: API 테스트 (정상 케이스)

**작업**:
```bash
# 1. 점수 전송 API 호출
curl -X POST http://localhost:8000/api/v1/scores \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": 15000}'
```

**예상 응답** (200 OK):
```json
{
  "message": "Score received",
  "user_id": 1,
  "score": 15000
}
```

**검증**:
- 상태 코드 200 확인
- 응답 JSON 구조 확인
- message 필드 확인

---

### Step 6: 콘솔 출력 확인

**작업**:
```bash
# FastAPI 로그 확인
docker compose logs fastapi | tail -n 20
```

**예상 출력**:
```
Score received - user_id: 1, score: 15000
```

**검증**:
- print 문이 콘솔에 정확히 출력되었는지 확인
- user_id, score 값 일치 확인

---


### Step 7: Swagger UI 확인

**작업**:
1. 브라우저에서 접속: `http://localhost:8000/docs`
2. POST /api/v1/scores 엔드포인트 확인
3. "Try it out" 클릭하여 테스트
4. 요청/응답 스키마 확인

**검증**:
- 엔드포인트가 Swagger UI에 표시되는지 확인
- ScoreCreateRequest 스키마가 올바르게 표시되는지 확인
- ScoreResponse 스키마가 올바르게 표시되는지 확인

---

### Step 8: 추가 테스트 (다양한 데이터)

**작업**:
```bash
# 테스트 케이스 1: 작은 점수
curl -X POST http://localhost:8000/api/v1/scores \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": 0}'

# 테스트 케이스 2: 큰 점수
curl -X POST http://localhost:8000/api/v1/scores \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": 999999}'

# 테스트 케이스 3: 다른 사용자
curl -X POST http://localhost:8000/api/v1/scores \
  -H "Content-Type: application/json" \
  -d '{"user_id": 2, "score": 5000}'

# 테스트 케이스 4: 음수 점수 (유효성 검증 없으므로 허용됨)
curl -X POST http://localhost:8000/api/v1/scores \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": -1000}'
```

**검증**:
- 모든 케이스가 200 OK 반환
- 콘솔에 각 데이터가 출력됨

---

## 예상 문제 및 해결 방안

### 문제 1: FastAPI 재시작 후 에러

**확인 사항**:
1. 로그 확인: `docker compose logs fastapi`
2. 문법 오류 확인

---

## 완료 체크리스트

- [o] Step 1: 현재 코드 확인 완료
- [o] Step 2: Pydantic 스키마 추가 완료
- [o] Step 3: POST 엔드포인트 구현 완료
- [o] Step 4: FastAPI 재시작 성공
- [o] Step 5: API 테스트 (정상 케이스) 성공
- [o] Step 6: 콘솔 출력 확인 성공
- [o] Step 7: Swagger UI 확인 완료
- [o] Step 8: 추가 테스트 성공

## 최종 검증

모든 단계 완료 후:

1. **API 동작 확인**:
   - POST /api/v1/scores가 정상 동작
   - 200 OK 반환
   - 콘솔에 데이터 출력

2. **코드 품질 확인**:
   - 기존 코드 스타일과 일관성 유지
   - 주석 적절히 작성

3. **단순성 확인**:
   - 유효성 검증 없음
   - 최소한의 코드로 구현
   - print문만으로 동작 확인 가능

## 참고 문서

- [PRD: pinball-score-api.md](./pinball-score-api.md)
- [FastAPI 엔드포인트 구조](./user-crud-mysql.md)
- [SQLAlchemy 사용 방법](./SQLAlchemy-사용방법과-작동과정.md)

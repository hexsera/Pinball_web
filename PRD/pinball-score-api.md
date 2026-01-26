# 핀볼 게임 점수 저장 API PRD

## 개요

핀볼 게임에서 발생하는 점수를 받아서 콘솔에 출력하는 API를 구현합니다. 게임 종료 시 최종 점수를 전달받습니다.

**범위**:
- DB 저장은 하지 않습니다. 요청 데이터를 콘솔에 출력만 합니다.
- 점수 조회 기능은 이 PRD에서 다루지 않습니다.

## 배경

### 현재 상태
- Pinball.jsx: Matter.js 기반 핀볼 게임 구현 완료
- 범퍼 충돌 감지 구현 (`collisionStart` 이벤트)
- **점수 시스템 미구현**: 충돌 시 로그만 출력 (`console.log('Bumper hit!')`)
- 사용자 인증 시스템 구현 완료 (로그인, 회원가입)

### 필요성
- 게임 결과 데이터 수집 및 보관
- 향후 랭킹 시스템 구현을 위한 데이터 기반 마련
- 사용자별 게임 플레이 기록 관리

## 기능 요구사항

### API 엔드포인트

#### 점수 저장 (게임 종료 시)
```
POST /api/v1/scores
```

**요청 본문**:
```json
{
  "user_id": 1,
  "score": 15000
}
```

**응답** (200 OK):
```json
{
  "message": "Score received",
  "user_id": 1,
  "score": 15000
}
```

**동작**:
- 요청 데이터를 콘솔에 출력: `print(f"Score received - user_id: {user_id}, score: {score}")`
- DB 저장은 하지 않음

**비고**:
- 단순히 점수 데이터를 받아서 콘솔에 출력만 함

## API 상세 명세

### Pydantic 스키마

```python
# 점수 저장 요청
class ScoreCreateRequest(BaseModel):
    user_id: int
    score: int

# 점수 응답
class ScoreResponse(BaseModel):
    message: str
    user_id: int
    score: int
```

## POST /api/v1/scores 엔드포인트 구현

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

## 에러 처리

| 상황 | 상태 코드 | 메시지 |
|------|----------|--------|
| 서버 오류 | 500 | Internal server error |

**비고**: 유효성 검증은 수행하지 않습니다.

## 테스트 계획

### API 테스트 (curl)

```bash
# 점수 저장
curl -X POST http://localhost:8000/api/v1/scores \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "score": 15000}'
```

### 콘솔 출력 확인
```bash
# FastAPI 로그 확인
docker compose logs -f fastapi

# 출력 예시:
# Score received - user_id: 1, score: 15000
```

## 구현 순서

### 1. Pydantic 스키마 추가 (main.py)
```python
class ScoreCreateRequest(BaseModel):
    user_id: int
    score: int

class ScoreResponse(BaseModel):
    message: str
    user_id: int
    score: int
```

### 2. POST /api/v1/scores 엔드포인트 구현 (main.py)
위의 "POST /api/v1/scores 엔드포인트 구현" 섹션 참조

### 3. 테스트 및 검증
1. API 단독 테스트 (curl)
2. 콘솔 출력 확인 (docker logs)

## 향후 확장 계획

점수 조회 기능은 별도 PRD로 작성 예정:
- 개인 최고 점수 조회 (GET /api/v1/scores/my-best)
- 개인 게임 기록 조회 (GET /api/v1/scores/my-history)
- 전체 랭킹 조회 (GET /api/v1/scores/ranking)
- Admin 사용자별 점수 조회

## 참고 문서

- [FastAPI 엔드포인트 구조](./user-crud-mysql.md)

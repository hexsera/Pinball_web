# 친구 신청 API DB 연결 실행계획

## 요구사항 요약

**요구사항**: `POST /api/friend-requests` 엔드포인트만 수정하여 데이터를 `friendships` 테이블에 영구 저장

**목적**: 현재는 친구 요청 생성 시 메모리(`friend_requests` 리스트)에만 저장되어 서버 재시작 시 사라집니다. 이 엔드포인트만 먼저 DB에 저장하도록 수정합니다.

## 현재상태 분석

**현재 구조**:
- `main.py`의 `friend_requests: List[dict] = []` 메모리 리스트에 임시 저장
- `POST /api/friend-requests` 엔드포인트가 메모리 리스트에 데이터 추가
- 다른 3개 엔드포인트(GET, accept, reject)는 이번 작업 범위에서 제외

**DB 테이블 존재**:
- `models.py`에 `Friendship` 모델이 이미 정의되어 있음
- 테이블 구조: `id`, `requester_id`, `addressee_id`, `status`, `created_at`
- `status` 기본값: `'pending'`

**문제점**:
- 현재 API는 `id`와 `requester_id`만 사용하지만, DB 테이블은 `requester_id`(요청자)와 `addressee_id`(수신자)로 구분
- API 스키마와 DB 스키마가 불일치

## 구현 방법

**기술 스택**: SQLAlchemy ORM을 사용하여 `Friendship` 모델과 DB 연동

**주요 변경사항**:
1. `POST /api/friend-requests` 엔드포인트만 수정
2. 메모리 리스트 append 대신 DB에 Friendship 레코드 생성
3. API 스키마를 DB 테이블 구조에 맞게 수정 (`id` → `addressee_id`)
4. SQLAlchemy Session 주입 (`Depends(get_db)`)

**주의사항**:
- 보안은 고려하지 않음 (PRD 요구사항)
- API Key 인증 불필요
- 메모리 리스트는 유지 (다른 엔드포인트가 아직 사용 중)
- DB와 메모리 양쪽에 모두 저장 (과도기적 구조)

## 구현 단계

### 1. API 스키마 수정 (main.py)

**변경 전**:
```python
class FriendRequestRequest(BaseModel):
    id: int
    requester_id: int
```

**변경 후**:
```python
class FriendRequestRequest(BaseModel):
    addressee_id: int    # 친구 요청을 받는 사람
    requester_id: int    # 친구 요청을 보내는 사람
```

**기타 스키마 변경**:
- `FriendRequestResponse`: `id` → `addressee_id`

### 2. POST /api/friend-requests 수정 (main.py:337)

**변경 전**: 메모리 리스트에만 dict 추가
```python
@app.post("/api/friend-requests", response_model=FriendRequestResponse)
def create_friend_request(request: FriendRequestRequest):
    """친구 추가 요청을 받는 엔드포인트 (메모리에 저장)"""

    # 친구 요청 데이터 생성
    friend_request_data = {
        "id": request.id,
        "requester_id": request.requester_id,
        "status": "pending"
    }

    # 메모리에 저장
    friend_requests.append(friend_request_data)

    # 콘솔에 출력
    print(f"친구 요청 저장됨: {request.id} -> {request.requester_id}")

    # 응답 반환
    return FriendRequestResponse(
        message="Friend request received",
        id=request.id,
        requester_id=request.requester_id
    )
```

**변경 후**: DB와 메모리 양쪽 모두에 저장
```python
@app.post("/api/friend-requests", response_model=FriendRequestResponse)
def create_friend_request(request: FriendRequestRequest, db: Session = Depends(get_db)):
    """친구 추가 요청을 받는 엔드포인트 (DB와 메모리에 저장)"""

    # 1. DB에 Friendship 레코드 생성
    db_friendship = Friendship(
        requester_id=request.requester_id,
        addressee_id=request.addressee_id,
        status="pending"
    )
    db.add(db_friendship)
    db.commit()
    db.refresh(db_friendship)

    # 2. 메모리에도 저장 (다른 엔드포인트 호환성 유지)
    friend_request_data = {
        "id": request.addressee_id,
        "requester_id": request.requester_id,
        "status": "pending"
    }
    friend_requests.append(friend_request_data)

    print(f"친구 요청 저장됨 (DB+메모리): {request.requester_id} -> {request.addressee_id}")

    return FriendRequestResponse(
        message="Friend request received",
        addressee_id=db_friendship.addressee_id,
        requester_id=db_friendship.requester_id
    )
```

### 3. models.py import 추가 (main.py:7)

**변경 전**:
```python
from models import User, Score
```

**변경 후**:
```python
from models import User, Score, Friendship
```

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| fastapi/main.py | 수정 | Friendship 모델 import, FriendRequestRequest/Response 스키마 수정, POST /api/friend-requests 엔드포인트 DB 연동 |

## 완료 체크리스트

- [o] POST /api/friend-requests로 친구 요청 생성 시 DB의 friendships 테이블에 레코드가 추가되는지 확인
- [o] POST /api/friend-requests로 생성한 데이터가 메모리 리스트에도 저장되는지 확인 (다른 엔드포인트 호환성)
- [o] FastAPI 서버 재시작 후 DB에 저장된 데이터가 유지되는지 확인 (영구 저장 확인)
- [o] Swagger UI (/docs)에서 POST /api/friend-requests 엔드포인트가 정상적으로 표시되는지 확인

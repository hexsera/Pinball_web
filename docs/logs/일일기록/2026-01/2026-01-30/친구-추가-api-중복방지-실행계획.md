# 친구 추가 API 중복 요청 방지 실행계획

## 요구사항 요약

**요구사항**:
1. 동일한 친구 추가 요청이 여러 번 생성되지 않도록 방지
2. A→B 친구 요청 후 B→A 역방향 요청이 불가능하도록 방지

**목적**:
데이터 무결성 확보 및 사용자 경험 개선. 중복 요청은 DB 낭비와 혼란을 야기하며, 양방향 요청은 친구 관계의 논리적 일관성을 해친다.

## 현재상태 분석

**Friendship 테이블 구조** (models.py:26-34):
- id, requester_id, receiver_id, status, created_at
- 제약조건 없음: 동일한 (requester_id, receiver_id) 조합 여러 번 생성 가능
- 양방향 검증 없음: A→B와 B→A 요청 동시 존재 가능

**친구 요청 생성 API** (main.py:377-399):
- 중복 검증 로직 없음
- 역방향 요청 검증 없음
- DB에 무조건 INSERT 수행

## 구현 방법

**해결 방법론**:
1. DB 레벨에서 UNIQUE 제약조건 추가하여 물리적 중복 방지 (가장 확실한 방법)
2. API 레벨에서 요청 생성 전 중복 검증 (사용자 친화적 에러 메시지)
3. 양방향 검증: (A, B) 또는 (B, A) 조합이 이미 존재하는지 확인
4. 기존 요청이 있으면 상태에 따라 적절한 에러 메시지 반환

**기술 스택**:
- SQLAlchemy: UniqueConstraint, CheckConstraint
- Alembic: 마이그레이션 파일 생성
- FastAPI: HTTPException으로 명확한 에러 처리

## 구현 단계

**실행 방식**: 이 계획은 2단계로 나누어 실행 가능
- **Phase 1 (단계 1-3)**: DB 마이그레이션 - 제약조건 추가
- **Phase 2 (단계 4-6)**: API 로직 수정 - 검증 로직 추가

각 Phase 완료 후 체크포인트에서 검증하고 다음 단계로 진행합니다.

---

## Phase 1: DB 마이그레이션 (단계 1-3)

### 1. Friendship 모델에 제약조건 추가

```python
from sqlalchemy import Column, Integer, String, DateTime, UniqueConstraint, CheckConstraint

class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, nullable=False, index=True)
    receiver_id = Column(Integer, nullable=False, index=True)
    status = Column(String(20), nullable=False, default='pending')
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)

    __table_args__ = (
        UniqueConstraint('requester_id', 'receiver_id', name='uq_friendship_pair'),
        CheckConstraint('requester_id != receiver_id', name='ck_no_self_friend'),
    )
```

- **무엇을 하는가**: DB 레벨에서 중복 방지 및 자기 자신 친구 추가 방지
- `UniqueConstraint`: (requester_id, receiver_id) 조합의 유일성 보장 (동일 요청 중복 방지)
- `CheckConstraint`: requester_id와 receiver_id가 같지 않도록 보장 (자기 자신 친구 추가 방지)
- DB에서 물리적으로 중복 차단 (가장 안전한 방법)

### 2. Alembic 마이그레이션 파일 생성

```bash
docker exec fastapi-server alembic revision --autogenerate -m "Add unique constraint to friendships table"
```

- **무엇을 하는가**: models.py 변경사항을 마이그레이션 파일로 자동 생성
- `--autogenerate`: SQLAlchemy 모델과 DB 스키마 차이를 자동 감지
- 생성된 파일에서 UniqueConstraint와 CheckConstraint 추가 코드 확인

### 3. 마이그레이션 적용

```bash
docker exec fastapi-server alembic upgrade head
```

- **무엇을 하는가**: 생성된 마이그레이션을 실제 MySQL DB에 적용
- friendships 테이블에 UNIQUE INDEX와 CHECK 제약조건 추가
- 기존 데이터가 제약조건 위반 시 에러 발생 (수동 정리 필요)

---

## 🔍 Phase 1 체크포인트

**실행 명령**:
```bash
# UNIQUE 제약조건 확인
docker exec mysql-server mysql -u hexsera -phexpoint hexdb -e "SHOW INDEX FROM friendships;"

# CHECK 제약조건 확인 (MySQL 8.0.16+)
docker exec mysql-server mysql -u hexsera -phexpoint hexdb -e "SHOW CREATE TABLE friendships;"

# 현재 마이그레이션 버전 확인
docker exec fastapi-server alembic current
```

**Phase 1 완료 체크리스트**:
- [o] friendships 테이블에 `uq_friendship_pair` UNIQUE INDEX가 존재하는지 확인
- [o] friendships 테이블에 `ck_no_self_friend` CHECK 제약조건이 존재하는지 확인
- [o] Alembic 마이그레이션이 최신 버전(head)으로 적용되었는지 확인
- [o] FastAPI 서버가 에러 없이 재시작되는지 확인 (`docker compose restart fastapi`)
- [o] 기존 친구 요청 데이터가 제약조건 위반 없이 유지되는지 확인

**Phase 1 실패 시 롤백**:
```bash
# 이전 마이그레이션 버전으로 롤백
docker exec fastapi-server alembic downgrade -1

# models.py의 __table_args__ 제거 후 다시 시도
```

**다음 단계**: Phase 1 체크포인트를 모두 통과하면 Phase 2로 진행합니다.

---

## Phase 2: API 로직 수정 (단계 4-6)

### 4. 친구 요청 생성 API 수정 (중복 검증 추가)

```python
@app.post("/api/friend-requests", response_model=FriendRequestResponse)
def create_friend_request(request: FriendRequestRequest, db: Session = Depends(get_db)):
    """친구 추가 요청 (중복 및 역방향 검증)"""

    # 자기 자신에게 친구 요청 방지
    if request.requester_id == request.receiver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send friend request to yourself"
        )

    # 중복 검증: A→B 요청이 이미 존재하는지 확인
    existing_request = db.query(Friendship).filter(
        Friendship.requester_id == request.requester_id,
        Friendship.receiver_id == request.receiver_id
    ).first()

    if existing_request:
        if existing_request.status == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Friend request already sent"
            )
        elif existing_request.status == "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already friends"
            )
        elif existing_request.status == "rejected":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Friend request was rejected"
            )

    # 역방향 검증: B→A 요청이 이미 존재하는지 확인
    reverse_request = db.query(Friendship).filter(
        Friendship.requester_id == request.receiver_id,
        Friendship.receiver_id == request.requester_id
    ).first()

    if reverse_request:
        if reverse_request.status == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This user already sent you a friend request. Please accept or reject it first."
            )
        elif reverse_request.status == "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already friends"
            )

    # 모든 검증 통과 시 친구 요청 생성
    db_friendship = Friendship(
        requester_id=request.requester_id,
        receiver_id=request.receiver_id,
        status="pending"
    )
    db.add(db_friendship)
    db.commit()
    db.refresh(db_friendship)

    print(f"친구 요청 생성됨: {request.requester_id} -> {request.receiver_id}")

    return FriendRequestResponse(
        message="Friend request sent successfully",
        receiver_id=db_friendship.receiver_id,
        requester_id=db_friendship.requester_id
    )
```

- **무엇을 하는가**: 친구 요청 생성 전 모든 중복 케이스 검증
- 자기 자신 친구 요청 방지 (API 레벨 검증)
- 동일 요청 중복 검증: A→B 요청이 이미 존재하면 상태별 적절한 메시지 반환
- 역방향 요청 검증: B→A 요청이 pending이면 "먼저 수락/거절하라"는 메시지 반환
- DB 제약조건과 이중 안전장치 구성 (API 검증 + DB 제약)

### 5. GET /api/friend-requests 수정 (DB 조회로 변경)

```python
@app.get("/api/friend-requests", response_model=FriendRequestListResponse)
def get_friend_requests(user_id: int, db: Session = Depends(get_db)):
    """특정 사용자가 받은 친구 요청 조회 (DB 연동)"""
    # DB에서 receiver_id가 user_id인 pending 요청 조회
    requests = db.query(Friendship).filter(
        Friendship.receiver_id == user_id,
        Friendship.status == "pending"
    ).all()

    # FriendRequestData 형식으로 변환
    request_data = [
        FriendRequestData(
            id=req.id,
            requester_id=req.requester_id,
            status=req.status
        )
        for req in requests
    ]

    return FriendRequestListResponse(requests=request_data)
```

- **무엇을 하는가**: 메모리 배열 대신 DB에서 실제 데이터 조회
- receiver_id가 user_id이고 status가 pending인 요청만 필터링
- main.py:33의 빈 메모리 배열 참조 제거
- DB와 API의 데이터 일관성 확보

### 6. 메모리 저장소 제거

```python
# main.py:32-36 삭제
# 친구 요청 메모리 저장소 (임시) - 삭제
# friend_requests: List[dict] = []

# 월간 점수 메모리 저장소 (임시) - 유지 (별도 마이그레이션 필요)
monthly_scores: List[dict] = []
```

- **무엇을 하는가**: 사용하지 않는 friend_requests 메모리 배열 제거
- DB가 단일 진실 소스(Single Source of Truth)가 되도록 정리
- monthly_scores는 아직 DB 마이그레이션 전이므로 유지

---

## 🔍 Phase 2 체크포인트

**Phase 2 완료 체크리스트**:
- [o] 동일한 친구 요청을 2번 보내면 "Friend request already sent" 에러 발생 확인
- [x] A→B 요청 후 B→A 요청 시 "already sent you a friend request" 에러 발생 확인
- [o] 자기 자신에게 친구 요청 시 "Cannot send friend request to yourself" 에러 발생 확인


**Phase 2 테스트 시나리오**:
```bash
# 시나리오 1: 동일 요청 중복 방지
curl -X POST http://localhost:8000/api/friend-requests \
  -H "Content-Type: application/json" \
  -d '{"requester_id": 1, "receiver_id": 2}'
# 다시 동일 요청 (에러 발생 예상)
curl -X POST http://localhost:8000/api/friend-requests \
  -H "Content-Type: application/json" \
  -d '{"requester_id": 1, "receiver_id": 2}'

# 시나리오 2: 역방향 요청 방지
curl -X POST http://localhost:8000/api/friend-requests \
  -H "Content-Type: application/json" \
  -d '{"requester_id": 2, "receiver_id": 1}'

# 시나리오 3: 자기 자신 친구 요청
curl -X POST http://localhost:8000/api/friend-requests \
  -H "Content-Type: application/json" \
  -d '{"requester_id": 1, "receiver_id": 1}'

# 시나리오 4: 친구 요청 조회
curl http://localhost:8000/api/friend-requests?user_id=2
```

**Phase 2 실패 시 롤백**:
- Git으로 main.py 변경사항 되돌리기
- Phase 1 DB 제약조건은 유지 (DB 무결성은 보장됨)

---

## 수정/생성할 파일 목록

**Phase 1**:
| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| fastapi/models.py | 수정 | Friendship 모델에 UniqueConstraint, CheckConstraint 추가 |
| fastapi/alembic/versions/xxxx.py | 생성 | 마이그레이션 파일 자동 생성 (alembic revision) |

**Phase 2**:
| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| fastapi/main.py:377-399 | 수정 | create_friend_request 함수에 중복 및 역방향 검증 로직 추가 |
| fastapi/main.py:402-411 | 수정 | get_friend_requests 함수를 DB 조회로 변경 |
| fastapi/main.py:32-36 | 수정 | friend_requests 메모리 배열 제거 |

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| fastapi/models.py | 수정 | Friendship 모델에 UniqueConstraint, CheckConstraint 추가 |
| fastapi/alembic/versions/xxxx.py | 생성 | 마이그레이션 파일 자동 생성 (alembic revision) |
| fastapi/main.py:377-399 | 수정 | create_friend_request 함수에 중복 및 역방향 검증 로직 추가 |
| fastapi/main.py:402-411 | 수정 | get_friend_requests 함수를 DB 조회로 변경 |
| fastapi/main.py:32-36 | 수정 | friend_requests 메모리 배열 제거 |

## 🎯 전체 완료 체크리스트

**DB 레벨 (Phase 1)**:
- [ ] Friendship 테이블에 `uq_friendship_pair` UNIQUE 제약조건이 추가되었는지 확인
- [ ] Friendship 테이블에 `ck_no_self_friend` CHECK 제약조건이 추가되었는지 확인
- [ ] Alembic 마이그레이션이 성공적으로 적용되었는지 확인

**API 레벨 (Phase 2)**:
- [ ] 동일한 친구 요청을 2번 보내면 "Friend request already sent" 에러가 발생하는지 확인
- [ ] A→B 요청 후 B→A 요청 시 "already sent you a friend request" 에러가 발생하는지 확인
- [ ] 자기 자신에게 친구 요청 시 "Cannot send friend request to yourself" 에러가 발생하는지 확인
- [ ] pending 상태 중복 요청 시 적절한 에러 메시지 반환 확인
- [ ] accepted 상태 중복 요청 시 "Already friends" 에러 반환 확인
- [ ] rejected 상태 중복 요청 시 "Friend request was rejected" 에러 반환 확인

**통합 테스트**:
- [ ] GET /api/friend-requests가 DB에서 실제 pending 요청을 반환하는지 확인
- [ ] 기존 친구 요청 승인/거절 기능이 정상 동작하는지 확인
- [ ] Docker 재시작 후에도 친구 요청 데이터가 유지되는지 확인 (메모리 의존 제거 확인)
- [ ] FastAPI Swagger UI(/docs)에서 모든 엔드포인트가 에러 없이 표시되는지 확인

**안전성 검증**:
- [ ] 프로덕션 환경에 배포 전 백업 수행 (friendships 테이블)
- [ ] 기존 중복 데이터가 있다면 수동 정리 완료

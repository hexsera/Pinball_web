# 친구 관리 API CRUD 형식 변경 실행 계획

## 목적

현재 친구 관리 API를 User CRUD API와 동일한 CRUD 형식으로 변경하여 코드의 통일성을 유지한다.

## 현재 상황 분석

### 현재 친구 관리 API 구조

| 메서드 | 경로 | 설명 | CRUD 매핑 |
|--------|------|------|----------|
| POST | /api/friend-requests | 친구 요청 생성 | ✅ Create |
| GET | /api/friend-requests?user_id={id} | 친구 요청 조회 (쿼리 파라미터) | ⚠️ Read (비표준) |
| POST | /api/friend-requests/accept | 친구 요청 승인 | ⚠️ Update (비표준) |
| POST | /api/friend-requests/reject | 친구 요청 거절 | ⚠️ Update (비표준) |

**문제점**:
1. 조회 API가 쿼리 파라미터 사용 (RESTful 경로 파라미터와 불일치)
2. 승인/거절이 별도 엔드포인트 (CRUD의 Update와 불일치)
3. 삭제(Delete) 기능 없음
4. 단일 친구 요청 조회 기능 없음

### User CRUD API 구조 (참고)

| 메서드 | 경로 | 설명 | CRUD |
|--------|------|------|------|
| POST | /api/v1/users | 사용자 생성 | Create |
| GET | /api/v1/users | 전체 사용자 조회 | Read (List) |
| GET | /api/v1/users/{user_id} | 특정 사용자 조회 | Read (Detail) |
| PUT | /api/v1/users/{user_id} | 사용자 수정 | Update |
| DELETE | /api/v1/users/{user_id} | 사용자 삭제 | Delete |

## 변경 목표: RESTful CRUD API

### 변경 후 친구 관리 API 구조

| 메서드 | 경로 | 설명 | CRUD | 변경 사항 |
|--------|------|------|------|----------|
| POST | /api/v1/friend-requests | 친구 요청 생성 | Create | 경로 변경 (/api/friend-requests → /api/v1/friend-requests) |
| GET | /api/v1/friend-requests | 전체 친구 요청 조회 | Read (List) | 쿼리 파라미터 제거, 전체 조회로 변경 |
| GET | /api/v1/friend-requests/{request_id} | 특정 친구 요청 조회 | Read (Detail) | **신규 추가** |
| PUT | /api/v1/friend-requests/{request_id} | 친구 요청 수정 (status 변경) | Update | accept/reject 통합 |
| DELETE | /api/v1/friend-requests/{request_id} | 친구 요청 삭제 | Delete | **신규 추가** |

### request_id 정의

친구 요청을 고유하게 식별하기 위한 ID가 필요합니다.

**옵션 1: 자동 증가 ID 추가** (권장)
```python
friend_requests = [
    {"request_id": 1, "id": 1, "requester_id": 2, "status": "pending"},
    {"request_id": 2, "id": 3, "requester_id": 2, "status": "pending"},
]
```

**옵션 2: 복합 키 사용** (id + requester_id)
```python
# request_id = "{id}-{requester_id}" 형식
# 예: "1-2", "3-2"
```

**결정**: 옵션 1 선택 (자동 증가 ID)
- 이유: 단순하고 확장 가능, User CRUD와 일관성 유지

## 구현 계획

### 단계 1: 데이터 구조 변경

#### 1.1. request_id 추가

**파일**: `fastapi/main.py`

**현재**:
```python
friend_requests: List[dict] = []
```

**변경 후**:
```python
friend_requests: List[dict] = []
friend_request_id_counter = 1  # 자동 증가 카운터
```

#### 1.2. 테스트 데이터 수정

**현재** (startup 이벤트):
```python
friend_requests.extend([
    {"id": 1, "requester_id": 2, "status": "pending"},
    {"id": 3, "requester_id": 2, "status": "pending"},
    {"id": 5, "requester_id": 4, "status": "pending"},
])
```

**변경 후**:
```python
friend_requests.extend([
    {"request_id": 1, "id": 1, "requester_id": 2, "status": "pending"},
    {"request_id": 2, "id": 3, "requester_id": 2, "status": "pending"},
    {"request_id": 3, "id": 5, "requester_id": 4, "status": "pending"},
])
friend_request_id_counter = 4  # 다음 ID
```

### 단계 2: Pydantic 스키마 변경

#### 2.1. 기존 스키마 유지

- `FriendRequestRequest`: 친구 요청 생성 요청 (id, requester_id)
- `FriendRequestResponse`: 친구 요청 생성 응답 (message, id, requester_id)

#### 2.2. 신규 스키마 추가

**FriendRequestDetailResponse**:
```python
class FriendRequestDetailResponse(BaseModel):
    """친구 요청 상세 응답 (CRUD Read)"""
    request_id: int
    id: int
    requester_id: int
    status: str
```

**FriendRequestUpdateRequest**:
```python
class FriendRequestUpdateRequest(BaseModel):
    """친구 요청 수정 요청 (status만 변경 가능)"""
    status: str  # "pending", "accepted", "rejected"
```

**FriendRequestDeleteResponse**:
```python
class FriendRequestDeleteResponse(BaseModel):
    """친구 요청 삭제 응답"""
    message: str
    deleted_request_id: int
```

#### 2.3. 기존 스키마 수정

**FriendRequestData** (조회용):
```python
class FriendRequestData(BaseModel):
    """친구 요청 데이터 (조회용)"""
    request_id: int  # 추가
    id: int
    requester_id: int
    status: str
```

#### 2.4. 제거할 스키마

- `FriendRequestActionRequest` → `FriendRequestUpdateRequest`로 대체
- `FriendRequestActionResponse` → `FriendRequestDetailResponse`로 대체

### 단계 3: CRUD 엔드포인트 구현

#### 3.1. Create - POST /api/v1/friend-requests

**변경 사항**:
- 경로: `/api/friend-requests` → `/api/v1/friend-requests`
- request_id 자동 생성
- friend_request_id_counter 증가

**구현**:
```python
@app.post("/api/v1/friend-requests", response_model=FriendRequestResponse)
def create_friend_request(request: FriendRequestRequest):
    """친구 요청 생성 (CRUD Create)"""
    global friend_request_id_counter

    # 친구 요청 데이터 생성
    friend_request_data = {
        "request_id": friend_request_id_counter,
        "id": request.id,
        "requester_id": request.requester_id,
        "status": "pending"
    }

    # 메모리에 저장
    friend_requests.append(friend_request_data)
    friend_request_id_counter += 1

    # 콘솔에 출력
    print(f"친구 요청 생성됨 [request_id={friend_request_data['request_id']}]: {request.id} -> {request.requester_id}")

    # 응답 반환
    return FriendRequestResponse(
        message="Friend request created",
        id=request.id,
        requester_id=request.requester_id
    )
```

#### 3.2. Read (List) - GET /api/v1/friend-requests

**변경 사항**:
- 경로: `/api/friend-requests` → `/api/v1/friend-requests`
- 쿼리 파라미터 제거
- 전체 친구 요청 조회

**구현**:
```python
@app.get("/api/v1/friend-requests", response_model=FriendRequestListResponse)
def get_all_friend_requests():
    """전체 친구 요청 조회 (CRUD Read - List)"""
    return FriendRequestListResponse(requests=friend_requests)
```

**선택 사항: 쿼리 파라미터 필터링 유지**
```python
@app.get("/api/v1/friend-requests", response_model=FriendRequestListResponse)
def get_all_friend_requests(user_id: Optional[int] = None, requester_id: Optional[int] = None):
    """전체 친구 요청 조회 (선택적 필터링)"""
    filtered = friend_requests

    if user_id is not None:
        filtered = [req for req in filtered if req["id"] == user_id]

    if requester_id is not None:
        filtered = [req for req in filtered if req["requester_id"] == requester_id]

    return FriendRequestListResponse(requests=filtered)
```

#### 3.3. Read (Detail) - GET /api/v1/friend-requests/{request_id}

**신규 추가**:
```python
@app.get("/api/v1/friend-requests/{request_id}", response_model=FriendRequestDetailResponse)
def get_friend_request(request_id: int):
    """특정 친구 요청 조회 (CRUD Read - Detail)"""
    # 해당 요청 찾기
    for req in friend_requests:
        if req["request_id"] == request_id:
            return FriendRequestDetailResponse(**req)

    # 요청을 찾지 못한 경우
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Friend request with id {request_id} not found"
    )
```

#### 3.4. Update - PUT /api/v1/friend-requests/{request_id}

**변경 사항**:
- accept/reject 엔드포인트 통합
- 경로 파라미터 사용

**구현**:
```python
@app.put("/api/v1/friend-requests/{request_id}", response_model=FriendRequestDetailResponse)
def update_friend_request(request_id: int, update: FriendRequestUpdateRequest):
    """친구 요청 수정 (CRUD Update - status 변경)"""
    # 상태 검증
    valid_statuses = ["pending", "accepted", "rejected"]
    if update.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )

    # 해당 요청 찾기
    for req in friend_requests:
        if req["request_id"] == request_id:
            req["status"] = update.status
            print(f"친구 요청 수정됨 [request_id={request_id}]: status={update.status}")
            return FriendRequestDetailResponse(**req)

    # 요청을 찾지 못한 경우
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Friend request with id {request_id} not found"
    )
```

#### 3.5. Delete - DELETE /api/v1/friend-requests/{request_id}

**신규 추가**:
```python
@app.delete("/api/v1/friend-requests/{request_id}", response_model=FriendRequestDeleteResponse)
def delete_friend_request(request_id: int):
    """친구 요청 삭제 (CRUD Delete)"""
    # 해당 요청 찾기
    for i, req in enumerate(friend_requests):
        if req["request_id"] == request_id:
            friend_requests.pop(i)
            print(f"친구 요청 삭제됨 [request_id={request_id}]")
            return FriendRequestDeleteResponse(
                message="Friend request deleted successfully",
                deleted_request_id=request_id
            )

    # 요청을 찾지 못한 경우
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Friend request with id {request_id} not found"
    )
```

### 단계 4: 기존 엔드포인트 제거

다음 엔드포인트를 제거:
- `POST /api/friend-requests/accept`
- `POST /api/friend-requests/reject`

또는 Deprecated 표시 후 유지 (하위 호환성):
```python
@app.post("/api/friend-requests/accept", deprecated=True)
def accept_friend_request_deprecated(action: FriendRequestActionRequest):
    """[Deprecated] Use PUT /api/v1/friend-requests/{request_id} instead"""
    # 기존 로직 유지
    pass
```

## API 비교표

### 변경 전 vs 변경 후

| 기능 | 변경 전 | 변경 후 |
|------|---------|---------|
| **생성** | POST /api/friend-requests | POST /api/v1/friend-requests |
| **전체 조회** | GET /api/friend-requests?user_id={id} | GET /api/v1/friend-requests |
| **단일 조회** | ❌ 없음 | GET /api/v1/friend-requests/{request_id} |
| **승인** | POST /api/friend-requests/accept | PUT /api/v1/friend-requests/{request_id}<br>{"status": "accepted"} |
| **거절** | POST /api/friend-requests/reject | PUT /api/v1/friend-requests/{request_id}<br>{"status": "rejected"} |
| **삭제** | ❌ 없음 | DELETE /api/v1/friend-requests/{request_id} |

## 사용 예시

### 1. 친구 요청 생성

**요청**:
```bash
curl -X POST "http://localhost:8000/api/v1/friend-requests" \
  -H "Content-Type: application/json" \
  -d '{"id": 10, "requester_id": 20}'
```

**응답**:
```json
{
  "message": "Friend request created",
  "id": 10,
  "requester_id": 20
}
```

### 2. 전체 친구 요청 조회

**요청**:
```bash
curl -X GET "http://localhost:8000/api/v1/friend-requests"
```

**응답**:
```json
{
  "requests": [
    {"request_id": 1, "id": 1, "requester_id": 2, "status": "pending"},
    {"request_id": 2, "id": 3, "requester_id": 2, "status": "pending"},
    {"request_id": 3, "id": 5, "requester_id": 4, "status": "pending"}
  ]
}
```

### 3. 특정 친구 요청 조회

**요청**:
```bash
curl -X GET "http://localhost:8000/api/v1/friend-requests/1"
```

**응답**:
```json
{
  "request_id": 1,
  "id": 1,
  "requester_id": 2,
  "status": "pending"
}
```

### 4. 친구 요청 승인 (Update)

**요청**:
```bash
curl -X PUT "http://localhost:8000/api/v1/friend-requests/1" \
  -H "Content-Type: application/json" \
  -d '{"status": "accepted"}'
```

**응답**:
```json
{
  "request_id": 1,
  "id": 1,
  "requester_id": 2,
  "status": "accepted"
}
```

### 5. 친구 요청 거절 (Update)

**요청**:
```bash
curl -X PUT "http://localhost:8000/api/v1/friend-requests/2" \
  -H "Content-Type: application/json" \
  -d '{"status": "rejected"}'
```

**응답**:
```json
{
  "request_id": 2,
  "id": 3,
  "requester_id": 2,
  "status": "rejected"
}
```

### 6. 친구 요청 삭제

**요청**:
```bash
curl -X DELETE "http://localhost:8000/api/v1/friend-requests/3"
```

**응답**:
```json
{
  "message": "Friend request deleted successfully",
  "deleted_request_id": 3
}
```

## 하위 호환성 고려 사항

### 옵션 1: 기존 엔드포인트 즉시 제거 (권장)
- 이유: 현재 프로덕션에 배포되지 않았으므로 즉시 변경 가능
- 장점: 코드가 깔끔하고 통일성 유지
- 단점: 기존 테스트 코드 수정 필요

### 옵션 2: Deprecated 기간 유지
- 이유: 기존 API 사용자를 위한 마이그레이션 기간 제공
- 방법: FastAPI의 `deprecated=True` 파라미터 사용
- 제거 시점: 다음 메이저 버전 (v2.0.0)

**결정**: 옵션 1 선택 (즉시 제거)
- 이유: 개발 단계이며 프로덕션 배포 전

## 파일 구조

```
fastapi/
└── main.py
    ├── friend_requests: List[dict]              # 메모리 저장소
    ├── friend_request_id_counter: int           # 자동 증가 카운터 (추가)
    ├── FriendRequestRequest                     # 생성 요청 (유지)
    ├── FriendRequestResponse                    # 생성 응답 (유지)
    ├── FriendRequestData                        # 조회 데이터 (request_id 추가)
    ├── FriendRequestListResponse                # 목록 응답 (유지)
    ├── FriendRequestDetailResponse              # 상세 응답 (신규)
    ├── FriendRequestUpdateRequest               # 수정 요청 (신규)
    ├── FriendRequestDeleteResponse              # 삭제 응답 (신규)
    ├── POST /api/v1/friend-requests            # Create (경로 변경)
    ├── GET /api/v1/friend-requests             # Read (List) (경로 변경)
    ├── GET /api/v1/friend-requests/{id}        # Read (Detail) (신규)
    ├── PUT /api/v1/friend-requests/{id}        # Update (신규)
    └── DELETE /api/v1/friend-requests/{id}     # Delete (신규)
```

## 검증 체크리스트

### 구현 확인
- [ ] friend_request_id_counter 전역 변수 추가
- [ ] 테스트 데이터에 request_id 추가
- [ ] Pydantic 스키마 3개 신규 추가 (Detail, Update, Delete)
- [ ] FriendRequestData에 request_id 필드 추가
- [ ] POST /api/v1/friend-requests 구현 (Create)
- [ ] GET /api/v1/friend-requests 구현 (Read - List)
- [ ] GET /api/v1/friend-requests/{request_id} 구현 (Read - Detail)
- [ ] PUT /api/v1/friend-requests/{request_id} 구현 (Update)
- [ ] DELETE /api/v1/friend-requests/{request_id} 구현 (Delete)
- [ ] 기존 accept/reject 엔드포인트 제거

### 기능 테스트
- [ ] 친구 요청 생성 정상 작동
- [ ] request_id 자동 증가 확인
- [ ] 전체 친구 요청 조회 정상 작동
- [ ] 특정 친구 요청 조회 정상 작동 (404 테스트 포함)
- [ ] 친구 요청 승인 (status=accepted) 정상 작동
- [ ] 친구 요청 거절 (status=rejected) 정상 작동
- [ ] 잘못된 status 값 입력 시 400 에러
- [ ] 친구 요청 삭제 정상 작동 (404 테스트 포함)
- [ ] Swagger UI에서 모든 엔드포인트 문서 확인

### 코드 품질
- [ ] User CRUD API와 일관된 코드 스타일
- [ ] 에러 처리 일관성 (404, 400)
- [ ] 응답 형식 일관성 (message, status)
- [ ] 콘솔 로그 일관성

## 완료 조건

1. ✅ 5개의 RESTful CRUD 엔드포인트 모두 구현
2. ✅ request_id 기반 식별 시스템 구현
3. ✅ User CRUD API와 동일한 패턴 적용
4. ✅ 기존 accept/reject 엔드포인트 제거
5. ✅ Swagger UI에서 API 문서 확인 가능
6. ✅ 모든 엔드포인트 테스트 성공

## 향후 개선 사항

### 1. 데이터베이스 테이블 생성 (프로덕션)

```sql
CREATE TABLE friend_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    requester_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (requester_id) REFERENCES users(id),
    UNIQUE KEY unique_request (user_id, requester_id)
);
```

### 2. SQLAlchemy ORM 모델

```python
class FriendRequest(Base):
    __tablename__ = "friend_requests"

    request_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### 3. 인증 및 권한 검증

```python
@app.get("/api/v1/friend-requests/{request_id}")
def get_friend_request(
    request_id: int,
    current_user: User = Depends(get_current_user)  # JWT 토큰 검증
):
    # 본인과 관련된 요청만 조회 가능
    req = find_friend_request(request_id)
    if current_user.id not in [req.user_id, req.requester_id]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return req
```

### 4. 검증 로직 추가

- 중복 요청 방지
- 자기 자신에게 요청 방지
- 이미 친구인 경우 요청 방지
- status 전이 규칙 (pending → accepted/rejected만 허용)

## 참고 문서

- FastAPI 공식 문서: https://fastapi.tiangolo.com/
- RESTful API 디자인 가이드: https://restfulapi.net/
- User CRUD API: `/home/hexsera/Pinball_web/PRD/user-crud-mysql.md`
- 기존 친구 관리 API: `/home/hexsera/Pinball_web/PRD/친구-추가-조회-승인-실행계획.md`

## 예상 소요 시간

- 데이터 구조 변경: 5분
- Pydantic 스키마 작성: 10분
- CRUD 엔드포인트 구현: 20분
- 기존 엔드포인트 제거: 5분
- 테스트 및 검증: 10분
- **총 소요 시간**: 약 50분

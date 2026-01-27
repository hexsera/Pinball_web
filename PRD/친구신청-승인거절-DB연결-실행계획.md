# 친구 신청 승인/거절 DB 연결 실행계획

## 요구사항 요약

**요구사항**: 친구 요청 승인/거절 시 DB의 friendships 테이블 status를 업데이트

**목적**: 현재는 메모리 배열(`friend_requests`)만 업데이트되어 서버 재시작 시 상태가 사라지므로, DB에 영구 저장하여 상태를 유지

## 현재상태 분석

- **Friendship 모델**: `friendships` 테이블에 id, requester_id, addressee_id, status, created_at 필드 존재
- **POST /api/friend-requests**: DB에 Friendship 레코드 생성(status='pending') + 메모리 배열에도 저장
- **GET /api/friend-requests**: 메모리 배열에서만 조회 (DB 미사용)
- **POST /api/friend-requests/accept**: 메모리 배열의 status만 'accepted'로 변경 (DB 미반영)
- **POST /api/friend-requests/reject**: 메모리 배열의 status만 'rejected'로 변경 (DB 미반영)

## 구현 방법

SQLAlchemy Session을 사용하여 friendships 테이블의 레코드를 조회하고 status 필드를 업데이트합니다.

**기술 스택**:
- SQLAlchemy ORM: `db.query(Friendship).filter().first()` 패턴 사용
- UPDATE 쿼리: 레코드 조회 후 status 값 변경, `db.commit()`으로 저장

**변경 사항**:
1. accept/reject 엔드포인트에 `db: Session = Depends(get_db)` 의존성 추가
2. 메모리 배열 대신 DB 쿼리로 Friendship 레코드 조회
3. 레코드의 status 필드 업데이트 후 commit

## 구현 단계

1. **POST /api/friend-requests/accept 엔드포인트 수정**
   - `db: Session = Depends(get_db)` 파라미터 추가
   - `db.query(Friendship).filter(Friendship.id == action.id, Friendship.requester_id == action.requester_id).first()` 쿼리 실행
   - 레코드가 없으면 404 에러 반환
   - `friendship.status = "accepted"` 설정
   - `db.commit()`, `db.refresh(friendship)` 실행
   - 메모리 배열 업데이트 로직 유지 (하위 호환성)

2. **POST /api/friend-requests/reject 엔드포인트 수정**
   - accept와 동일한 패턴으로 구현
   - status를 "rejected"로 설정

3. **테스트**
   - POST /api/friend-requests로 친구 요청 생성
   - MySQL에서 friendships 테이블 조회하여 status='pending' 확인
   - POST /api/friend-requests/accept 호출
   - MySQL에서 status='accepted'로 변경되었는지 확인

## 코드 작성 방법

### 1. POST /api/friend-requests/accept 수정

**변경 전**:
```python
@app.post("/api/friend-requests/accept", response_model=FriendRequestActionResponse)
def accept_friend_request(action: FriendRequestActionRequest):
    """친구 요청 승인"""
    for req in friend_requests:
        if req["id"] == action.id and req["requester_id"] == action.requester_id:
            req["status"] = "accepted"
            return FriendRequestActionResponse(...)
    raise HTTPException(status_code=404, detail="Friend request not found")
```

**변경 후**:
```python
@app.post("/api/friend-requests/accept", response_model=FriendRequestActionResponse)
def accept_friend_request(action: FriendRequestActionRequest, db: Session = Depends(get_db)):
    """친구 요청 승인 (DB 연동)"""
    # DB에서 Friendship 레코드 조회
    friendship = db.query(Friendship).filter(
        Friendship.id == action.id,
        Friendship.requester_id == action.requester_id
    ).first()

    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")

    # status 업데이트
    friendship.status = "accepted"
    db.commit()
    db.refresh(friendship)

    # 메모리 배열도 업데이트 (하위 호환성)
    for req in friend_requests:
        if req["id"] == action.id and req["requester_id"] == action.requester_id:
            req["status"] = "accepted"

    print(f"친구 요청 승인됨 (DB): {action.id} -> {action.requester_id}")
    return FriendRequestActionResponse(
        message="Friend request accepted",
        id=friendship.id,
        requester_id=friendship.requester_id,
        status=friendship.status
    )
```

### 2. POST /api/friend-requests/reject 수정

**변경 전**:
```python
@app.post("/api/friend-requests/reject", response_model=FriendRequestActionResponse)
def reject_friend_request(action: FriendRequestActionRequest):
    """친구 요청 거절"""
    for req in friend_requests:
        if req["id"] == action.id and req["requester_id"] == action.requester_id:
            req["status"] = "rejected"
            return FriendRequestActionResponse(...)
    raise HTTPException(status_code=404, detail="Friend request not found")
```

**변경 후**:
```python
@app.post("/api/friend-requests/reject", response_model=FriendRequestActionResponse)
def reject_friend_request(action: FriendRequestActionRequest, db: Session = Depends(get_db)):
    """친구 요청 거절 (DB 연동)"""
    # DB에서 Friendship 레코드 조회
    friendship = db.query(Friendship).filter(
        Friendship.id == action.id,
        Friendship.requester_id == action.requester_id
    ).first()

    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")

    # status 업데이트
    friendship.status = "rejected"
    db.commit()
    db.refresh(friendship)

    # 메모리 배열도 업데이트 (하위 호환성)
    for req in friend_requests:
        if req["id"] == action.id and req["requester_id"] == action.requester_id:
            req["status"] = "rejected"

    print(f"친구 요청 거절됨 (DB): {action.id} -> {action.requester_id}")
    return FriendRequestActionResponse(
        message="Friend request rejected",
        id=friendship.id,
        requester_id=friendship.requester_id,
        status=friendship.status
    )
```

### 3. 주요 변경 포인트

1. **함수 시그니처**: `db: Session = Depends(get_db)` 파라미터 추가
2. **DB 조회**: `db.query(Friendship).filter(...).first()` 사용
3. **조건 검증**: `if not friendship` 체크 후 404 에러
4. **status 업데이트**: `friendship.status = "accepted"` 또는 `"rejected"`
5. **DB 반영**: `db.commit()` + `db.refresh(friendship)`
6. **응답 데이터**: DB 레코드(`friendship`)의 값 사용

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| fastapi/main.py | 수정 | POST /api/friend-requests/accept 엔드포인트에 DB Session 의존성 추가 및 UPDATE 쿼리 구현 |
| fastapi/main.py | 수정 | POST /api/friend-requests/reject 엔드포인트에 DB Session 의존성 추가 및 UPDATE 쿼리 구현 |

## 완료 체크리스트

- [o] POST /api/friend-requests/accept 호출 시 DB의 friendships 테이블 status가 'accepted'로 변경됨
- [o] POST /api/friend-requests/reject 호출 시 DB의 friendships 테이블 status가 'rejected'로 변경됨
- [o] 존재하지 않는 친구 요청 ID로 승인/거절 시 404 에러 반환
- [o] FastAPI 서버 재시작 후에도 친구 요청 상태가 유지됨 (DB 영구 저장 확인)

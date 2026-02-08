# 친구 요청 API 개선 - TDD RED 계획

## 목표

`POST /api/friend-requests` 엔드포인트의 검증 로직에 대한 테스트를 먼저 작성합니다.

**현재 상태**: 기능은 구현되어 있지만 테스트가 없습니다.
**TDD 원칙**: 테스트 없이 작성된 코드는 TDD 위반입니다. 하지만 이미 구현된 코드이므로, 이번에는 **회귀 방지 테스트(Regression Test)**를 작성합니다.

## 검증 조건

1. **자기 자신에게 요청 불가**: A 유저 → A 유저 (400 Bad Request)
2. **중복 요청 방지**: A → B가 이미 존재하면 중복 요청 불가 (400 Bad Request)
3. **양방향 중복 검증**: A → B가 있을 때 B → A 요청 불가 (400 Bad Request)
4. **FK 제약조건 검증**: requester_id 또는 receiver_id가 존재하지 않는 user면 오류 (현재 미구현, 추가 필요)

## 테스트 파일 구조

```
backend/tests/
├── __init__.py
├── conftest.py              # pytest fixture 설정 (테스트 DB, 세션)
└── test_friend_requests.py  # 친구 요청 API 테스트
```

## RED 단계별 계획

### 0단계: 테스트 환경 설정

**파일**: `backend/tests/conftest.py`

**내용**:
- pytest fixture 설정
- 테스트 DB 엔진 생성 (`hexdb_test`)
- 테스트용 DB 세션 생성
- FastAPI TestClient 설정
- 각 테스트 후 DB 초기화

**fixture 목록**:
1. `db_engine`: 테스트 DB 엔진
2. `db_session`: 테스트 DB 세션 (각 테스트 후 rollback)
3. `client`: FastAPI TestClient (app.dependency_overrides로 DB 주입)
4. `sample_users`: 테스트용 사용자 2명 생성 (User 1, User 2)

---

### 1단계: 자기 자신에게 요청 불가 테스트

**테스트 함수**: `test_cannot_send_friend_request_to_yourself`

**Given**: User 1이 존재함
**When**: User 1이 User 1에게 친구 요청을 보냄
**Then**: 400 Bad Request 반환, detail: "Cannot send friend request to yourself"

**예상 실패 이유**: ~~기능이 구현되지 않았으므로~~ (이미 구현됨) → **테스트가 없었으므로 회귀 방지 목적**

**테스트 코드**:
```python
def test_cannot_send_friend_request_to_yourself(client, sample_users):
    """자기 자신에게 친구 요청을 보낼 수 없다"""
    user1 = sample_users[0]

    response = client.post("/api/friend-requests", json={
        "requester_id": user1.id,
        "receiver_id": user1.id
    })

    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot send friend request to yourself"
```

**RED 검증**: 테스트 실행 → ~~실패 확인~~ → **통과 확인 (이미 구현됨)**

---

### 2단계: 중복 요청 방지 테스트

**테스트 함수**: `test_cannot_send_duplicate_friend_request`

**Given**: User 1 → User 2 친구 요청이 이미 존재함 (status: pending)
**When**: User 1이 다시 User 2에게 친구 요청을 보냄
**Then**: 400 Bad Request 반환, detail: "Friend request already sent"

**예상 실패 이유**: ~~기능이 구현되지 않았으므로~~ (이미 구현됨) → **테스트가 없었으므로 회귀 방지 목적**

**테스트 코드**:
```python
def test_cannot_send_duplicate_friend_request(client, sample_users, db_session):
    """이미 보낸 친구 요청은 중복 전송할 수 없다"""
    from models import Friendship

    user1, user2 = sample_users[0], sample_users[1]

    # 첫 번째 요청 생성
    friendship = Friendship(
        requester_id=user1.id,
        receiver_id=user2.id,
        status="pending"
    )
    db_session.add(friendship)
    db_session.commit()

    # 두 번째 요청 시도 (중복)
    response = client.post("/api/friend-requests", json={
        "requester_id": user1.id,
        "receiver_id": user2.id
    })

    assert response.status_code == 400
    assert response.json()["detail"] == "Friend request already sent"
```

**RED 검증**: 테스트 실행 → ~~실패 확인~~ → **통과 확인 (이미 구현됨)**

---

### 3단계: 양방향 중복 검증 테스트 (pending)

**테스트 함수**: `test_cannot_send_reverse_friend_request_when_pending`

**Given**: User 1 → User 2 친구 요청이 이미 존재함 (status: pending)
**When**: User 2가 User 1에게 친구 요청을 보냄 (역방향)
**Then**: 400 Bad Request 반환, detail: "This user already sent you a friend request..."

**예상 실패 이유**: ~~기능이 구현되지 않았으므로~~ (이미 구현됨) → **테스트가 없었으므로 회귀 방지 목적**

**테스트 코드**:
```python
def test_cannot_send_reverse_friend_request_when_pending(client, sample_users, db_session):
    """상대방이 이미 보낸 친구 요청(pending)이 있으면 역방향 요청 불가"""
    from models import Friendship

    user1, user2 = sample_users[0], sample_users[1]

    # User 1 → User 2 요청 생성
    friendship = Friendship(
        requester_id=user1.id,
        receiver_id=user2.id,
        status="pending"
    )
    db_session.add(friendship)
    db_session.commit()

    # User 2 → User 1 요청 시도 (역방향)
    response = client.post("/api/friend-requests", json={
        "requester_id": user2.id,
        "receiver_id": user1.id
    })

    assert response.status_code == 400
    assert "already sent you a friend request" in response.json()["detail"]
```

**RED 검증**: 테스트 실행 → ~~실패 확인~~ → **통과 확인 (이미 구현됨)**

---

### 4단계: 양방향 중복 검증 테스트 (accepted)

**테스트 함수**: `test_cannot_send_reverse_friend_request_when_accepted`

**Given**: User 1 → User 2 친구 요청이 이미 수락됨 (status: accepted)
**When**: User 2가 User 1에게 친구 요청을 보냄 (역방향)
**Then**: 400 Bad Request 반환, detail: "Already friends"

**테스트 코드**:
```python
def test_cannot_send_reverse_friend_request_when_accepted(client, sample_users, db_session):
    """이미 친구인 경우 역방향 요청 불가"""
    from models import Friendship

    user1, user2 = sample_users[0], sample_users[1]

    # User 1 → User 2 요청이 수락됨
    friendship = Friendship(
        requester_id=user1.id,
        receiver_id=user2.id,
        status="accepted"
    )
    db_session.add(friendship)
    db_session.commit()

    # User 2 → User 1 요청 시도 (역방향)
    response = client.post("/api/friend-requests", json={
        "requester_id": user2.id,
        "receiver_id": user1.id
    })

    assert response.status_code == 400
    assert response.json()["detail"] == "Already friends"
```

**RED 검증**: 테스트 실행 → ~~실패 확인~~ → **통과 확인 (이미 구현됨)**

---

### 5단계: 양방향 중복 검증 테스트 (rejected)

**테스트 함수**: `test_cannot_send_reverse_friend_request_when_rejected`

**Given**: User 1 → User 2 친구 요청이 거절됨 (status: rejected)
**When**: User 2가 User 1에게 친구 요청을 보냄 (역방향)
**Then**: 400 Bad Request 반환, detail: "Cannot send friend request. Previous request was rejected."

**테스트 코드**:
```python
def test_cannot_send_reverse_friend_request_when_rejected(client, sample_users, db_session):
    """거절된 요청이 있을 때 역방향 요청 불가"""
    from models import Friendship

    user1, user2 = sample_users[0], sample_users[1]

    # User 1 → User 2 요청이 거절됨
    friendship = Friendship(
        requester_id=user1.id,
        receiver_id=user2.id,
        status="rejected"
    )
    db_session.add(friendship)
    db_session.commit()

    # User 2 → User 1 요청 시도 (역방향)
    response = client.post("/api/friend-requests", json={
        "requester_id": user2.id,
        "receiver_id": user1.id
    })

    assert response.status_code == 400
    assert "Previous request was rejected" in response.json()["detail"]
```

**RED 검증**: 테스트 실행 → ~~실패 확인~~ → **통과 확인 (이미 구현됨)**

---

### 6단계: FK 제약조건 검증 - requester_id 존재하지 않음 (신규 기능)

**테스트 함수**: `test_requester_id_must_exist`

**Given**: User 1만 존재함, User 999는 존재하지 않음
**When**: User 999 → User 1 친구 요청을 보냄
**Then**: 404 Not Found 반환, detail: "Requester user not found"

**예상 실패 이유**: **기능이 구현되지 않았으므로 실패 예상** (진짜 RED)

**테스트 코드**:
```python
def test_requester_id_must_exist(client, sample_users):
    """존재하지 않는 requester_id로 요청 불가"""
    user1 = sample_users[0]
    non_existent_user_id = 999

    response = client.post("/api/friend-requests", json={
        "requester_id": non_existent_user_id,
        "receiver_id": user1.id
    })

    assert response.status_code == 404
    assert "Requester user not found" in response.json()["detail"]
```

**RED 검증**: 테스트 실행 → **실패 확인** → GREEN 단계에서 구현

---

### 7단계: FK 제약조건 검증 - receiver_id 존재하지 않음 (신규 기능)

**테스트 함수**: `test_receiver_id_must_exist`

**Given**: User 1만 존재함, User 999는 존재하지 않음
**When**: User 1 → User 999 친구 요청을 보냄
**Then**: 404 Not Found 반환, detail: "Receiver user not found"

**예상 실패 이유**: **기능이 구현되지 않았으므로 실패 예상** (진짜 RED)

**테스트 코드**:
```python
def test_receiver_id_must_exist(client, sample_users):
    """존재하지 않는 receiver_id로 요청 불가"""
    user1 = sample_users[0]
    non_existent_user_id = 999

    response = client.post("/api/friend-requests", json={
        "requester_id": user1.id,
        "receiver_id": non_existent_user_id
    })

    assert response.status_code == 404
    assert "Receiver user not found" in response.json()["detail"]
```

**RED 검증**: 테스트 실행 → **실패 확인** → GREEN 단계에서 구현

---

### 8단계: 정상 케이스 테스트

**테스트 함수**: `test_create_friend_request_successfully`

**Given**: User 1과 User 2가 존재함
**When**: User 1 → User 2 친구 요청을 보냄
**Then**: 200 OK 반환, message: "Friend request sent successfully"

**테스트 코드**:
```python
def test_create_friend_request_successfully(client, sample_users):
    """정상적인 친구 요청 생성"""
    user1, user2 = sample_users[0], sample_users[1]

    response = client.post("/api/friend-requests", json={
        "requester_id": user1.id,
        "receiver_id": user2.id
    })

    assert response.status_code == 200
    assert response.json()["message"] == "Friend request sent successfully"
    assert response.json()["requester_id"] == user1.id
    assert response.json()["receiver_id"] == user2.id
```

**RED 검증**: 테스트 실행 → ~~실패 확인~~ → **통과 확인 (이미 구현됨)**

---

## 테스트 실행 순서

1. **0단계**: conftest.py 작성 (fixture 설정)
2. **1~5단계**: 기존 기능 회귀 방지 테스트 작성 → **모두 통과 예상**
3. **6~7단계**: FK 제약조건 검증 테스트 작성 → **실패 확인 (RED)** → GREEN 단계에서 구현
4. **8단계**: 정상 케이스 테스트 작성 → **통과 확인**

## 테스트 실행 명령어

```bash
# 전체 테스트 실행
cd backend && pytest tests/test_friend_requests.py -v

# 특정 테스트 실행
cd backend && pytest tests/test_friend_requests.py::test_cannot_send_friend_request_to_yourself -v

# 테스트 커버리지 확인
cd backend && pytest tests/test_friend_requests.py --cov=main --cov-report=term-missing
```

## 완료 체크리스트

- [ ] conftest.py 작성 (테스트 DB, 세션, client fixture)
- [ ] test_friend_requests.py 작성 (8개 테스트 함수)
- [ ] 1~5단계 테스트 실행 → 모두 통과 확인 (회귀 방지)
- [ ] 6~7단계 테스트 실행 → **실패 확인 (RED)** → 이것이 진짜 RED
- [ ] 8단계 테스트 실행 → 통과 확인
- [ ] 모든 테스트가 예상된 이유로 실패/통과하는지 확인
- [ ] 출력에 에러, 경고가 없는지 확인

## 다음 단계 (GREEN)

RED 확인 후:
1. main.py에 FK 제약조건 검증 로직 추가 (6~7단계 테스트가 통과하도록)
2. 모든 테스트 재실행 → 전체 통과 확인
3. REFACTOR 단계로 이동 (코드 정리, 중복 제거)

---

## 참고사항

### 현재 구현 상태 (main.py line 463-537)

- ✅ 자기 자신에게 요청 불가 (line 468-472)
- ✅ 중복 요청 방지 (line 475-495)
- ✅ 양방향 중복 검증 (line 498-519)
- ❌ FK 제약조건 검증 (미구현)

### DB 제약조건 (models.py line 39-42)

```python
__table_args__ = (
    UniqueConstraint('requester_id', 'receiver_id', name='uq_friendship_pair'),
    CheckConstraint('requester_id != receiver_id', name='ck_no_self_friend'),
)
```

- DB 레벨에서는 자기 자신 방지 (`ck_no_self_friend`)
- DB 레벨에서는 중복 방지 (`uq_friendship_pair`)
- **하지만 FK 존재 여부는 DB만으로는 명확한 에러 메시지 제공 불가**
- 따라서 **API 레벨에서 FK 검증 필요**

### TDD 원칙 준수

- 1~5단계: 이미 구현된 기능이므로 **회귀 방지 테스트**
- 6~7단계: 미구현 기능이므로 **진짜 RED-GREEN-REFACTOR**
- 테스트가 실패하는 것을 보지 않았다면, 그 테스트가 올바른 것을 검증하는지 알 수 없다.

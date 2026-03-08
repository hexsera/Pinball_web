# 친구 페이지 TDD 테스트 명세

## 목표
FriendPage.jsx에 **친구 요청란**과 **현재 친구 영역**을 구현하기 위한 TDD 테스트 명세.

---

## 대상 PRD
- FriendPage.jsx 접속 시 `/api/friend-requests`에서 GET으로 나에게 온 친구 신청 목록 + "친구 승인" 버튼 표시
- FriendPage.jsx 접속 시 `/api/friend-requests`에서 GET으로 현재 친구 관계인 사용자 목록 표시

---

## 테스트 환경
- **프레임워크**: Vitest
- **렌더링**: @testing-library/react
- **유저 이벤트**: @testing-library/user-event
- **HTTP Mocking**: vitest의 `vi.fn()` + axios mock
- **설정 파일**: `frontend/vitest.config.js`, `frontend/src/test/setup.js`

---

## 파일 구조

```
frontend/src/test/
├── FriendRequest.test.jsx      ← 친구 요청란 테스트 (신규)
├── FriendList.test.jsx         ← 현재 친구 목록 테스트 (신규)
├── FriendPage.test.jsx         ← 기존 (레이아웃/통합)
├── FriendSearch.test.jsx       ← 기존 (검색 기능)
├── sample.test.jsx             ← 기존 (환경 검증)
└── setup.js                    ← 기존
```

---

## 1. FriendRequest.test.jsx - 친구 요청란 테스트

### API Mock 데이터

```javascript
// 나에게 온 친구 요청 (pending 상태, receiver_id === 내 user_id)
const MOCK_PENDING_REQUESTS = {
  requests: [
    { id: 1, requester_id: 3, receiver_id: 1, status: 'pending' },
    { id: 2, requester_id: 5, receiver_id: 1, status: 'pending' },
  ]
};

// 요청자의 사용자 정보 (닉네임 표시용)
const MOCK_USERS = {
  3: { id: 3, email: 'user3@test.com', nickname: '홍길동', birth_date: '2000-01-03', role: 'user' },
  5: { id: 5, email: 'user5@test.com', nickname: '박영희', birth_date: '2000-01-05', role: 'user' },
};
```

### 테스트 케이스

#### 1-1. 친구 요청란 영역 렌더링

```
describe('친구 요청란 렌더링')

  it('오른쪽 영역에 "친구 요청" 제목이 표시된다')
    - FriendPage 렌더링
    - "친구 요청" 텍스트가 화면에 존재하는지 확인
    - expect: toBeInTheDocument()

  it('친구 요청란 영역이 오른쪽(friend-right-area) 안에 존재한다')
    - FriendPage 렌더링
    - data-testid="friend-right-area" 내부에 친구 요청 섹션 존재 확인
    - expect: toBeInTheDocument()
```

#### 1-2. 친구 요청 목록 API 호출

```
describe('친구 요청 API 호출')

  beforeEach:
    - localStorage에 user 설정: { id: 1, name: '테스트유저' }
    - axios.get을 mock하여 MOCK_PENDING_REQUESTS 반환

  it('페이지 접속 시 GET /api/friend-requests?user_id=1&friend_status=pending 를 호출한다')
    - FriendPage 렌더링
    - axios.get이 올바른 URL과 파라미터로 호출되었는지 확인
    - expect: toHaveBeenCalledWith('/api/friend-requests', { params: { user_id: 1, friend_status: 'pending' } })

  it('API 응답으로 받은 친구 요청 목록이 화면에 표시된다')
    - FriendPage 렌더링
    - waitFor로 비동기 렌더링 대기
    - 요청자 닉네임(홍길동, 박영희) 또는 ID가 화면에 표시되는지 확인
    - expect: toBeInTheDocument()

  it('친구 요청이 0건이면 "받은 친구 요청이 없습니다" 메시지가 표시된다')
    - axios.get mock: { requests: [] } 반환
    - FriendPage 렌더링
    - waitFor로 비동기 렌더링 대기
    - expect: "받은 친구 요청이 없습니다" 텍스트 존재
```

#### 1-3. 친구 승인 버튼

```
describe('친구 승인 버튼')

  beforeEach:
    - localStorage에 user 설정: { id: 1, name: '테스트유저' }
    - axios.get mock: MOCK_PENDING_REQUESTS 반환

  it('각 친구 요청 항목마다 "친구 승인" 버튼이 존재한다')
    - FriendPage 렌더링
    - waitFor로 비동기 렌더링 대기
    - "친구 승인" 버튼이 요청 수(2개)만큼 존재하는지 확인
    - expect: getAllByRole('button', { name: '친구 승인' }).length === 2

  it('"친구 승인" 버튼 클릭 시 POST /api/friend-requests/accept 를 호출한다')
    - axios.post mock 설정
    - FriendPage 렌더링
    - waitFor로 "친구 승인" 버튼 대기
    - 첫 번째 "친구 승인" 버튼 클릭
    - expect: axios.post가 '/api/friend-requests/accept'로 호출됨
    - expect: body에 { requester_id: 3, receiver_id: 1 } 포함

  it('친구 승인 성공 후 해당 요청이 목록에서 사라진다')
    - axios.post mock: 성공 응답 반환
    - FriendPage 렌더링
    - waitFor로 "친구 승인" 버튼 대기
    - 첫 번째 "친구 승인" 버튼 클릭
    - waitFor로 해당 요청 항목이 사라지는지 확인
    - expect: queryByText('홍길동') → null (또는 요청 목록에서 제거됨)

  it('친구 승인 실패 시 에러 메시지가 표시된다')
    - axios.post mock: 에러 응답 (404 또는 500) 반환
    - FriendPage 렌더링
    - waitFor로 "친구 승인" 버튼 대기
    - 첫 번째 "친구 승인" 버튼 클릭
    - waitFor로 에러 메시지 표시 확인
    - expect: 에러 관련 텍스트 toBeInTheDocument()
```

#### 1-4. 친구 거절 버튼 (선택 사항)

```
describe('친구 거절 버튼')

  it('각 친구 요청 항목마다 "거절" 버튼이 존재한다')
    - "거절" 버튼이 요청 수만큼 존재하는지 확인

  it('"거절" 버튼 클릭 시 POST /api/friend-requests/reject 를 호출한다')
    - axios.post가 '/api/friend-requests/reject'로 호출되는지 확인
    - body에 { requester_id, receiver_id } 포함

  it('거절 성공 후 해당 요청이 목록에서 사라진다')
    - 해당 항목이 화면에서 제거되는지 확인
```

---

## 2. FriendList.test.jsx - 현재 친구 목록 테스트

### API Mock 데이터

```javascript
// 현재 친구 관계 (accepted 상태)
const MOCK_ACCEPTED_FRIENDS = {
  requests: [
    { id: 3, requester_id: 1, receiver_id: 2, status: 'accepted' },
    { id: 4, requester_id: 4, receiver_id: 1, status: 'accepted' },
  ]
};

// 친구의 사용자 정보 (닉네임 표시용)
const MOCK_FRIEND_USERS = {
  2: { id: 2, email: 'user2@test.com', nickname: '테스트유저2', birth_date: '2000-01-02', role: 'user' },
  4: { id: 4, email: 'user4@test.com', nickname: '김철수', birth_date: '2000-01-04', role: 'user' },
};
```

### 테스트 케이스

#### 2-1. 현재 친구 목록 영역 렌더링

```
describe('현재 친구 목록 렌더링')

  it('오른쪽 영역에 "현재 친구" 제목이 표시된다')
    - FriendPage 렌더링
    - "현재 친구" 텍스트가 화면에 존재하는지 확인
    - expect: toBeInTheDocument()

  it('현재 친구 목록 영역이 오른쪽(friend-right-area) 안에 존재한다')
    - FriendPage 렌더링
    - data-testid="friend-right-area" 내부에 친구 목록 섹션 존재 확인
    - expect: toBeInTheDocument()
```

#### 2-2. 현재 친구 목록 API 호출

```
describe('현재 친구 목록 API 호출')

  beforeEach:
    - localStorage에 user 설정: { id: 1, name: '테스트유저' }
    - axios.get mock: friend_status에 따라 다른 응답 반환

  it('페이지 접속 시 GET /api/friend-requests?user_id=1&friend_status=accepted 를 호출한다')
    - FriendPage 렌더링
    - axios.get이 friend_status=accepted 파라미터로 호출되었는지 확인
    - expect: toHaveBeenCalledWith('/api/friend-requests', { params: { user_id: 1, friend_status: 'accepted' } })

  it('API 응답의 친구 목록이 화면에 표시된다')
    - FriendPage 렌더링
    - waitFor로 비동기 렌더링 대기
    - 친구 닉네임(테스트유저2, 김철수)이 화면에 표시되는지 확인
    - expect: toBeInTheDocument()

  it('내가 requester인 경우 receiver의 닉네임이 표시된다')
    - Mock: { requester_id: 1, receiver_id: 2, status: 'accepted' }
    - 상대방(user_id: 2)의 닉네임 '테스트유저2'가 표시되는지 확인

  it('내가 receiver인 경우 requester의 닉네임이 표시된다')
    - Mock: { requester_id: 4, receiver_id: 1, status: 'accepted' }
    - 상대방(user_id: 4)의 닉네임 '김철수'가 표시되는지 확인

  it('친구가 0명이면 "친구가 없습니다" 메시지가 표시된다')
    - axios.get mock: { requests: [] } 반환
    - FriendPage 렌더링
    - waitFor로 비동기 렌더링 대기
    - expect: "친구가 없습니다" 텍스트 존재
```

#### 2-3. 친구 목록 표시 정보

```
describe('친구 목록 표시 정보')

  beforeEach:
    - localStorage에 user 설정: { id: 1, name: '테스트유저' }
    - axios.get mock: MOCK_ACCEPTED_FRIENDS + 사용자 정보 반환

  it('각 친구 항목에 닉네임이 표시된다')
    - FriendPage 렌더링
    - waitFor로 비동기 렌더링 대기
    - 친구 닉네임이 화면에 존재하는지 확인

  it('각 친구 항목에 이메일이 표시된다')
    - FriendPage 렌더링
    - waitFor로 비동기 렌더링 대기
    - 친구 이메일이 화면에 존재하는지 확인
```

---

## 3. 통합 테스트 (FriendPage.test.jsx에 추가)

### 테스트 케이스

```
describe('FriendPage 통합 - 친구 요청 + 친구 목록')

  beforeEach:
    - localStorage에 user 설정: { id: 1, name: '테스트유저' }
    - axios.get mock:
      - friend_status=pending → MOCK_PENDING_REQUESTS
      - friend_status=accepted → MOCK_ACCEPTED_FRIENDS

  it('페이지 접속 시 친구 요청과 친구 목록이 동시에 표시된다')
    - FriendPage 렌더링
    - waitFor로 비동기 렌더링 대기
    - "친구 요청" 섹션과 "현재 친구" 섹션이 모두 존재하는지 확인

  it('친구 승인 후 해당 사용자가 친구 목록에 추가된다')
    - FriendPage 렌더링
    - waitFor로 "친구 승인" 버튼 대기
    - "친구 승인" 버튼 클릭
    - axios.post mock: 성공 응답
    - API 재호출 후 친구 목록에 해당 사용자가 나타나는지 확인

  it('왼쪽 영역(검색)과 오른쪽 영역(요청+목록)이 분리되어 렌더링된다')
    - FriendPage 렌더링
    - friend-left-area에 검색 관련 요소 존재 확인
    - friend-right-area에 친구 요청 + 친구 목록 관련 요소 존재 확인
```

---

## 4. 로딩/에러 상태 테스트

```
describe('로딩 및 에러 상태')

  it('API 호출 중 로딩 표시가 나타난다')
    - axios.get을 지연된 Promise로 mock
    - FriendPage 렌더링
    - 로딩 인디케이터(CircularProgress 또는 "로딩 중..." 텍스트)가 존재하는지 확인

  it('API 호출 실패 시 에러 메시지가 표시된다')
    - axios.get mock: 네트워크 에러 또는 500 에러 반환
    - FriendPage 렌더링
    - waitFor로 비동기 렌더링 대기
    - 에러 메시지가 화면에 표시되는지 확인

  it('로그인하지 않은 상태에서는 API를 호출하지 않는다')
    - localStorage에 user 미설정 (또는 null)
    - FriendPage 렌더링
    - axios.get이 호출되지 않았는지 확인
    - expect: not.toHaveBeenCalled()
```

---

## API 호출 정리

| 용도 | 메서드 | 엔드포인트 | 파라미터 |
|------|--------|-----------|---------|
| 친구 요청 목록 조회 | GET | `/api/friend-requests` | `user_id=1&friend_status=pending` |
| 현재 친구 목록 조회 | GET | `/api/friend-requests` | `user_id=1&friend_status=accepted` |
| 친구 승인 | POST | `/api/friend-requests/accept` | `{ requester_id, receiver_id }` |
| 친구 거절 | POST | `/api/friend-requests/reject` | `{ requester_id, receiver_id }` |

---

## 구현 순서 (TDD Red-Green-Refactor)

1. **Red**: `FriendRequest.test.jsx` 작성 - 친구 요청란 렌더링 테스트 (실패)
2. **Green**: FriendPage.jsx에 친구 요청란 UI 추가 (통과)
3. **Red**: `FriendRequest.test.jsx` - API 호출 테스트 (실패)
4. **Green**: FriendPage.jsx에 useEffect + axios GET 추가 (통과)
5. **Red**: `FriendRequest.test.jsx` - 친구 승인 버튼 테스트 (실패)
6. **Green**: FriendPage.jsx에 승인 버튼 + POST 핸들러 추가 (통과)
7. **Red**: `FriendList.test.jsx` - 현재 친구 목록 렌더링 테스트 (실패)
8. **Green**: FriendPage.jsx에 현재 친구 목록 UI 추가 (통과)
9. **Red**: `FriendList.test.jsx` - API 호출 테스트 (실패)
10. **Green**: FriendPage.jsx에 accepted 친구 목록 API 연동 (통과)
11. **Refactor**: 공통 로직 정리, 코드 정돈

---

## axios mock 패턴 예시

```javascript
import { vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');

beforeEach(() => {
  localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));

  axios.get.mockImplementation((url, config) => {
    if (config?.params?.friend_status === 'pending') {
      return Promise.resolve({ data: MOCK_PENDING_REQUESTS });
    }
    if (config?.params?.friend_status === 'accepted') {
      return Promise.resolve({ data: MOCK_ACCEPTED_FRIENDS });
    }
    return Promise.resolve({ data: { requests: [] } });
  });

  axios.post.mockResolvedValue({
    data: { message: 'Friend request accepted', status: 'accepted' }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
```

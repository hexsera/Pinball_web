# TDD RED 계획: 친구페이지 검색 API 연결

## 구현 목표
FriendPage.jsx의 검색 기능과 친구추가 기능을 실제 API와 연결한다.
1. 닉네임 검색 시 `GET /api/v1/users?nickname=...` 호출
2. "친구추가" 버튼 클릭 시 `POST /api/friend-requests` 호출
3. 이미 친구이거나 요청을 보낸 경우 버튼을 "요청됨"으로 변경하고 비활성화

## RED 테스트 목록

### 검색 API 연결 (FriendSearch.test.jsx 교체)
1. `닉네임 검색 시 GET /api/v1/users API를 호출한다`: 검색 버튼 클릭 시 axios.get('/api/v1/users', { params: { nickname } }) 호출 검증
2. `API 응답의 사용자 목록이 검색 결과로 표시된다`: mock API 응답 데이터의 nickname이 화면에 렌더링됨 검증
3. `API 호출 실패 시 에러 메시지를 표시한다`: API 오류 응답 시 에러 문구 표시 검증
4. `검색 결과가 빈 배열이면 안내 메시지를 표시한다`: 빈 배열 응답 시 "검색 결과가 없습니다" 표시 검증

### 친구추가 API 연결
5. `"친구추가" 버튼 클릭 시 POST /api/friend-requests를 호출한다`: requester_id(현재 유저), receiver_id(검색 결과 유저) body로 전송 검증
6. `친구추가 API 호출 실패 시 에러를 표시한다`: POST 실패 시 에러 메시지 표시 검증

### 버튼 상태 제어
7. `현재 친구인 유저의 친구추가 버튼은 "요청됨"으로 표시된다`: friendList에 이미 있는 유저는 버튼 텍스트가 "요청됨"
8. `pending 요청을 보낸 유저의 친구추가 버튼은 "요청됨"으로 표시된다`: pendingRequests에 requester_id가 현재 유저인 항목의 receiver가 검색 결과에 있으면 버튼 "요청됨"
9. `"요청됨" 버튼은 비활성화(disabled) 상태이다`: 위 두 경우 버튼 disabled 검증
10. `아직 친구가 아닌 유저의 친구추가 버튼은 활성화되어 있다`: 관계 없는 유저의 버튼은 활성화 상태

## 테스트 파일 위치
`frontend/src/test/FriendSearch.test.jsx` (기존 파일 교체)

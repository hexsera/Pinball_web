# TDD RED 계획: NoticeListPage (섹션 3)

## 구현 목표

`frontend/src/pages/Notice/NoticeListPage.jsx`를 stub에서 정식 구현으로 교체한다.

- `GET /api/v1/notices` 호출로 공지사항 목록을 로드한다.
- admin일 때만 글쓰기 버튼을 노출한다.
- 각 공지 항목 클릭 시 `/notice/{id}`로 이동한다.
- 날짜를 `ko-KR` 형식으로 표시한다.

---

## RED 테스트 목록

> 헤딩 텍스트 및 날짜 표시 형식은 현재 미정이므로 테스트에서 제외한다.

### 파일: `frontend/src/test/NoticeListPage.test.jsx`

#### 데이터 로딩
1. `페이지 접속 시 getNotices가 호출된다`
   — 마운트 시 `getNotices()` 서비스 함수가 1회 호출됨을 확인
2. `API 응답의 공지 제목들이 목록에 표시된다`
   — 반환된 notices 배열의 title 텍스트가 화면에 렌더링됨을 확인

#### admin 접근 제어
3. `비로그인 상태에서 글쓰기 버튼이 보이지 않는다`
   — `user=null`일 때 "글쓰기" 버튼 미노출 확인
4. `일반 사용자(role=user)에게 글쓰기 버튼이 보이지 않는다`
   — `user.role='user'`일 때 "글쓰기" 버튼 미노출 확인
5. `admin에게 글쓰기 버튼이 보인다`
   — `user.role='admin'`일 때 "글쓰기" 버튼 노출 확인

#### 네비게이션
6. `글쓰기 버튼 클릭 시 /notice/write로 이동한다`
   — admin이 글쓰기 클릭 → `navigate('/notice/write')` 호출 확인
7. `공지 항목 클릭 시 /notice/{id}로 이동한다`
   — 공지 제목 클릭 → `navigate('/notice/1')` 호출 확인

---

## 테스트 파일 위치

| 파일 | 경로 |
|------|------|
| 목록 페이지 테스트 | `frontend/src/test/NoticeListPage.test.jsx` |

---

## Mock 전략

| 대상 | 방법 |
|------|------|
| `noticeService.getNotices` | `vi.mock('../services/noticeService')` — 공지 배열 반환 |
| `react-router-dom useNavigate` | `vi.mock` — `mockNavigate` 함수로 교체 |
| `AuthContext` | localStorage에 user 세팅 후 `AuthProvider` 래핑 |

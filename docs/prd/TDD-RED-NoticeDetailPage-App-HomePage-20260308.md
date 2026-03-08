# TDD RED 계획: NoticeDetailPage + App 라우트 + HomePage 버튼

## 구현 목표

- 섹터 5: `NoticeDetailPage.jsx` stub을 정식 구현으로 교체
- 섹터 6: `App.jsx` 공지사항 라우트의 TODO 주석 제거 (라우트 자체는 이미 등록됨)
- 섹터 7: `HomePage.jsx` AppBar에 공지사항 버튼 추가

## RED 테스트 목록

### NoticeDetailPage (섹터 5)

1. `공지 데이터 로딩 - 페이지 접속 시 getNotice(id)가 호출된다`: URL param `:id`를 읽어 API를 호출한다
2. `공지 데이터 로딩 - API 응답의 제목이 표시된다`: `notice.title`이 화면에 렌더링된다
3. `공지 데이터 로딩 - API 응답의 날짜가 표시된다`: `notice.created_at`을 한국어 날짜 형식으로 표시한다
4. `공지 데이터 로딩 - API 응답의 HTML 콘텐츠가 렌더링된다`: `notice.content`가 innerHTML로 삽입된다
5. `접근 제어 - 비로그인/일반 사용자에게 수정·삭제 버튼이 보이지 않는다`
6. `접근 제어 - admin에게 삭제 버튼이 보인다`
7. `네비게이션 - 목록으로 버튼 클릭 시 /notice로 이동한다`
8. `네비게이션 - admin이 삭제 버튼 클릭 시 deleteNotice를 호출하고 /notice로 이동한다`

### HomePage 공지사항 버튼 (섹터 7)

9. `HomePage - AppBar에 공지사항 버튼이 존재한다`
10. `HomePage - 공지사항 버튼 클릭 시 /notice로 이동한다`

## 테스트 파일 위치

- `frontend/src/test/NoticeDetailPage.test.jsx` (신규 생성)
- `frontend/src/test/HomePage.test.jsx` (기존 파일에 테스트 추가)

## 비고

- 섹터 6(App.jsx 라우트)은 라우트 자체가 이미 등록되어 있고, TODO 주석 제거는 코드 정리이므로 별도 RED 테스트 불필요.
  GREEN 단계에서 NoticeDetailPage 정식 구현 완료 후 TODO 주석만 제거한다.

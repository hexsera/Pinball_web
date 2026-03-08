# TDD GREEN 완료: NoticeDetailPage + App.jsx (섹터 5, 6)

## 구현 완료 항목

- `NoticeDetailPage.jsx` stub을 정식 구현으로 교체
  - URL param `id`로 `getNotice(id)` 호출 (useEffect)
  - 제목, 날짜(ko-KR 형식), HTML 콘텐츠(`dangerouslySetInnerHTML`) 렌더링
  - `user?.role === 'admin'`일 때만 삭제 버튼 노출
  - 삭제 버튼 클릭 시 `deleteNotice(id)` 호출 후 `/notice` 이동
  - 목록으로 버튼 클릭 시 `/notice` 이동
- `App.jsx` 공지사항 라우트 TODO 주석 제거 (섹터 6 정식 완료 처리)

## 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/pages/Notice/NoticeDetailPage.jsx` | stub → 정식 구현으로 교체 |
| `frontend/src/test/NoticeDetailPage.test.jsx` | 신규 생성 — 9개 RED 테스트 |
| `frontend/src/App.jsx` | 공지사항 라우트 TODO 주석 제거 |
| `docs/prd/TDD-RED-NoticeDetailPage-App-HomePage-20260308.md` | RED 계획서 |

## 통과한 테스트 목록 (9개)

1. 페이지 접속 시 getNotice(id)가 호출된다
2. API 응답의 제목이 화면에 표시된다
3. API 응답의 날짜가 한국어 형식으로 표시된다
4. API 응답의 HTML 콘텐츠가 렌더링된다
5. 비로그인 사용자에게 삭제 버튼이 보이지 않는다
6. 일반 사용자에게 삭제 버튼이 보이지 않는다
7. admin에게 삭제 버튼이 보인다
8. 목록으로 버튼 클릭 시 /notice로 이동한다
9. admin이 삭제 버튼 클릭 시 deleteNotice를 호출하고 /notice로 이동한다

## 전체 공지사항 테스트 통과 현황

| 파일 | 테스트 수 |
|------|----------|
| noticeService.test.js | 10개 |
| NoticeListPage.test.jsx | 7개 |
| NoticeDetailPage.test.jsx | 9개 |
| **합계** | **26개** |

## 보류 항목

- 섹터 7(HomePage 공지사항 버튼): 기존 HomePage.test.jsx의 AuthContext mock 문제로 사용자 결정에 따라 제외

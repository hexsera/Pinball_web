# TDD GREEN 완료: NoticeListPage (섹션 3)

## 구현 완료 항목

- `NoticeListPage.jsx` stub을 정식 구현으로 교체
- `GET /api/v1/notices` 호출로 공지 목록 로드 (useEffect + getNotices)
- `user?.role === 'admin'`일 때만 글쓰기 버튼 노출
- 각 공지 항목 클릭 시 `/notice/{id}`로 navigate
- 기존 HomePage와 동일한 COLORS 상수 및 MUI 컴포넌트 스타일 적용

## 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/pages/Notice/NoticeListPage.jsx` | stub → 정식 구현으로 교체 |
| `frontend/src/test/NoticeListPage.test.jsx` | 신규 생성 — 7개 RED 테스트 |
| `docs/prd/TDD-RED-NoticeListPage-20260308.md` | RED 계획서 |

## 통과한 테스트 목록 (7개)

1. 페이지 접속 시 getNotices가 호출된다
2. API 응답의 공지 제목들이 목록에 표시된다
3. 비로그인 상태에서 글쓰기 버튼이 보이지 않는다
4. 일반 사용자(role=user)에게 글쓰기 버튼이 보이지 않는다
5. admin에게 글쓰기 버튼이 보인다
6. 글쓰기 버튼 클릭 시 /notice/write로 이동한다
7. 공지 항목 클릭 시 /notice/{id}로 이동한다

## 알려진 경고

- `ListItem button={true}` — MUI v5에서 `button` prop이 boolean을 비권장. REFACTOR 단계에서 `component="div"` + `onClick`으로 교체 예정.

## 다음 단계

- REFACTOR: ListItem `button` prop 제거, `component="div"` 적용
- 섹션 5(NoticeDetailPage), 섹션 6(App.jsx 라우트), 섹션 7(HomePage 버튼) 구현

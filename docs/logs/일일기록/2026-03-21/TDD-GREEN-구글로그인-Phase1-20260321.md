# TDD GREEN 완료: 구글 로그인 Phase 1 (Frontend)

## 구현 완료 항목
- `@react-oauth/google` 패키지 설치
- `GoogleOAuthProvider`로 앱 전체 래핑 (main.jsx)
- `useGoogleLogin` hook 추가 + 구글 로그인 버튼 추가 (Login.jsx)
- `VITE_GOOGLE_CLIENT_ID` 환경변수 추가 (frontend/.env)

## 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/main.jsx` | `GoogleOAuthProvider` import 및 App 래핑 |
| `frontend/src/pages/Login/Login.jsx` | `useGoogleLogin` import, hook 선언, 구글 로그인 버튼 추가 |
| `frontend/.env` | `VITE_GOOGLE_CLIENT_ID=your_google_client_id_here` 추가 (신규 생성) |
| `frontend/package.json` | `@react-oauth/google` 의존성 추가 |

## 통과한 테스트 목록
1. ✅ 로그인 성공 시 localStorage에 email이 저장된다 (회귀)
2. ✅ 구글 로그인 버튼이 렌더링된다
3. ✅ 구글 로그인 버튼 클릭 시 googleLogin 함수가 호출된다
4. ✅ 구글 로그인 성공 시 POST /api/v1/auth/google를 호출한다
5. ✅ 구글 로그인 성공 후 role=user이면 /로 이동한다
6. ✅ 구글 로그인 성공 후 role=admin이면 /admin으로 이동한다
7. ✅ 구글 로그인 실패 시 alert를 호출한다

## 다음 단계
- REFACTOR 단계 또는 Phase 2 (Backend) 구현
- `frontend/.env`의 `VITE_GOOGLE_CLIENT_ID` 값은 Phase 3 (Google Cloud Console) 완료 후 실제 값으로 교체 필요

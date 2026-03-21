# TDD RED 계획: 구글 로그인 Phase 1 (Frontend)

## 구현 목표
Google OAuth 2.0 Authorization Code Flow를 사용하여 프론트엔드에 구글 로그인 버튼을 추가한다.
- `@react-oauth/google` 패키지 설치
- `GoogleOAuthProvider`로 앱 래핑 (main.jsx)
- 로그인 페이지에 구글 로그인 버튼 추가 (Login.jsx)
- 환경변수 추가 (frontend/.env)

> **범위**: Phase 1 (Frontend) 만 진행. Phase 2 (Backend), Phase 3 (Google Cloud Console)은 제외.

## RED 테스트 목록

1. **구글 로그인 버튼이 렌더링된다**: 로그인 페이지에 "구글로 로그인" 텍스트를 가진 버튼이 존재한다
2. **구글 로그인 버튼 클릭 시 googleLogin이 호출된다**: 버튼 클릭 시 useGoogleLogin hook의 반환 함수가 호출된다
3. **구글 로그인 성공 시 POST /api/v1/auth/google를 호출한다**: onSuccess 콜백에서 code를 포함해 백엔드 엔드포인트로 요청한다
4. **구글 로그인 성공 후 role=user이면 /로 이동한다**: 응답 role이 'user'이면 navigate('/')가 호출된다
5. **구글 로그인 성공 후 role=admin이면 /admin으로 이동한다**: 응답 role이 'admin'이면 navigate('/admin')이 호출된다
6. **구글 로그인 실패 시 alert를 호출한다**: onError 콜백에서 alert('구글 로그인에 실패했습니다.')가 호출된다

## 테스트 파일 위치
`frontend/src/test/Login.test.jsx` (기존 파일에 테스트 추가)

## 기존 회귀 테스트
- 기존 "로그인 성공 시 localStorage에 email이 저장된다" 테스트가 여전히 통과해야 한다

## Mock 전략
- `@react-oauth/google`의 `useGoogleLogin`을 vi.mock으로 모킹
- `GoogleOAuthProvider`는 테스트용 래퍼로 처리
- `axios.post`는 기존과 동일하게 vi.mock 사용

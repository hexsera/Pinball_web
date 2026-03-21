# TDD RED 계획: 구글 로그인 Phase 2 (Backend)

## 구현 목표

Google OAuth 2.0 Authorization Code Flow 백엔드 구현:
- `POST /api/v1/auth/google` 엔드포인트
- Authorization Code → Google Token 교환 → userinfo 조회
- DB 사용자 자동 생성(신규) 또는 조회(기존)
- 기존 `LoginResponse` 형태로 응답

## RED 테스트 목록

### 스키마 테스트 (`test_google_auth.py`)

1. `test_google_login_request_schema_requires_code`
   - `GoogleLoginRequest`에 `code` 필드가 필수임을 검증
   - code 없이 인스턴스 생성 시 ValidationError 발생

2. `test_google_login_request_schema_accepts_code`
   - `GoogleLoginRequest`에 유효한 code 전달 시 정상 생성

### 엔드포인트 테스트 (외부 API mock 필수)

3. `test_google_login_creates_new_user`
   - DB에 없는 구글 이메일로 로그인 시 → 새 User 자동 생성
   - 응답: `{ message, user_id, email, nickname, role }`

4. `test_google_login_returns_existing_user`
   - DB에 이미 있는 이메일로 구글 로그인 시 → 기존 User 반환 (중복 생성 없음)

5. `test_google_login_new_user_has_null_password`
   - 구글 로그인으로 생성된 User의 password가 None임을 검증

6. `test_google_login_nickname_from_google_name`
   - Google userinfo의 `name` 필드가 nickname으로 저장됨을 검증

7. `test_google_login_nickname_fallback_when_no_name`
   - Google userinfo에 `name`이 없을 때 email @ 앞부분이 nickname으로 저장됨

8. `test_google_login_fails_when_google_userinfo_fails`
   - Google userinfo 조회 실패(401 등) 시 → HTTP 401 반환

9. `test_google_login_missing_code_returns_422`
   - 요청 body에 `code` 없이 POST 시 → 422 Unprocessable Entity

### 모델 테스트

10. `test_user_model_password_nullable`
    - User 모델에서 password=None으로 저장 가능함을 검증

11. `test_user_model_birth_date_nullable`
    - User 모델에서 birth_date=None으로 저장 가능함을 검증

## Mock 전략

Google 외부 API 호출은 `unittest.mock.patch`로 mock:
- `app.api.v1.auth.AsyncOAuth2Client` 전체를 mock (context manager 패턴)
- `fetch_token()` → 가짜 token dict 반환
- `client.get(userinfo_url)` → 가짜 userinfo JSON 반환

## 테스트 파일 위치

`backend/tests/test_google_auth.py`

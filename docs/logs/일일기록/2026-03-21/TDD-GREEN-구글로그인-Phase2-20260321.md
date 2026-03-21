# TDD GREEN 완료: 구글 로그인 Phase 2 (Backend)

## 구현 완료 항목

- `GoogleLoginRequest` 스키마 추가 (`code: str` 필드)
- `User.password`, `User.birth_date` nullable=True 변경
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI 설정 추가
- `POST /auth/google` 엔드포인트 구현 (token 교환 → userinfo → DB upsert)
- Authlib==1.6.9 패키지 추가

## 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `backend/requirements.txt` | Authlib==1.6.9 추가 |
| `backend/app/core/config.py` | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI 추가 |
| `backend/app/schemas/user.py` | GoogleLoginRequest 스키마 추가 |
| `backend/models.py` | password, birth_date nullable=True 변경 |
| `backend/app/api/v1/auth.py` | POST /auth/google 엔드포인트 추가, AsyncOAuth2Client import 추가 |

## 통과한 테스트 목록

1. test_google_login_request_schema_requires_code
2. test_google_login_request_schema_accepts_code
3. test_user_model_password_nullable
4. test_user_model_birth_date_nullable
5. test_google_login_creates_new_user
6. test_google_login_returns_existing_user
7. test_google_login_new_user_has_null_password
8. test_google_login_nickname_from_google_name
9. test_google_login_nickname_fallback_when_no_name
10. test_google_login_fails_when_google_userinfo_fails
11. test_google_login_missing_code_returns_422

## 다음 단계

- REFACTOR 단계 (필요시)
- alembic 마이그레이션: `password`, `birth_date` nullable 변경을 프로덕션 DB에 반영
- Phase 3: Google Cloud Console에서 OAuth 클라이언트 ID 발급 및 환경변수 설정

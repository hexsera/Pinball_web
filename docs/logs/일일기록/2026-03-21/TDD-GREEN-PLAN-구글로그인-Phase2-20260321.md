# TDD GREEN 계획: 구글 로그인 Phase 2 (Backend)

## 통과시킬 테스트 목록

1. `test_google_login_request_schema_requires_code`: GoogleLoginRequest 스키마 존재 + code 필수
2. `test_google_login_request_schema_accepts_code`: code 전달 시 정상 생성
3. `test_user_model_password_nullable`: User.password nullable
4. `test_user_model_birth_date_nullable`: User.birth_date nullable
5. `test_google_login_creates_new_user`: 신규 유저 자동 생성 + LoginResponse 반환
6. `test_google_login_returns_existing_user`: 기존 유저 반환 (중복 없음)
7. `test_google_login_new_user_has_null_password`: 생성된 유저 password=None
8. `test_google_login_nickname_from_google_name`: Google name → nickname
9. `test_google_login_nickname_fallback_when_no_name`: name 없으면 email 앞부분
10. `test_google_login_fails_when_google_userinfo_fails`: userinfo 실패 → 401
11. `test_google_login_missing_code_returns_422`: code 없음 → 422

## 구현 계획

| 테스트 | 작성할 코드 | 파일 위치 |
|--------|-----------|----------|
| 1, 2 | `GoogleLoginRequest(BaseModel): code: str` 추가 | `backend/app/schemas/user.py` |
| 3, 4 | `password`, `birth_date` 컬럼 `nullable=True` 변경 | `backend/models.py` |
| 5~10 | `POST /auth/google` 엔드포인트 추가 | `backend/app/api/v1/auth.py` |
| 5~10 | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI 추가 | `backend/app/core/config.py` |
| 5~10 | Authlib==1.6.9, httpx==0.27.0 추가 | `backend/requirements.txt` |
| 11 | Pydantic 스키마가 자동으로 422 처리 (추가 작업 불필요) | - |

## 구현 원칙

- 각 테스트를 통과하는 데 필요한 최소한의 코드만 작성
- 리팩토링, 최적화, 기능 추가 없음
- DB 마이그레이션: 테스트 DB는 fixture가 자동 반영, 프로덕션은 별도 alembic 실행 필요

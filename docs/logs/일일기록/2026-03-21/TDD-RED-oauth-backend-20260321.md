# TDD RED 계획: OAuth 2.0 Authorization Server (PHASE 2 백엔드)

## 구현 목표

FastAPI 백엔드에 OAuth 2.0 Authorization Code Flow를 구현한다.
- Authorization Code 임시 저장소 (in-memory)
- JWT Access Token / Refresh Token 발급 및 검증
- Authorization Endpoint (`GET /api/v1/oauth/authorize`)
- Token Endpoint (`POST /api/v1/oauth/token`)
- Bearer Token 인증 의존성 (`get_current_user`)

---

## RED 테스트 목록

### 파일 1: `backend/tests/test_auth_codes.py`
> auth_codes.py 모듈 테스트

1. `test_create_code_returns_string` — create_code()가 문자열을 반환한다
2. `test_create_code_is_unique` — 동일한 인자로 두 번 호출하면 다른 code가 반환된다
3. `test_consume_code_returns_data` — create 후 consume 하면 user_id/client_id/redirect_uri가 포함된 dict를 반환한다
4. `test_consume_code_deletes_code` — consume 후 같은 code를 다시 consume하면 None을 반환한다 (재사용 방지)
5. `test_consume_code_expired_returns_none` — 만료된 code를 consume하면 None을 반환한다
6. `test_consume_nonexistent_code_returns_none` — 존재하지 않는 code를 consume하면 None을 반환한다

### 파일 2: `backend/tests/test_jwt_utils.py`
> jwt_utils.py 모듈 테스트

7. `test_create_access_token_returns_string` — create_access_token()이 문자열(JWT)을 반환한다
8. `test_access_token_payload_contains_required_fields` — Access Token decode 시 sub/email/role/type/exp/iat가 포함된다
9. `test_access_token_type_is_access` — Access Token의 type 필드가 'access'다
10. `test_access_token_sub_is_user_id_string` — sub 필드가 user_id를 str로 저장한다
11. `test_create_refresh_token_returns_string` — create_refresh_token()이 문자열(JWT)을 반환한다
12. `test_refresh_token_type_is_refresh` — Refresh Token의 type 필드가 'refresh'다
13. `test_refresh_token_has_no_email_or_role` — Refresh Token에 email/role 필드가 없다
14. `test_decode_token_returns_payload` — decode_token()이 encode 한 payload를 그대로 반환한다
15. `test_decode_token_invalid_raises_exception` — 잘못된 토큰을 decode하면 예외가 발생한다

### 파일 3: `backend/tests/test_oauth_endpoints.py`
> oauth.py 엔드포인트 테스트

**Authorization Endpoint**

16. `test_authorize_invalid_client_id_returns_400` — 존재하지 않는 client_id로 요청하면 400을 반환한다
17. `test_authorize_invalid_redirect_uri_returns_400` — 허용되지 않은 redirect_uri로 요청하면 400을 반환한다
18. `test_authorize_unauthenticated_redirects_to_login` — 미인증 상태에서 요청하면 /login으로 리다이렉트한다
19. `test_authorize_authenticated_returns_code_in_redirect` — 인증된 상태에서 요청하면 redirect_uri에 code 파라미터가 포함된다
20. `test_authorize_authenticated_state_preserved_in_redirect` — 인증된 상태에서 요청하면 redirect_uri에 state 파라미터가 그대로 포함된다

**Token Endpoint**

21. `test_token_valid_code_returns_tokens` — 유효한 code로 요청하면 access_token/refresh_token/token_type/expires_in/user가 반환된다
22. `test_token_invalid_code_returns_400` — 유효하지 않은 code로 요청하면 400을 반환한다
23. `test_token_expired_code_returns_400` — 만료된 code로 요청하면 400을 반환한다
24. `test_token_wrong_redirect_uri_returns_400` — redirect_uri가 code 발급 시와 다르면 400을 반환한다
25. `test_token_code_cannot_be_reused` — 동일한 code로 두 번 요청하면 두 번째는 400을 반환한다
26. `test_token_response_contains_user_info` — 응답에 user.id/user.email/user.nickname/user.role이 포함된다

### 파일 4: `backend/tests/test_bearer_auth.py`
> Bearer Token 인증 의존성 테스트

27. `test_bearer_valid_token_returns_user` — 유효한 Bearer Token으로 보호된 엔드포인트에 접근하면 성공한다
28. `test_bearer_missing_token_returns_401` — Authorization 헤더 없이 보호된 엔드포인트에 접근하면 401을 반환한다
29. `test_bearer_invalid_token_returns_401` — 잘못된 JWT로 접근하면 401을 반환한다
30. `test_bearer_nonexistent_user_returns_401` — 유효한 JWT지만 DB에 없는 user_id면 401을 반환한다

---

## 테스트 파일 위치

| 파일 | 테스트 대상 |
|------|------------|
| `backend/tests/test_auth_codes.py` | `backend/app/core/auth_codes.py` |
| `backend/tests/test_jwt_utils.py` | `backend/app/core/jwt_utils.py` |
| `backend/tests/test_oauth_endpoints.py` | `backend/app/api/v1/oauth.py` |
| `backend/tests/test_bearer_auth.py` | `backend/app/core/dependencies.py` (Bearer 의존성) |

## 실행 명령어

```bash
docker compose exec fastapi pytest tests/test_auth_codes.py tests/test_jwt_utils.py tests/test_oauth_endpoints.py tests/test_bearer_auth.py -v
```

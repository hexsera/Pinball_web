# TDD GREEN 완료: OAuth 2.0 Authorization Server 백엔드

## 구현 완료 항목

- Authorization Code 임시 저장소 (in-memory, 10분 유효, 재사용 방지)
- JWT Access Token (1시간) / Refresh Token (30일) 생성 및 검증
- OAuth Authorization Endpoint (`GET /api/v1/oauth/authorize`)
- OAuth Token Endpoint (`POST /api/v1/oauth/token`)
- Bearer Token 인증 의존성 (`get_current_user`, `get_current_user_optional`)
- Bearer Token 보호 엔드포인트 (`GET /api/v1/oauth/me`)

## 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `backend/requirements.txt` | `python-jose[cryptography]==3.3.0`, `python-multipart` 추가 |
| `backend/app/core/oauth_clients.py` | 신규 — 내부 클라이언트 설정 |
| `backend/app/core/auth_codes.py` | 신규 — `create_code`, `consume_code` |
| `backend/app/core/config.py` | `SECRET_KEY` 필드 추가 |
| `backend/app/core/jwt_utils.py` | 신규 — `create_access_token`, `create_refresh_token`, `decode_token` |
| `backend/app/core/dependencies.py` | 신규 — `get_current_user`, `get_current_user_optional` |
| `backend/app/api/v1/oauth.py` | 신규 — `/authorize`, `/token`, `/me` |
| `backend/main.py` | oauth 라우터 등록 |

## 통과한 테스트 목록 (30개)

### test_auth_codes.py (6개)
1. test_create_code_returns_string ✅
2. test_create_code_is_unique ✅
3. test_consume_code_returns_data ✅
4. test_consume_code_deletes_code ✅
5. test_consume_code_expired_returns_none ✅
6. test_consume_nonexistent_code_returns_none ✅

### test_jwt_utils.py (9개)
7. test_create_access_token_returns_string ✅
8. test_access_token_payload_contains_required_fields ✅
9. test_access_token_type_is_access ✅
10. test_access_token_sub_is_user_id_string ✅
11. test_create_refresh_token_returns_string ✅
12. test_refresh_token_type_is_refresh ✅
13. test_refresh_token_has_no_email_or_role ✅
14. test_decode_token_returns_payload ✅
15. test_decode_token_invalid_raises_exception ✅

### test_oauth_endpoints.py (11개)
16. test_authorize_invalid_client_id_returns_400 ✅
17. test_authorize_invalid_redirect_uri_returns_400 ✅
18. test_authorize_unauthenticated_redirects_to_login ✅
19. test_authorize_authenticated_returns_code_in_redirect ✅
20. test_authorize_authenticated_state_preserved_in_redirect ✅
21. test_token_valid_code_returns_tokens ✅
22. test_token_invalid_code_returns_400 ✅
23. test_token_expired_code_returns_400 ✅
24. test_token_wrong_redirect_uri_returns_400 ✅
25. test_token_code_cannot_be_reused ✅
26. test_token_response_contains_user_info ✅

### test_bearer_auth.py (4개)
27. test_bearer_valid_token_returns_user ✅
28. test_bearer_missing_token_returns_401 ✅
29. test_bearer_invalid_token_returns_401 ✅
30. test_bearer_nonexistent_user_returns_401 ✅

## 기존 테스트 회귀 없음

- test_google_auth.py: 13개 PASSED
- test_friend_requests.py: 6개 PASSED

## 다음 단계

- REFACTOR 단계: 코드 정리 (중복 제거, `sys.path.insert` 패턴 통일 등)

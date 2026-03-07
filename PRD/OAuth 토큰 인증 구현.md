# OAuth 토큰 인증 구현 PRD

## 목표

현재 평문 비밀번호 비교 + localStorage 기반 인증을 JWT(JSON Web Token) 방식으로 교체한다.
로그인 시 서버가 Access Token과 Refresh Token을 발급하고, 이후 모든 보호된 API 요청에 토큰을 첨부해 사용자를 검증한다.
비밀번호는 bcrypt로 해싱해 DB에 저장한다.

## 현재상태 분석

- `backend/app/api/v1/auth.py`: 평문 비밀번호를 DB에서 직접 `==` 비교. 해싱 없음.
- `backend/app/core/security.py`: API Key(`X-API-Key` 헤더) 방식만 구현. JWT 없음.
- `frontend/src/contexts/AuthContext.jsx`: 로그인 응답 `{user_id, email, nickname, role}`을 localStorage에 JSON으로 저장. 토큰 없음.
- 모든 API 엔드포인트가 인증 없이 접근 가능 (API Key 의존성도 실제 미적용 상태).

## 실행 방법 및 단계

1. **백엔드 패키지 추가**: `requirements.txt`에 `python-jose[cryptography]`, `passlib[bcrypt]` 추가.
2. **보안 유틸 구현**: `backend/app/core/security.py`에 비밀번호 해싱/검증, JWT 생성/검증 함수 추가.
3. **환경변수 추가**: `backend/.env`에 `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` 추가.
4. **DB 마이그레이션**: `users.password` 컬럼을 해시 저장 가능한 길이(255자)로 확인 및 기존 유저 비밀번호 재해싱.
5. **Refresh Token 저장**: `users` 테이블에 `refresh_token` 컬럼 추가 (Alembic 마이그레이션).
6. **auth.py 수정**: 로그인 시 bcrypt 검증 + Access/Refresh Token 반환. `/api/v1/token/refresh` 엔드포인트 추가.
7. **인증 의존성 구현**: `backend/app/api/deps.py`에 `get_current_user()` — Authorization 헤더의 Bearer 토큰 검증.
8. **보호 API 적용**: users, monthly_scores, game_visits, friend-requests 라우터에 `get_current_user` 의존성 적용.
9. **프론트엔드 AuthContext 수정**: localStorage에 `access_token`, `refresh_token` 저장. Axios 인터셉터로 모든 요청에 `Authorization: Bearer <token>` 헤더 자동 첨부.
10. **토큰 만료 처리**: Axios 401 응답 인터셉터에서 Refresh Token으로 재발급 시도, 실패 시 자동 로그아웃.

## 사용 할 기술 및 패키지

| 기술/패키지 | 용도 |
|-------------|------|
| `python-jose[cryptography]` | JWT 생성 및 검증 (HS256 알고리즘) |
| `passlib[bcrypt]` | 비밀번호 bcrypt 해싱 및 검증 |
| `axios interceptors` | 프론트엔드 전역 토큰 헤더 자동 첨부 및 401 처리 |
| `Alembic` | refresh_token 컬럼 추가 DB 마이그레이션 |

## 테스트 방법

1. 회원가입 후 DB에서 `password` 컬럼이 `$2b$` 로 시작하는 bcrypt 해시인지 확인.
2. 로그인 API(`POST /api/v1/login`) 응답에 `access_token`, `refresh_token`, `token_type: "bearer"` 포함 여부 확인.
3. Access Token 없이 보호된 API(`GET /api/v1/users`) 호출 시 `401 Unauthorized` 반환 확인.
4. 유효한 Access Token으로 보호된 API 호출 시 정상 응답 확인.
5. Access Token 만료 후 Refresh Token으로 `POST /api/v1/token/refresh` 호출 시 새 Access Token 발급 확인.
6. 잘못된 Refresh Token으로 재발급 시 `401` 반환 및 프론트엔드 자동 로그아웃 확인.

## 체크리스트

- [ ] 회원가입 후 DB `users.password`가 bcrypt 해시(`$2b$...`)로 저장된다.
- [ ] 로그인 응답 JSON에 `access_token`, `refresh_token`, `token_type` 필드가 존재한다.
- [ ] 토큰 없이 `/api/v1/users` 요청 시 HTTP 401이 반환된다.
- [ ] 유효한 Bearer 토큰으로 `/api/v1/users` 요청 시 HTTP 200이 반환된다.
- [ ] `/api/v1/token/refresh`에 유효한 Refresh Token 전송 시 새 Access Token이 반환된다.
- [ ] 만료되거나 위조된 토큰으로 API 호출 시 HTTP 401이 반환된다.
- [ ] 프론트엔드에서 401 수신 후 Refresh Token 재발급 실패 시 자동으로 로그아웃되고 `/login`으로 이동한다.

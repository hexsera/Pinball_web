# JWT 토큰 인증 도입 PRD

## 목표

일반 로그인 및 구글 로그인 후 JWT(JSON Web Token) 액세스 토큰을 발급하여 프론트엔드에 전달한다.
**이번 단계의 범위**: 기존 localStorage 저장 방식은 유지하면서 JWT 토큰을 추가로 응답에 포함시킨다. 프론트엔드는 토큰을 받아 저장하는 것에만 집중하며, 토큰을 이용한 API 인증 전환은 다음 단계로 미룬다.

## 현재상태 분석

- **로그인 응답**: `{message, user_id, email, nickname, role}` 평문 반환 (JWT 없음)
- **구글 로그인**: Authorization Code → userinfo 조회 → 동일한 평문 응답
- **API 보호**: 현재 관리자 전용 엔드포인트만 `X-API-Key` 헤더로 보호, 일반 유저 엔드포인트는 인증 없음
- **User 모델**: `id, user_id(UUID), email, nickname, password, birth_date, role` — OAuth 전용 필드 없음
- **JWT 관련 패키지**: `requirements.txt`에 없음 (미설치 상태)

## 실행 방법 및 단계

1. **패키지 설치**: `python-jose[cryptography]` 또는 `PyJWT` 설치, `requirements.txt` 업데이트
2. **환경변수 추가**: `backend/.env`에 `JWT_SECRET_KEY`, `JWT_ALGORITHM=HS256`, `JWT_EXPIRE_MINUTES=60` 추가
3. **config.py 수정**: 위 3개 환경변수를 `Settings` 클래스에 추가
4. **security.py 수정**: `create_access_token(data: dict) → str` 함수 추가
5. **auth.py 수정 — 일반 로그인**: 로그인 성공 시 `create_access_token` 호출 후 응답에 `access_token`, `token_type: "bearer"` 추가 (기존 필드 `user_id`, `email`, `nickname`, `role`은 그대로 유지)
6. **auth.py 수정 — 구글 로그인**: JWT 발급 추가, 구글 최초 로그인 시 자동 회원가입 처리 추가 (`birth_date`는 구글에서 제공하지 않으므로 가입 당일 날짜를 임시값으로 저장)
7. **schemas/user.py 수정**: `LoginResponse`에 `access_token: str`, `token_type: str` 필드 추가 (기존 필드 제거 없음)
8. **User 모델 수정**: `google_id` 컬럼 추가 (구글 계정 연결용 — `sub` 값 저장), Alembic 마이그레이션 생성 및 적용
9. **프론트엔드 수정**: 로그인 응답에서 `access_token`을 읽어 localStorage에 추가 저장 (기존 `user_id`, `email` 등 localStorage 저장 로직은 변경하지 않음, API 요청 헤더 변경도 이번 단계에서 제외)

## 사용할 기술 및 패키지

| 기술/패키지 | 용도 |
|-------------|------|
| `python-jose[cryptography]` | JWT 생성 및 검증 (2026 기준 FastAPI 공식 문서 권장 패키지) |
| `HS256` 알고리즘 | JWT 서명 방식 (대칭키, 단일 서버 환경에 적합) |
| `Authlib` (기존 유지) | Google OAuth Authorization Code 교환 |
| Alembic (기존 유지) | `google_id` 컬럼 추가를 위한 DB 마이그레이션 |

## 수정 대상 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `requirements.txt` | `python-jose[cryptography]` 추가 |
| `backend/.env` / `.env.example` | `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES` 추가 |
| `app/core/config.py` | JWT 환경변수 3개 Settings에 추가 |
| `app/core/security.py` | `create_access_token()` 함수 추가 |
| `app/schemas/user.py` | `LoginResponse`에 `access_token`, `token_type` 필드 추가 |
| `app/api/v1/auth.py` | 일반 로그인·구글 로그인 양쪽에 JWT 발급 로직 추가, 구글 최초 로그인 자동 회원가입 추가 |
| `models.py` | `User` 모델에 `google_id: String(255), nullable=True`, `auth_provider: String(20), default='local'` 컬럼 추가 |
| Alembic revision | `google_id`, `auth_provider` 컬럼 추가 마이그레이션 파일 생성 |
| `frontend/src/` (해당 파일) | 로그인 응답에서 `access_token` 읽어 localStorage에 추가 저장 (기존 저장 항목 유지, API 헤더 변경은 이번 단계 제외) |

## DB 테이블 변경

```
users 테이블에 컬럼 추가:
  google_id      VARCHAR(255)  NULL     -- Google userinfo의 'sub' 값 저장
  auth_provider  VARCHAR(20)   NOT NULL DEFAULT 'local'  -- 가입 경로: 'local' | 'google'
```

- 기존 rows는 `google_id = NULL`, `auth_provider = 'local'`로 마이그레이션되므로 데이터 손실 없음.
- 구글 OAuth 자동 가입 시 `auth_provider = 'google'`, `birth_date`는 가입 당일 날짜(서버 기준 `date.today()`)로 임시 저장.
- `password` 컬럼은 `auth_provider = 'google'` 계정의 경우 랜덤 UUID 해시로 채워 NOT NULL 제약을 충족시킴.
- `auth_provider`는 나중에 이메일/비밀번호 로그인 차단 여부 판단에도 활용 가능.

## 테스트 방법

1. **일반 로그인 테스트**: `POST /api/v1/login`에 올바른 이메일/비밀번호 전송 후 응답 확인
2. **구글 로그인 테스트**: `POST /api/v1/auth/google`에 유효한 Authorization Code 전송 후 응답 확인
3. **토큰 유효성 검증**: 발급된 `access_token`을 `jwt.io`에서 디코딩하여 payload 확인
4. **만료 테스트**: `JWT_EXPIRE_MINUTES=1`로 설정 후 1분 경과 뒤 토큰 디코딩 시 `exp` 만료 확인 (`jwt.io` 사용)
5. **구글 최초 로그인 자동 가입**: DB에 없는 구글 계정으로 로그인 시 자동 회원 생성 및 `birth_date`가 오늘 날짜로 저장되는지 확인
6. **localStorage 하위 호환성 확인**: 로그인 후 기존 localStorage 항목(`user_id`, `email`, `nickname`, `role`)이 그대로 존재하고 기존 코드가 정상 동작하는지 확인

## 체크리스트

- [ ] 일반 로그인 응답에 `access_token`과 `token_type: "bearer"` 필드가 포함된다
- [ ] 구글 로그인 응답에 `access_token`과 `token_type: "bearer"` 필드가 포함된다
- [ ] `jwt.io`에서 토큰 디코딩 시 `sub(user_id)`, `email`, `role`, `exp` 필드가 존재한다
- [ ] 만료된 토큰으로 요청 시 `401 Unauthorized` 응답이 반환된다
- [ ] DB에 없는 구글 계정으로 로그인하면 `users` 테이블에 새 row가 생성되고 JWT가 발급된다
- [ ] 구글 자동 가입 시 `birth_date`가 서버 기준 오늘 날짜로 저장된다
- [ ] 기존 구글 계정 사용자 재로그인 시 `google_id` 컬럼이 올바르게 매핑된다
- [ ] `users` 테이블에 `google_id`, `auth_provider` 컬럼이 추가되고 기존 데이터가 유지된다
- [ ] 일반 회원가입 유저의 `auth_provider`가 `'local'`로 저장된다
- [ ] 구글 자동 가입 유저의 `auth_provider`가 `'google'`로 저장된다
- [ ] 로그인 후 localStorage에 기존 항목(`user_id`, `email`, `nickname`, `role`)이 그대로 존재한다
- [ ] localStorage에 `access_token` 항목이 새로 추가된다
- [ ] 기존 localStorage를 읽는 프론트엔드 코드(프로필, 점수 저장 등)가 정상 동작한다

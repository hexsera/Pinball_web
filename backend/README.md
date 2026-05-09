# backend

<!--
## README 작성 요령 (Claude를 위한 가이드)

이 README는 AI가 프론트엔드를 빠르게 탐색·이해하기 위한 네비게이션 문서다.
세부 구현은 각 파일을 직접 열어서 읽도록 유도하는 것이 목적이다.

### 작성 원칙
- 각 파일 설명은 1줄로 제한. "무엇을 하는 파일인가"만 기술
- 구현 세부 사항(코드 스니펫, 동작 흐름, 함수 시그니처 등)은 적지 않는다
- API 엔드포인트는 어떤 파일에서 사용하는지 식별용으로만 기재
- 주의사항은 "이 프로젝트에서만 특이한 것"만 기재 (일반적인 라이브러리 사용법 제외)

### 업데이트 시점
업무일지를 바탕으로 README를 업데이트할 때:
1. 신규 파일이 생겼으면 디렉토리 구조에 1줄 추가
2. 라우팅이 변경됐으면 라우팅 테이블 수정
3. 기존에 없던 "특이한 주의사항"이 생겼으면 주의사항에 추가
4. 그 외 세부 변경(구현 방식, 내부 로직 등)은 README에 기록하지 않는다
-->


FastAPI 백엔드 서버. PostgreSQL/MySQL 연동, SQLAlchemy ORM, Alembic 마이그레이션 사용.

## 파일 목록

### 루트 파일

| 파일 | 역할 |
|------|------|
| `main.py` | FastAPI 앱 진입점. 라우터 등록, DB 초기화(create_all), 시딩(seed_admin) 실행 |
| `models.py` | SQLAlchemy ORM 모델 정의 (User, Friendship, MonthlyScore, GameVisit, Notice) |
| `seed.py` | Data Seeding — Admin 계정 자동 생성 (`seed_admin` 함수) |
| `seed_notices.py` | 공지사항 mock 데이터 30건 시딩 스크립트 |
| `requirements.txt` | Python 패키지 의존성 (Faker==24.0.0, redis==7.1.1 포함) |
| `Dockerfile` | FastAPI 컨테이너 빌드 설정 |
| `alembic.ini` | Alembic 설정 파일 |
| `pytest.ini` | pytest 설정 (TESTING=1 환경변수 등) |
| `.env` | 환경변수 (DB URL, API Key, Admin 계정 정보, GEMINI_API_KEY) — git 비추적 |
| `.env.example` | 환경변수 예시 파일 |

---

## app/ 디렉토리

```
app/
├── __init__.py
├── redis_client.py      # Redis 연결 클라이언트 (host: redis-server, port: 6379, decode_responses=True)
├── api/
│   ├── deps.py          # get_db() — DB 세션 의존성; get_current_user() — JWT 서명 검증 후 payload dict 반환 (Stateless, DB 조회 없음); require_admin() — admin role 전용; require_self_or_admin() — 본인 또는 admin만 통과
│   └── v1/
│       ├── __init__.py  # 모든 v1 라우터 export
│       ├── auth.py      # POST /api/v1/login, /register, /auth/refresh, /auth/logout — Access Token payload에 nickname 포함
│       ├── users.py     # CRUD /api/v1/users (GET: 로그인 가드; PUT·DELETE: 본인/admin 체크; POST: role 서버 강제 'user' 대입)
│       ├── monthly_scores.py  # /api/v1/monthly-scores (월간 점수, Redis Sorted Set 캐시)
│       ├── game_visits.py     # /api/v1/game_visits (방문 기록)
│       ├── game_sessions.py   # /api/v1/game-sessions (게임 세션, Redis 사용; 인증 없음)
│       ├── notices.py   # CRUD /api/v1/notices (공지사항; 인증 없음, author_id=1 고정)
│       ├── friends.py   # /api/friend-requests (친구 요청)
│       ├── chat.py      # GET /api/v1/chat/models, POST /api/v1/chat (Gemini AI 채팅)
│       └── pinball_ai.py  # POST /api/v1/pinball_ai/playstyle (Gemini 플레이스타일 분석)
├── core/
│   ├── config.py        # Settings 클래스 — 환경변수 로드 (DATABASE_URL, JWT_SECRET_KEY, REFRESH_TOKEN_EXPIRE_DAYS 등)
│   └── security.py      # hash_password(), verify_password(), create_access_token(), create_refresh_token()
├── db/
│   ├── base.py          # Base + 모든 모델 import (Alembic autogenerate용)
│   └── session.py       # engine, SessionLocal, Base (DeclarativeBase 방식), wait_for_db()
└── schemas/
    ├── __init__.py      # 모든 스키마 한 번에 export
    ├── user.py          # UserCreateRequest, UserRegisterRequest, UserUpdateRequest, UserResponse, LoginRequest, LoginResponse, DeleteResponse
    ├── monthly_score.py # MonthlyScoreCreateRequest/UpdateRequest/Response/ListResponse/DeleteResponse
    ├── game_visit.py    # GameVisitCreateRequest/UpdateRequest/Response, DailyVisitStats 등
    ├── game_session.py  # GameSessionSaveRequest/Response
    ├── notices.py       # NoticeCreateRequest, NoticeResponse, NoticeListResponse, NoticeListResult
    ├── friendship.py    # FriendRequestRequest/Response/Data/ListResponse/ActionRequest/ActionResponse
    ├── chat.py          # ChatRequest, ChatResponse
    └── pinball_ai.py    # PlayDataPoint, PlaystyleRequest, PlaystyleResponse
```

---

## alembic/ 디렉토리

```
alembic/
├── README              # Alembic 기본 설명
├── env.py              # Alembic 환경 설정 (Base.metadata 연결, 환경변수 로드)
├── script.py.mako      # 마이그레이션 파일 템플릿
├── versions/           # 마이그레이션 파일
│   ├── 60a77f2baf38_initial_schema.py
│   ├── e529d64d1a07_drop_high_scores_table.py
│   └── 20e256d6d379_drop_scores_table.py
└── versions_mysql_backup/  # MySQL 시절 마이그레이션 백업
```

---

## scripts/ 디렉토리

```
scripts/
├── __init__.py
├── rehash_passwords.py                 # DB의 평문 비밀번호를 bcrypt로 일괄 재해싱 (1회성 마이그레이션 스크립트)
└── mock/
    ├── __init__.py
    ├── seed_mock_data.py               # users 50명 + monthly_scores 50개 mock 삽입 (Faker 사용)
    └── seed_friendships_gamevisits.py  # friendships 80건 + game_visits 200건 mock 삽입
```

실행: `docker compose exec fastapi python scripts/mock/<파일명>.py`

---

## tests/ 디렉토리

```
tests/
├── README.md           # 테스트 작성 가이드
├── __init__.py
├── conftest.py         # pytest fixture — client, auth_client(JWT 자동 부착), db_session, TRUNCATE 격리
├── test_example.py     # 예시 테스트
├── test_friend_requests.py  # 친구 요청 API 테스트
├── test_monthly_scores_fk.py # 월간 점수 FK 테스트
├── test_pinball_ai.py        # 플레이스타일 분석 API 테스트 5개 (Gemini mock 사용)
├── test_game_sessions.py     # 게임 세션 API 테스트 (auth_client 사용)
└── test_testdb.py           # 테스트 DB 연결 확인
```

---

## DB 모델 요약

| 모델 | 테이블 | 주요 필드 |
|------|--------|-----------|
| User | users | id, user_id(UUID), email(UNIQUE), nickname, password, birth_date, role |
| Friendship | friendships | id, requester_id(FK→users), receiver_id(FK→users), status, created_at |
| MonthlyScore | monthly_scores | id, user_id(FK→users), nickname, score, created_at |
| GameVisit | game_visits | id, user_id(FK→users, nullable), ip_address, is_visits, created_at, updated_at |
| Notice | notices | id, title, author_id(FK→users), content(Text), created_at, updated_at |

---

## API 엔드포인트 요약

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | /api/ | 없음 | 헬스 체크 |
| GET | /api/test | 없음 | API 상태 확인 |
| GET | /api/debug/db-info | 없음 | DB 연결 정보 확인 |
| POST | /api/v1/login | 없음 | 로그인 (Access Token + Refresh Token 쿠키 발급) |
| POST | /api/v1/register | 없음 | 일반 회원가입 |
| POST | /api/v1/auth/refresh | 없음 (쿠키) | Refresh Token으로 Access Token 재발급 |
| POST | /api/v1/auth/logout | 없음 (쿠키) | Refresh Token Redis 폐기 + 쿠키 삭제 |
| POST | /api/v1/users | 없음 | 회원가입 (role 서버 강제 'user') |
| GET | /api/v1/users | JWT | 사용자 목록 조회 (로그인 필요) |
| GET | /api/v1/users/{user_id} | JWT | 사용자 상세 조회 (로그인 필요) |
| PUT/DELETE | /api/v1/users/{user_id} | 본인/admin | 사용자 수정·삭제 (본인 또는 admin)
| POST/GET/PUT/DELETE | /api/v1/monthly-scores | 없음 | 월간 점수 관리 (GET: Redis Sorted Set 캐시) |
| POST/GET/PUT/DELETE | /api/v1/game_visits | 없음 | 게임 방문 기록 |
| GET | /api/v1/game-sessions/{user_id} | 없음 | 게임 세션 조회 (Redis) |
| PUT/DELETE | /api/v1/game-sessions/{user_id} | 없음 | 게임 세션 저장·삭제 |
| GET | /api/v1/notices | 없음 | 공지사항 목록 조회 |
| GET | /api/v1/notices/{notice_id} | 없음 | 공지사항 상세 조회 |
| POST | /api/v1/notices | 없음 | 공지사항 작성 (author_id=1 고정) |
| DELETE | /api/v1/notices/{notice_id} | 없음 | 공지사항 삭제 |
| POST/GET/PUT/DELETE | /api/friend-requests | 없음 | 친구 요청 관리 |
| GET | /api/v1/chat/models | 없음 | Gemini 사용 가능 모델 목록 |
| POST | /api/v1/chat | 없음 | Gemini AI 채팅 (세션 유지) |
| POST | /api/v1/pinball_ai/playstyle | 없음 | Gemini 플레이스타일 분석 (attack/defence/none) |

JWT 인증: `Authorization: Bearer <access_token>` 헤더 사용

---

## API 작성 규칙

### 설계 원칙

- **RESTful 설계**: URL은 명사+복수형, HTTP 메서드로 행위 표현, 적절한 상태 코드 반환
- **버전 접두사**: 모든 엔드포인트는 `/api/v1/` 접두사 사용 (헬스체크 제외)
- **경로 슬래시**: 경로 끝에 `/` 붙이지 않는다 (`""` 또는 `"/{id}"`)

### 라우터

- 리소스 단위로 파일 분리하고 라우터 생성 시 `prefix`, `tags` 반드시 지정
- DB 세션은 항상 `Depends(get_db)` 사용, 라우터 내 `SessionLocal()` 직접 호출 금지
- 인증이 필요한 엔드포인트는 의존성 함수를 `Depends`로 주입

### 쿼리 파라미터

- 필터링·검색: 쿼리 파라미터 사용 (`GET /users?role=admin&nickname=foo`)
- 목록 조회 시 페이지네이션 필수: `limit`(기본 20, 최대 100), `offset`(기본 0) 제공
- 쿼리 파라미터는 `Query(default=..., ge=..., le=...)` 로 제약 명시

### 스키마

- 요청(`Request`)과 응답(`Response`) 스키마를 별도 클래스로 정의
- 응답 스키마에 비밀정보(`password`, API Key 등) 포함 금지
- `app/schemas/` 하위에 리소스별로 분리, `__init__.py`에서 전체 export

### 예외 처리

- 에러 응답은 반드시 `HTTPException` 사용 (`raise HTTPException(status_code=404, detail="...")`)

---

## 주의사항

- `passlib[bcrypt]` 대신 `bcrypt`를 직접 사용 — passlib은 bcrypt 5.x와 호환되지 않아 배제
- `requirements.txt`에 `bcrypt` 추가 후 컨테이너 재빌드 필요 (`docker compose build fastapi`)
- Redis 클라이언트는 `app/redis_client.py`의 `redis_client` 객체를 import해서 사용 — 직접 `redis.Redis()` 생성하지 않는다

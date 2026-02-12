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
| `models.py` | SQLAlchemy ORM 모델 정의 (User, Score, Friendship, MonthlyScore, GameVisit, HighScore) |
| `seed.py` | Data Seeding — Admin 계정 자동 생성 (`seed_admin` 함수) |
| `requirements.txt` | Python 패키지 의존성 |
| `Dockerfile` | FastAPI 컨테이너 빌드 설정 |
| `alembic.ini` | Alembic 설정 파일 |
| `pytest.ini` | pytest 설정 (TESTING=1 환경변수 등) |
| `.env` | 환경변수 (DB URL, API Key, Admin 계정 정보) — git 비추적 |
| `.env.example` | 환경변수 예시 파일 |

---

## app/ 디렉토리

```
app/
├── __init__.py
├── api/
│   ├── deps.py          # get_db() — DB 세션 의존성 (모든 라우터에서 재사용)
│   └── v1/
│       ├── __init__.py  # 모든 v1 라우터 export
│       ├── auth.py      # POST /api/v1/login, POST /api/v1/register
│       ├── users.py     # CRUD /api/v1/users (API Key 인증 필요)
│       ├── scores.py    # POST /api/v1/scores (점수 기록 생성)
│       ├── high_scores.py   # /api/v1/high-scores (사용자별 최고 점수)
│       ├── monthly_scores.py # /api/v1/monthly-scores (월간 점수)
│       ├── game_visits.py   # /api/v1/game_visits (방문 기록)
│       └── friends.py   # /api/friend-requests (친구 요청)
├── core/
│   ├── config.py        # Settings 클래스 — 환경변수 로드 (DATABASE_URL, API_KEY 등)
│   └── security.py      # verify_api_key() — API Key 인증 의존성 (X-API-Key 헤더)
├── db/
│   ├── base.py          # Base + 모든 모델 import (Alembic autogenerate용)
│   └── session.py       # engine, SessionLocal, Base, wait_for_db()
└── schemas/
    ├── __init__.py      # 모든 스키마 한 번에 export
    ├── user.py          # UserCreateRequest, UserRegisterRequest, UserUpdateRequest, UserResponse, LoginRequest, LoginResponse, DeleteResponse
    ├── score.py         # ScoreCreateRequest, ScoreResponse, ScoreListResponse
    ├── high_score.py    # HighScoreCreate, HighScoreResponse
    ├── monthly_score.py # MonthlyScoreCreateRequest/UpdateRequest/Response/ListResponse/DeleteResponse
    ├── game_visit.py    # GameVisitCreateRequest/UpdateRequest/Response, DailyVisitStats 등
    └── friendship.py   # FriendRequestRequest/Response/Data/ListResponse/ActionRequest/ActionResponse
```

---

## alembic/ 디렉토리

```
alembic/
├── README              # Alembic 기본 설명
├── env.py              # Alembic 환경 설정 (Base.metadata 연결, 환경변수 로드)
├── script.py.mako      # 마이그레이션 파일 템플릿
├── versions/           # 마이그레이션 파일 (적용 순서대로)
│   ├── eccd28617903_initial_postgresql_migration.py
│   ├── 6fe36d8bc6a2_add_user_id_column_to_users_table.py
│   ├── f38f15d3477d_add_foreign_key_constraints_to_.py
│   ├── 45f71363a042_add_foreign_key_to_high_scores_user_id.py
│   └── 0ceb423c2879_add_foreign_key_to_monthly_scores_user_.py
└── versions_mysql_backup/  # MySQL 시절 마이그레이션 백업
```

---

## tests/ 디렉토리

```
tests/
├── README.md           # 테스트 작성 가이드
├── __init__.py
├── conftest.py         # pytest fixture (TestDB 세션, 테스트용 client 등)
├── test_example.py     # 예시 테스트
├── test_friend_requests.py  # 친구 요청 API 테스트
├── test_high_scores.py      # 최고 점수 API 테스트
├── test_monthly_scores_fk.py # 월간 점수 FK 테스트
└── test_testdb.py           # 테스트 DB 연결 확인
```

---

## DB 모델 요약

| 모델 | 테이블 | 주요 필드 |
|------|--------|-----------|
| User | users | id, user_id(UUID), email(UNIQUE), nickname, password, birth_date, role |
| Score | scores | id(PK), user_id, score, created_at |
| Friendship | friendships | id, requester_id(FK→users), receiver_id(FK→users), status, created_at |
| MonthlyScore | monthly_scores | id, user_id(FK→users), nickname, score, created_at |
| GameVisit | game_visits | id, user_id(nullable), ip_address, is_visits, created_at, updated_at |
| HighScore | high_scores | id, user_id(FK→users, UNIQUE), score, created_at, updated_at |

---

## API 엔드포인트 요약

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | /api/ | 없음 | 헬스 체크 |
| GET | /api/test | 없음 | API 상태 확인 |
| GET | /api/debug/db-info | 없음 | DB 연결 정보 확인 |
| POST | /api/v1/login | 없음 | 로그인 |
| POST | /api/v1/register | 없음 | 일반 회원가입 |
| POST/GET/PUT/DELETE | /api/v1/users | 없음 | 사용자 CRUD |
| POST | /api/v1/scores | 없음 | 점수 기록 생성 |
| POST/GET/PUT/DELETE | /api/v1/high-scores | 없음 | 최고 점수 관리 |
| POST/GET/PUT/DELETE | /api/v1/monthly-scores | 없음 | 월간 점수 관리 |
| POST/GET/PUT/DELETE | /api/v1/game_visits | 없음 | 게임 방문 기록 |
| POST/GET/PUT/DELETE | /api/friend-requests | 없음 | 친구 요청 관리 |

API Key 헤더: `X-API-Key: <API_KEY>` (.env의 `API_KEY` 값)

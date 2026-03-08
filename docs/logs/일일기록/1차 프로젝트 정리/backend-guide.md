# 백엔드 API·DB 가이드

백엔드 유지보수 및 추가 개발 시 코드를 직접 분석하지 않고도 구조를 파악할 수 있도록 작성한 참조 문서.

---

## 백엔드 프로젝트 구조

```
backend/
├── main.py              # FastAPI 앱 진입점, 라우터 등록, 헬스체크/디버그 엔드포인트
├── models.py            # SQLAlchemy ORM 모델 (4개 테이블)
├── seed.py              # 어드민 계정 초기 데이터 삽입
├── app/
│   ├── api/
│   │   ├── deps.py      # DB 세션 의존성 주입 (get_db)
│   │   └── v1/          # API v1 라우터 모음
│   │       ├── auth.py          # 로그인, 회원가입
│   │       ├── users.py         # 사용자 CRUD
│   │       ├── monthly_scores.py  # 월간 점수 CRUD
│   │       ├── game_visits.py   # 게임 접속 기록 CRUD
│   │       └── friends.py       # 친구 요청 관리
│   ├── core/
│   │   ├── config.py    # 환경 변수 설정
│   │   └── security.py  # 보안 관련 유틸리티
│   ├── db/
│   │   ├── base.py      # SQLAlchemy Base 클래스
│   │   └── session.py   # DB 엔진, 세션 팩토리, wait_for_db
│   └── schemas/         # Pydantic 요청/응답 스키마
└── alembic/             # DB 마이그레이션 파일
```

---

## API 엔드포인트 목록

> `/api/friend-requests` 경로는 `/api/v1/` 접두사가 없는 유일한 예외 경로.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET    | `/api/` | 헬스체크 |
| GET    | `/api/test` | API 테스트 엔드포인트 |
| GET    | `/api/debug/db-info` | 현재 연결된 DB 이름 및 URL 조회 |
| POST   | `/api/v1/login` | 이메일/비밀번호 로그인 → `{user_id, email, nickname, role}` 반환 |
| POST   | `/api/v1/register` | 일반 회원가입 (role 고정: `"user"`) |
| GET    | `/api/v1/users` | 전체 사용자 조회 (쿼리 파라미터 `nickname`으로 부분 일치 검색 가능) |
| POST   | `/api/v1/users` | 사용자 생성 (role 직접 지정 가능) |
| GET    | `/api/v1/users/{user_id}` | 특정 사용자 조회 |
| PUT    | `/api/v1/users/{user_id}` | 사용자 정보 수정 (닉네임 변경 시 monthly_scores 동기화) |
| DELETE | `/api/v1/users/{user_id}` | 사용자 삭제 (관련 레코드 수동 정리 후 삭제) |
| GET    | `/api/v1/monthly-scores` | 이번 달 전체 점수 조회 (score 내림차순) |
| POST   | `/api/v1/monthly-scores` | 월간 점수 등록 또는 갱신 (이번 달 최고 점수만 유지) |
| GET    | `/api/v1/monthly-scores/{user_id}` | 특정 사용자 이번 달 점수 조회 |
| PUT    | `/api/v1/monthly-scores/{user_id}` | 특정 사용자 월간 점수 수정 |
| DELETE | `/api/v1/monthly-scores/{user_id}` | 특정 사용자 월간 점수 삭제 |
| POST   | `/api/v1/game_visits` | 게임 접속 기록 생성 (오늘 날짜+IP 기준 중복 방지) |
| PUT    | `/api/v1/game_visits` | IP 주소 기반 게임 접속 기록 업데이트 (`is_visits=True`) |
| GET    | `/api/v1/game_visits` | 일별 접속자 수 통계 조회 (쿼리 파라미터 `start_date`, `end_date`; 기본값: 최근 7일) |
| DELETE | `/api/v1/game_visits` | 날짜 범위 기반 게임 접속 기록 삭제 |
| POST   | `/api/friend-requests` | 친구 요청 생성 (중복·역방향·자기 자신 요청 방지) |
| GET    | `/api/friend-requests` | 특정 사용자의 친구 요청 목록 조회 (쿼리 파라미터 `user_id`, `friend_status`; 기본값: `"pending"`) |
| POST   | `/api/friend-requests/accept` | 친구 요청 승인 |
| POST   | `/api/friend-requests/reject` | 친구 요청 거절 |

### 쿼리 파라미터 상세

- **`GET /api/v1/users`**: `nickname` (optional) — nickname 부분 일치 필터
- **`GET /api/v1/game_visits`**: `start_date`, `end_date` (optional, ISO 형식 `YYYY-MM-DD`) — 미입력 시 최근 7일
- **`GET /api/friend-requests`**: `user_id` (required), `friend_status` (optional, `pending`/`accepted`/`rejected`/`all`, 기본값 `pending`)

---

## DB 스키마

### users

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | Integer | PK, AUTO_INCREMENT | 내부 정수 ID |
| user_id | UUID | UNIQUE, nullable | 외부 노출용 UUID (기본값: uuid4 자동 생성) |
| email | String(255) | UNIQUE, NOT NULL | 로그인 이메일 |
| nickname | String(100) | NOT NULL | 표시 이름 |
| password | String(255) | NOT NULL | 비밀번호 (현재 평문 저장 — 기술 부채) |
| birth_date | Date | NOT NULL | 생년월일 |
| role | String(20) | NOT NULL, default=`'user'` | `'user'` 또는 `'admin'` |

### friendships

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | Integer | PK | - |
| requester_id | Integer | FK → users.id, NOT NULL | 친구 요청을 보낸 사용자 |
| receiver_id | Integer | FK → users.id, NOT NULL | 친구 요청을 받은 사용자 |
| status | String(20) | NOT NULL, default=`'pending'` | `pending` / `accepted` / `rejected` |
| created_at | DateTime | NOT NULL, server_default=now() | 요청 생성 시각 |

테이블 제약:
- `(requester_id, receiver_id)` UNIQUE (`uq_friendship_pair`) — 동일 방향 중복 요청 방지
- `requester_id != receiver_id` CHECK (`ck_no_self_friend`) — 자기 자신 친구 요청 방지

### monthly_scores

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | Integer | PK | - |
| user_id | Integer | FK → users.id, NOT NULL | 점수 소유 사용자 |
| nickname | String(100) | NOT NULL | 비정규화 저장된 닉네임 |
| score | Integer | NOT NULL | 이번 달 최고 점수 |
| created_at | DateTime | NOT NULL, server_default=now() | 점수 등록 시각 |

### game_visits

| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | Integer | PK | - |
| user_id | Integer | FK → users.id, nullable | 비로그인 방문 시 NULL |
| ip_address | String(45) | NOT NULL | 클라이언트 IP (IPv6 대응) |
| is_visits | Boolean | NOT NULL, default=False | 실제 게임 접속 여부 |
| created_at | DateTime | NOT NULL, server_default=now() | 최초 접속 시각 |
| updated_at | DateTime | NOT NULL, server_default=now(), onupdate=now() | 최종 갱신 시각 |

---

## 주요 설계 결정

### ON DELETE CASCADE 미적용

`users` 테이블 FK에 CASCADE가 없다. `DELETE /api/v1/users/{user_id}` 호출 시 API 코드에서 다음 순서로 수동 처리한다:

1. `game_visits.user_id`를 NULL로 설정 (방문 기록 보존, FK 위반 방지)
2. `friendships` 레코드 삭제 (requester_id 또는 receiver_id 일치하는 모든 행)
3. `monthly_scores` 레코드 삭제
4. `users` 레코드 삭제

DB 레벨 자동 삭제 대신 명시적 수동 처리를 택한 이유는 의도치 않은 연쇄 삭제를 방지하기 위함이다.

### MonthlyScore 닉네임 비정규화

`monthly_scores.nickname` 컬럼에 `users.nickname`을 복사 저장한다. 랭킹 조회 시 `users` 테이블 JOIN 없이 빠르게 닉네임을 표시할 수 있다.

`PUT /api/v1/users/{user_id}`로 닉네임을 변경하면 해당 사용자의 모든 `monthly_scores` 레코드 닉네임도 동기화한다.

`POST /api/v1/monthly-scores` 호출 시에도 `users.nickname`을 다시 읽어 저장하므로, 점수 등록 시점의 닉네임이 항상 반영된다.

### redirect_slashes=False

FastAPI 기본 동작은 경로 끝에 슬래시가 없으면 307 리다이렉트를 발생시킨다. HTTPS 환경에서 Mixed Content 오류가 발생하므로 `redirect_slashes=False`로 비활성화하고, 모든 라우터 경로를 `""` 형식(`"/"` 아님)으로 등록한다.

### 비밀번호 평문 저장

현재 `users.password` 컬럼에 평문 비밀번호가 저장된다. bcrypt 등 해시 처리가 미적용된 기술 부채 항목이다. 로그인(`auth.py`) 시에도 `user.password != login_request.password` 단순 비교를 사용한다.

### 게임 접속 기록 중복 방지

`POST /api/v1/game_visits`는 오늘 날짜 + 클라이언트 IP 기준으로 기존 레코드를 조회한다. 기존 레코드가 있으면 생성 대신 업데이트(`is_new_record=False`)한다. 클라이언트 IP는 `X-Forwarded-For` → `X-Real-IP` → 직접 연결 순으로 추출한다.

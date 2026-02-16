# 백엔드 API·DB 가이드 작성 실행계획

## 요구사항 요약

**요구사항**: `docs/backend-guide.md` 파일을 새로 생성하여 백엔드의 전체 API 엔드포인트 목록, DB 스키마, 주요 설계 결정을 문서화한다.

**목적**: 백엔드 유지보수 및 추가 개발 시 코드를 직접 분석하지 않고도 구조를 빠르게 파악할 수 있도록 참조 문서를 만든다.

---

## 현재상태 분석

- `docs/` 디렉토리 존재하나 `backend-guide.md` 파일 없음
- `backend/main.py`: 라우터 5개 등록(`/api/v1/users`, `/api/v1/login`, `/api/v1/register`, `/api/v1/monthly-scores`, `/api/v1/game_visits`, `/api/friend-requests`)
- `backend/models.py`: 4개 테이블 정의(`users`, `friendships`, `monthly_scores`, `game_visits`)
- API 파일 5개: `auth.py`, `users.py`, `monthly_scores.py`, `game_visits.py`, `friends.py`
- 인증 없이 모든 API 접근 가능 (API Key 미적용 상태)

---

## 구현 방법

마크다운 파일을 직접 작성한다. `backend/main.py`, `backend/models.py`, `backend/app/api/v1/*.py` 코드를 분석하여 실제 엔드포인트와 스키마를 정확히 추출한다. 코드 자동 생성 없이 수작업으로 정리한다.

---

## 구현 단계

### 1. docs/ 디렉토리 존재 확인 후 backend-guide.md 파일 생성

```bash
ls docs/
# docs/ 디렉토리가 없으면 mkdir docs 실행
```

- `docs/` 디렉토리가 없는 경우 먼저 생성한다
- 파일 경로: `docs/backend-guide.md`

### 2. 백엔드 프로젝트 구조 섹션 작성

```markdown
## 백엔드 프로젝트 구조

backend/
├── main.py              # FastAPI 앱 진입점, 라우터 등록
├── models.py            # SQLAlchemy ORM 모델 (4개 테이블)
├── seed.py              # 어드민 계정 초기 데이터 삽입
├── app/
│   ├── api/
│   │   ├── deps.py      # DB 세션 의존성 주입
│   │   └── v1/          # API v1 라우터 모음
│   ├── core/
│   │   ├── config.py    # 환경 변수 설정
│   │   └── security.py  # 보안 관련 유틸리티
│   ├── db/
│   │   ├── base.py      # SQLAlchemy Base 클래스
│   │   └── session.py   # DB 엔진, 세션 팩토리
│   └── schemas/         # Pydantic 요청/응답 스키마
└── alembic/             # DB 마이그레이션 파일
```

- 디렉토리 트리 형식으로 각 파일의 역할을 한 줄씩 설명한다
- `app/api/v1/` 하위 파일 목록: `auth.py`, `users.py`, `monthly_scores.py`, `game_visits.py`, `friends.py`

### 3. API 엔드포인트 목록 섹션 작성

```markdown
## API 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET    | /api/ | 헬스체크 |
| POST   | /api/v1/login | 로그인 |
| POST   | /api/v1/register | 회원가입 |
| GET    | /api/v1/users | 전체 사용자 조회 (nickname 검색 가능) |
| POST   | /api/v1/users | 사용자 생성 (role 지정 가능) |
| GET    | /api/v1/users/{user_id} | 특정 사용자 조회 |
| PUT    | /api/v1/users/{user_id} | 사용자 정보 수정 |
| DELETE | /api/v1/users/{user_id} | 사용자 삭제 |
| GET    | /api/v1/monthly-scores | 이번 달 전체 점수 조회 |
| POST   | /api/v1/monthly-scores | 월간 점수 등록/갱신 |
| GET    | /api/v1/monthly-scores/{user_id} | 특정 사용자 월간 점수 조회 |
| PUT    | /api/v1/monthly-scores/{user_id} | 특정 사용자 월간 점수 수정 |
| DELETE | /api/v1/monthly-scores/{user_id} | 특정 사용자 월간 점수 삭제 |
| POST   | /api/v1/game_visits | 게임 접속 기록 생성 |
| PUT    | /api/v1/game_visits | 게임 접속 기록 업데이트 |
| GET    | /api/v1/game_visits | 일별 접속 통계 조회 |
| DELETE | /api/v1/game_visits | 게임 접속 기록 삭제 |
| POST   | /api/friend-requests | 친구 요청 생성 |
| GET    | /api/friend-requests | 친구 요청 목록 조회 |
| POST   | /api/friend-requests/accept | 친구 요청 승인 |
| POST   | /api/friend-requests/reject | 친구 요청 거절 |
```

- `/api/friend-requests`는 `/api/v1/` 접두사가 없는 유일한 예외 경로임을 주석으로 명시한다
- `GET /api/v1/game_visits`는 쿼리 파라미터 `start_date`, `end_date` (기본값: 최근 7일)를 받는다

### 4. DB 스키마 섹션 작성

```markdown
## DB 스키마

### users
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | Integer | PK, AUTO_INCREMENT | 내부 정수 ID |
| user_id | UUID | UNIQUE, nullable | 외부 노출용 UUID |
| email | String(255) | UNIQUE, NOT NULL | 로그인 이메일 |
| nickname | String(100) | NOT NULL | 표시 이름 |
| password | String(255) | NOT NULL | 평문 비밀번호 저장 |
| birth_date | Date | NOT NULL | 생년월일 |
| role | String(20) | NOT NULL, default='user' | 'user' 또는 'admin' |

### friendships
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | Integer | PK | - |
| requester_id | Integer | FK → users.id, NOT NULL | 친구 요청을 보낸 사용자 |
| receiver_id | Integer | FK → users.id, NOT NULL | 친구 요청을 받은 사용자 |
| status | String(20) | NOT NULL, default='pending' | pending/accepted/rejected |
| created_at | DateTime | NOT NULL, server_default=now() | 요청 생성 시각 |

테이블 제약: (requester_id, receiver_id) UNIQUE, requester_id != receiver_id CHECK

### monthly_scores
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | Integer | PK | - |
| user_id | Integer | FK → users.id, NOT NULL | 점수 소유 사용자 |
| nickname | String(100) | NOT NULL | 비정규화 저장된 닉네임 |
| score | Integer | NOT NULL | 월간 최고 점수 |
| created_at | DateTime | NOT NULL, server_default=now() | 점수 등록 시각 |

### game_visits
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|---------|------|
| id | Integer | PK | - |
| user_id | Integer | FK → users.id, nullable | 비로그인 시 NULL |
| ip_address | String(45) | NOT NULL | 클라이언트 IP (IPv6 대응) |
| is_visits | Boolean | NOT NULL, default=False | 실제 게임 접속 여부 |
| created_at | DateTime | NOT NULL, server_default=now() | 최초 접속 시각 |
| updated_at | DateTime | NOT NULL, onupdate=now() | 최종 갱신 시각 |
```

- 각 테이블을 별도 소제목으로 구분하여 가독성을 높인다

### 5. 주요 설계 결정 섹션 작성

```markdown
## 주요 설계 결정

### ON DELETE CASCADE 미적용
users 테이블 FK에 CASCADE 없음. DELETE /api/v1/users/{user_id} 호출 시
API 코드에서 Friendship, MonthlyScore 레코드를 먼저 삭제하고 GameVisit.user_id를 NULL로
설정한 후 User를 삭제한다. DB 레벨 자동 삭제 대신 명시적 수동 처리를 택한 이유는
의도치 않은 연쇄 삭제를 방지하기 위함이다.

### MonthlyScore 닉네임 비정규화
monthly_scores.nickname 컬럼에 users.nickname을 복사 저장한다. 랭킹 조회 시
users 테이블 JOIN 없이 빠르게 닉네임을 표시할 수 있다. PUT /api/v1/users/{user_id}로
닉네임을 변경하면 해당 사용자의 모든 MonthlyScore 레코드 닉네임도 동기화한다.

### redirect_slashes=False
FastAPI 기본 동작은 경로 끝에 슬래시가 없으면 307 리다이렉트를 발생시킨다.
HTTPS 환경에서 Mixed Content 오류가 발생하므로 redirect_slashes=False로 비활성화하고,
모든 라우터 경로를 "" 형식으로 등록한다.

### 비밀번호 평문 저장
현재 users.password 컬럼에 평문 비밀번호가 저장된다. bcrypt 등 해시 처리가 미적용된
기술 부채 항목이다.
```

- 각 결정의 **이유**를 반드시 포함하여 단순 사실 나열이 아닌 맥락 설명이 되도록 작성한다

---

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `docs/backend-guide.md` | 생성 | 백엔드 프로젝트 구조, API 엔드포인트 목록, DB 스키마 4개 테이블, 주요 설계 결정 4항목 |

---

## 완료 체크리스트

- [ ] `docs/backend-guide.md` 파일이 존재하고 열람 가능하다
- [ ] 백엔드 프로젝트 구조가 디렉토리 트리 형식으로 각 파일 역할과 함께 작성되어 있다
- [ ] API 엔드포인트가 메서드·경로·설명 형태의 표로 20개 이상 정리되어 있다
- [ ] `/api/friend-requests`가 `/api/v1/` 접두사 예외임이 명시되어 있다
- [ ] `users`, `friendships`, `monthly_scores`, `game_visits` 4개 테이블 스키마가 컬럼·타입·제약조건·설명 형태로 작성되어 있다
- [ ] `friendships` 테이블의 (requester_id, receiver_id) UniqueConstraint와 자기 자신 방지 CheckConstraint가 명시되어 있다
- [ ] `ON DELETE CASCADE` 미적용 사유와 수동 삭제 처리 순서가 기술되어 있다
- [ ] `monthly_scores.nickname` 비정규화 이유와 닉네임 변경 시 동기화 방식이 기술되어 있다
- [ ] `redirect_slashes=False` 설정 이유가 기술되어 있다
- [ ] 비밀번호 평문 저장이 기술 부채 항목으로 명시되어 있다

# 프로젝트 회고 (Retrospective)

**프로젝트**: Pinball_web — 멀티플레이어 핀볼 게임 풀스택 웹 플랫폼
**기간**: 2026-01-17 ~ 2026-02-16 (약 30일)
**스택**: React/Vite · FastAPI · PostgreSQL · Traefik · Docker

---

## 프로젝트 개요 및 타임라인

| 기간 | 주요 작업 |
|------|-----------|
| 2026-01-17 ~ 01-22 | 백엔드 기초: 로그인, API Key 인증, users CRUD, role 컬럼 추가 |
| 2026-01-23 ~ 01-27 | DB 연결: friendships, game_visits 테이블 생성, 친구 요청 API |
| 2026-01-28 ~ 01-31 | 핀볼 게임 기초: 물리 엔진(Matter.js), 플리퍼, 죽음구역, 점수 시스템 |
| 2026-02-01 ~ 02-07 | 핀볼 고도화: 게임 오버 오버레이, 월간 점수 API 연동, 관리자 페이지 |
| 2026-02-08 ~ 02-12 | TDD 구조 도입, HighScore API, 백엔드 모듈화, 친구 페이지 연동 |
| 2026-02-13 ~ 02-16 | 핀볼 전용 페이지, 모바일 대응, DB 정리(high_scores/scores 삭제), 마무리 |

---

## 기술적 의사결정

### MySQL → PostgreSQL 전환
- **결정**: 초기 MySQL 사용에서 PostgreSQL로 전환
- **배경**: 프로젝트 규모 확장에 따라 PostgreSQL의 성능과 JSON 지원을 활용하기 위해 전환; TDD 환경 구축(2026-02-08) 시 conftest.py에 `hexdb_test` PostgreSQL DB를 사용하도록 설계됨
- MySQL은 레거시 백업으로 docker-compose에 유지

### ON DELETE CASCADE 미적용
- **결정**: FK에 CASCADE 없이 API에서 수동 삭제
- **배경**: 삭제 순서 제어와 game_visits 방문 기록 보존(user_id → NULL)을 위해 의도적으로 CASCADE를 사용하지 않음

### MonthlyScore nickname 비정규화
- **결정**: monthly_scores 테이블에 nickname 컬럼 중복 저장
- **배경**: 랭킹 조회 시 JOIN 없이 빠른 표시를 위해 비정규화 적용

---

## 트러블슈팅 사례

### 사례 1: pytest testDB SAVEPOINT 문제 (2026-02-16)
- **문제**: testDB에서 SAVEPOINT 방식 적용 시 `commit() → refresh()` 패턴과 구조적으로 충돌하여 `InvalidRequestError` 발생
- **원인**: 프로덕션 코드 전체가 `db.commit()` 직후 `db.refresh()`를 호출하는데, `after_transaction_end` 이벤트로 SAVEPOINT를 재시작해도 refresh 시점이 앞서 실행됨
- **해결**: SAVEPOINT 방식을 버리고 `autouse=True` + `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` 방식으로 conftest.py를 전면 재작성함

### 사례 2: useEffect 클로저로 인한 점수 전송 버그 (2026-02-01)
- **문제**: 게임 오버 시 API에 항상 0점이 전송됨
- **원인**: `useEffect([], [])`로 생성된 클로저가 `score` 초기값 0을 캡처하여 고정됨
- **해결**: `scoreRef = useRef(0)` 생성 후 `useEffect([score])`로 매 변경 시 동기화, API 전송 시 `scoreRef.current` 사용

### 사례 3: undefined user.id로 API 호출 (2026-01-25)
- **문제**: UserInfo.jsx에서 axios 요청이 실행되지 않고 에러도 발생하지 않음
- **원인**: Login.jsx에서 `response.data.id`(undefined)를 저장; `useEffect`의 `if (user && user.id)` 조건이 false가 되어 fetch 함수 자체가 호출되지 않음
- **해결**: `response.data.user_id`(올바른 필드명)로 수정

---

## 잘된 점·아쉬운 점·배운 점

### 잘된 점
- PRD → PLAN → 실행 → 업무일지의 개발 사이클을 일관되게 유지함
- TDD 구조를 도입하여 API 회귀 테스트 기반을 마련함
- Docker Compose + Traefik으로 프로덕션 환경과 동일한 로컬 환경 구성

### 아쉬운 점
- API Key를 코드에 하드코딩; 환경변수 처리가 미완성 상태
- 프론트엔드 라우트 가드 미구현; 비로그인 사용자가 보호 페이지에 직접 접근 가능
- HighScore, Score 테이블이 나중에 삭제됨; 초기 설계 단계에서 테이블 필요성을 충분히 검토하지 않았음

### 배운 점
- `useEffect` 클로저 문제 해결에 `useRef` 패턴 활용
- SQLAlchemy 2.0 방식(`DeclarativeBase`)과 SAVEPOINT 트랜잭션 격리의 한계
- Traefik + Cloudflare DNS Challenge 조합으로 자동 인증서 갱신 운영

# 사용자 시나리오 문서

## 1. 개요

이 문서는 Pinball_web 서비스의 전체 페이지·라우트 목록과 사용자 유형별(비로그인·로그인·관리자) 시나리오를 정리한 QA·기획 참고 자료입니다.

- **인증 방식**: `AuthContext` + `localStorage` 기반 세션, 로그인 시 `{ id, name, role, email }` 저장
- **라우트 가드**: 미구현 — 클라이언트 측에서 로그인 여부·역할 무관하게 모든 경로 접근 가능
- **관리자 구분**: 로그인 응답의 `role` 필드(`user` / `admin`)로 분기

---

## 2. 라우트 및 페이지 목록

| 경로 | 컴포넌트 | 접근 제한 | 설명 |
|------|----------|-----------|------|
| `/` | `HomePage` | 없음 | 메인 랜딩 페이지, 이번 달 랭킹 표시 |
| `/login` | `Login` | 없음 | 이메일·비밀번호 로그인 |
| `/Register` | `Register` | 없음 | 3단계 회원가입 |
| `/dashboard` | `Dashboard` | 없음 (미보호) | 로그인 유도 또는 좌측 메뉴 안내 |
| `/pinball` | `PinballPage` | 없음 (미보호) | 핀볼 게임 플레이 화면 |
| `/user/friend` | `FriendPage` | 없음 (미보호) | 친구 검색·요청·목록 |
| `/user/account` | `UserInfo` | 없음 (미보호) | 회원 정보 조회·수정·탈퇴 |
| `/admin` | `AdminUserPage` | 없음 (미보호) | 관리자 회원 관리 |
| `/admin/users` | `AdminUserPage` | 없음 (미보호) | 관리자 회원 관리 (`/admin`과 동일 컴포넌트) |
| `/admin/statistics` | `AdminStatisticsPage` | 없음 (미보호) | 관리자 게임 플레이 통계 |

---

## 3. 사용자 유형 분류

| 유형 | 조건 | 주요 접근 범위 |
|------|------|----------------|
| **비로그인** | localStorage에 인증 정보 없음 | `/`, `/login`, `/Register`, `/pinball` (점수 저장 불가) |
| **로그인 (일반)** | `role = user` | 모든 경로 + 점수 저장, 친구 관리, 계정 수정 |
| **관리자** | `role = admin` | 모든 경로 + 회원 관리, 통계 조회 (`X-API-Key` 필요) |

---

## 4. 시나리오

### 비로그인 사용자

#### 시나리오 A: 메인 페이지 조회 및 게임 플레이

1. `/` 접속 → 이번 달 랭킹 테이블 확인
2. "게임하기" 클릭 → `/pinball` 이동
3. Matter.js 로딩 완료 후 게임 시작 (5스테이지, 목숨 3개)
4. 게임 종료 → `POST /api/v1/monthly-scores` 호출 시 인증 정보 없음 → **점수 저장 실패** (비로그인 상태)

> **참고**: 라우트 가드가 없으므로 비로그인 상태에서도 `/pinball`, `/dashboard`, `/user/friend` 등 접근 가능.

---

#### 시나리오 B: 회원가입

1. `/login` 접속 → "회원가입" 버튼 클릭 → `/Register` 이동
2. **Step 0** — 이메일·닉네임 입력 → "다음" 클릭
3. **Step 1** — 비밀번호·비밀번호 확인 입력 → "다음" 클릭
4. **Step 2** — 생년월일(연도·월·일) 입력 → "회원가입" 클릭
5. `POST /api/v1/register` 호출 → 성공(201) 시 `/login`으로 이동

---

### 로그인 사용자 (role = user)

#### 시나리오 C: 로그인

1. `/login` 접속 → 이메일·비밀번호 입력 → "로그인" 클릭
2. `POST /api/v1/login` 호출 → 성공 시 `role` 확인
   - `role = user` → `/` 이동
   - `role = admin` → `/admin` 이동
3. `localStorage`에 `{ id, name, role, email }` 저장

---

#### 시나리오 D: 게임 플레이 및 점수 반영

1. `/pinball` 접속 → Matter.js 로딩 완료 후 게임 시작
2. 플리퍼 조작: `←` / `→` 화살표키 또는 `z` / `x` 키
3. 5스테이지 진행 — 스테이지별 범퍼 레이아웃 변경
4. 목숨 3개 모두 소진 → 게임 오버
5. `POST /api/v1/monthly-scores` 호출 → 당월 최고 점수 저장
6. `/`의 이번 달 랭킹 테이블에 점수 반영

---

#### 시나리오 E: 친구 요청 흐름

1. `/user/friend` 접속 → 닉네임 검색창에 상대 닉네임 입력
2. 검색 결과에서 "친구추가" 클릭 → `POST /api/friend-requests`
3. 상대방의 친구 요청 목록에 `pending` 상태로 표시
4. 상대방이 `/user/friend` 접속 → "친구 요청" 섹션에서 처리
   - **승인**: `POST /api/friend-requests/accept` → 양쪽 친구 목록에 표시
   - **거절**: `POST /api/friend-requests/reject` → 요청 목록에서 제거

> **참고**: 친구 요청 API는 `/api/friend-requests/` 경로 사용 (`/api/v1/` 접두사 없음).

---

#### 시나리오 F: 계정 관리 및 회원 탈퇴

1. `/user/account` 접속 → 현재 이메일·닉네임·생년월일 조회 (`GET /api/v1/users/{id}`)
2. 닉네임·비밀번호·생년월일 수정 후 "수정" 클릭 → `PUT /api/v1/users/{id}`
   - 닉네임 변경 시 관련 `MonthlyScore` 행의 닉네임 자동 동기화
3. "회원 탈퇴" 버튼 클릭 → 확인 Dialog 열림
4. 입력란에 **"회원 탈퇴"** 텍스트 직접 입력 → "확인" 클릭
5. `DELETE /api/v1/users/{id}` 호출 → 성공 시 `logout()` 실행 → `/` 이동

---

### 관리자 (role = admin)

#### 시나리오 G: 관리자 회원 관리

1. `role = admin` 계정으로 로그인 → `/admin` 자동 이동
2. DataGrid에서 전체 회원 목록 조회 (`GET /api/v1/users`, `X-API-Key` 헤더 포함)
3. 수정 아이콘 클릭 → Dialog에서 닉네임·생년월일·비밀번호·역할 수정
   → `PUT /api/v1/users/{id}` (`X-API-Key` 헤더 포함)
4. 삭제 아이콘 클릭 → 확인 Dialog → `DELETE /api/v1/users/{id}` (`X-API-Key` 헤더 포함)

> **참고**: 관리자 API 호출 시 반드시 `X-API-Key` 헤더가 필요합니다.

---

#### 시나리오 H: 관리자 통계 조회

1. 좌측 사이드바에서 "통계" 클릭 → `/admin/statistics` 이동
2. `GET /api/v1/game_visits` (최근 2주 날짜 범위 파라미터) → 일별 방문자 수 조회
3. LineChart로 날짜별 게임 플레이 횟수 시각화

---

## 5. 페이지별 주요 API 호출 요약

| 페이지 | HTTP 메서드 | 엔드포인트 | 인증 필요 |
|--------|-------------|-----------|-----------|
| `/` (HomePage) | `GET` | `/api/v1/monthly-scores` (랭킹 조회) | 불필요 |
| `/login` | `POST` | `/api/v1/login` | 불필요 |
| `/Register` | `POST` | `/api/v1/register` | 불필요 |
| `/pinball` | `POST` | `/api/v1/monthly-scores` (점수 저장) | 로그인 필요 |
| `/user/friend` | `GET` | `/api/v1/users` (닉네임 검색) | 불필요 |
| `/user/friend` | `POST` | `/api/friend-requests` | 로그인 필요 |
| `/user/friend` | `POST` | `/api/friend-requests/accept` | 로그인 필요 |
| `/user/friend` | `POST` | `/api/friend-requests/reject` | 로그인 필요 |
| `/user/account` | `GET` | `/api/v1/users/{id}` | 로그인 필요 |
| `/user/account` | `PUT` | `/api/v1/users/{id}` | 로그인 필요 |
| `/user/account` | `DELETE` | `/api/v1/users/{id}` | 로그인 필요 |
| `/admin`, `/admin/users` | `GET` | `/api/v1/users` | `X-API-Key` 필요 |
| `/admin`, `/admin/users` | `PUT` | `/api/v1/users/{id}` | `X-API-Key` 필요 |
| `/admin`, `/admin/users` | `DELETE` | `/api/v1/users/{id}` | `X-API-Key` 필요 |
| `/admin/statistics` | `GET` | `/api/v1/game_visits` | `X-API-Key` 필요 |

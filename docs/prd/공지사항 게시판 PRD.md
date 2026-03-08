# 공지사항 게시판 PRD

## 목표

관리자가 공지사항을 작성·관리하고, 사용자가 홈 페이지에서 공지사항 목록 및 상세 내용을 조회할 수 있는 게시판 기능을 구현한다.
WYSIWYG 에디터를 통해 이미지를 포함한 서식 있는 글을 작성할 수 있어야 한다.

## 현재상태 분석

- 프론트엔드: React + MUI 기반. 라우팅은 `App.jsx`에서 react-router-dom으로 관리. 공지사항 관련 페이지/라우트 없음.
- 백엔드: FastAPI + SQLAlchemy. `models.py`에 User, Friendship, MonthlyScore, GameVisit 모델 존재. Notice 모델 없음.
- 인증: `AuthContext`에서 `{user_id, email, nickname, role}` 관리. role='admin'으로 관리자 판별 가능.
- 이미지 저장: 현재 파일 업로드 API 없음. → Base64 인코딩 방식으로 별도 API 없이 content HTML에 포함하여 저장.

## 실행 방법 및 단계

1. **DB 모델 추가**: `backend/models.py`에 `Notice` 모델(id, title, content, author_id, created_at, updated_at) 추가.
2. **Alembic 마이그레이션**: `alembic revision --autogenerate` 후 `upgrade head` 실행.
3. **공지사항 CRUD API**: `GET /api/v1/notices`, `GET /api/v1/notices/{id}`, `POST /api/v1/notices`, `PUT /api/v1/notices/{id}`, `DELETE /api/v1/notices/{id}` 구현. 작성/수정/삭제는 admin 권한만 허용.
4. **공지사항 목록 페이지**: `frontend/src/pages/Notice/NoticeListPage.jsx` 생성. 제목 목록 표시, admin일 때 글쓰기 버튼 노출.
5. **공지사항 작성 페이지**: `NoticeWritePage.jsx` 생성. Tiptap WYSIWYG 에디터 적용. 이미지는 `FileReader.readAsDataURL()`로 Base64 변환 후 에디터에 `<img src="data:image/...;base64,...">` 형태로 삽입. 서버 API 호출 없음.
6. **공지사항 상세 페이지**: `NoticeDetailPage.jsx` 생성. 저장된 HTML 콘텐츠를 `dangerouslySetInnerHTML`로 렌더링. Base64 이미지가 그대로 표시됨.
7. **라우트 등록**: `App.jsx`에 `/notice`, `/notice/write`, `/notice/:id` 라우트 추가.
8. **홈 페이지 연결**: `HomePage.jsx`에 공지사항 목록 페이지로 이동하는 링크/버튼 추가.

## 사용 할 기술 및 패키지

| 기술/패키지 | 버전 | 용도 |
|---|---|---|
| `@tiptap/react` | 3.20.1 | WYSIWYG 에디터 React 바인딩. 2025-2026년 React 에디터 1위. |
| `@tiptap/starter-kit` | 3.20.1 | 기본 서식(Bold, Italic, Heading 등) 확장 묶음 |
| `@tiptap/extension-image` | 3.20.1 | 에디터 내 이미지 삽입 확장 |
| `FileReader` API | 브라우저 내장 | 이미지 파일을 Base64로 변환 (별도 설치 불필요) |
| SQLAlchemy `Text` 타입 | 2.0.x | Base64 포함 HTML 콘텐츠 저장 |
| Alembic | 1.x | DB 스키마 마이그레이션 |
| react-router-dom | 기존 사용 중 | 공지사항 라우트 추가 |

> **React-Quill 미채택 사유**: 마지막 릴리스 2022년 8월(v2.0.0)로 유지보수 사실상 중단. React 18+ 공식 미지원.

## 흐름 구조

### 페이지 흐름 (사용자 관점)

```
홈 페이지 (/)
    |
    | [공지사항 링크 클릭]
    v
공지사항 목록 (/notice)
    |
    |-- [제목 클릭] ---------> 공지사항 상세 (/notice/:id)
    |                               |
    |                               |-- [수정 버튼] --> 공지사항 수정 (/notice/:id/edit)  ← admin only
    |                               |
    |                               +-- [삭제 버튼] --> (삭제 후 목록으로 리다이렉트)     ← admin only
    |
    +-- [글쓰기 버튼] --------> 공지사항 작성 (/notice/write)                            ← admin only
                                    |
                                    | [저장]
                                    v
                                공지사항 상세 (/notice/:id)
```

### 권한별 접근 제어

```
요청 유형          비로그인     일반 사용자     관리자(admin)
─────────────────────────────────────────────────────────
목록 조회              O             O              O
상세 조회              O             O              O
글쓰기 버튼 노출       X             X              O
작성 페이지 접근       X (차단)      X (차단)       O
수정 버튼 노출         X             X              O
삭제 버튼 노출         X             X              O
POST /api/v1/notices   403           403            200
PUT  /api/v1/notices   403           403            200
DELETE /api/v1/notices 403           403            200
```

### API 흐름

```
[공지사항 목록 조회]
브라우저
  └─ GET /api/v1/notices
       └─ FastAPI → DB 쿼리 (Notice 전체)
            └─ JSON 응답 [{id, title, created_at, ...}]
                 └─ NoticeListPage 렌더링

[공지사항 상세 조회]
브라우저
  └─ GET /api/v1/notices/{id}
       └─ FastAPI → DB 쿼리 (Notice by id)
            └─ JSON 응답 {id, title, content(HTML), created_at, ...}
                 └─ NoticeDetailPage 렌더링 (dangerouslySetInnerHTML)

[이미지 포함 공지사항 작성 - admin]
관리자
  ├─ 이미지 첨부 (input type="file")
  │    └─ FileReader.readAsDataURL(file)  ← 브라우저에서 Base64 변환 (서버 통신 없음)
  │         └─ Tiptap 에디터에 <img src="data:image/...;base64,..."> 삽입
  │
  └─ 저장 버튼 클릭
       └─ POST /api/v1/notices {title, content(HTML with Base64 img)}
            └─ FastAPI → role='admin' 검증 → DB 저장 (content TEXT 컬럼에 Base64 포함 HTML 그대로 저장)
                 └─ JSON 응답 {id, ...}
                      └─ /notice/:id 로 리다이렉트

[공지사항 수정 - admin]
관리자
  └─ PUT /api/v1/notices/{id} {title, content(HTML)}
       └─ FastAPI → role='admin' 검증 → DB 업데이트
            └─ JSON 응답 {id, ...}
                 └─ /notice/:id 로 리다이렉트

[공지사항 삭제 - admin]
관리자
  └─ DELETE /api/v1/notices/{id}
       └─ FastAPI → role='admin' 검증 → DB 삭제
            └─ 204 No Content
                 └─ /notice 로 리다이렉트
```

### 데이터 모델

```
Notice
├── id          INTEGER  PK, AUTO INCREMENT
├── title       VARCHAR  공지사항 제목
├── content     TEXT     Tiptap 생성 HTML 콘텐츠 (Base64 이미지 data URI 포함)
├── author_id   INTEGER  FK → users.id
├── created_at  DATETIME
└── updated_at  DATETIME
```

## 테스트 방법

1. 일반 사용자로 로그인 후 `/notice` 접근 → 목록 조회, 글쓰기 버튼 미노출 확인.
2. 관리자(admin) 계정으로 로그인 후 `/notice/write` 접근 → 에디터에서 텍스트+이미지 작성 후 저장.
3. 저장된 공지사항 제목 클릭 → 상세 페이지에서 이미지 포함 내용이 정상 렌더링되는지 확인.
4. 비로그인 상태에서 목록 및 상세 페이지 접근 → 조회 가능, 작성 페이지 접근 시 차단 확인.

## 체크리스트

- [ ] 일반 사용자에게 글쓰기 버튼이 표시되지 않는다.
- [ ] 관리자가 이미지를 포함한 공지사항을 작성하고 저장할 수 있다.
- [ ] 공지사항 목록에서 제목을 클릭하면 상세 페이지로 이동한다.
- [ ] 상세 페이지에서 이미지가 글자 사이에 정상적으로 표시된다.
- [ ] 비로그인 사용자가 목록/상세 페이지를 조회할 수 있다.
- [ ] 비로그인/일반 사용자가 작성 API(`POST /api/v1/notices`)를 직접 호출하면 403 응답이 반환된다.
- [ ] 홈 페이지에 공지사항 목록 페이지로 이동하는 링크가 존재한다.

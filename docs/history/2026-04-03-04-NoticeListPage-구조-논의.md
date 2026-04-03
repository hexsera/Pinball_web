# NoticeListPage 구조 논의

**날짜**: 2026-04-03  
**PRD**: [공지사항 게시판 PRD](../../logs/일일기록/2026-03-08/공지사항 게시판 PRD.md)  
**관련 파일**:
- `frontend/src/pages/Notice/NoticeListPage.jsx`
- `frontend/src/pages/Notice/NoticeDetailPage.jsx`
- `frontend/src/pages/Notice/NoticeWritePage.jsx`
- `frontend/src/services/noticeService.js`
- `frontend/src/utils/noticeIndexDB.js`

---

## 현재 구현 상태

### 구현된 것 (Frontend only)

| 파일 | 역할 |
|------|------|
| `NoticeListPage.jsx` | 목록 표시 (10개씩 페이지네이션), admin 글쓰기 버튼, 페이지 번호 버튼 |
| `NoticeDetailPage.jsx` | 상세 보기 + admin 삭제 버튼 |
| `NoticeWritePage.jsx` | Tiptap 에디터, 이미지 Base64 업로드, 작성/저장 |
| `noticeService.js` | API 호출 + 실패 시 IndexedDB fallback |
| `noticeIndexDB.js` | IndexedDB 관리 + 32개 mock 데이터 seed |

### 구현되지 않은 것 (Backend 전무)

- DB Notice 모델 없음
- Alembic 마이그레이션 없음
- Notice CRUD API 전체 없음
- 수정(PUT) 기능: API도, UI(수정 페이지)도 미구현

---

## 현재 프론트엔드 동작 방식

```
API 호출 성공 → 서버 데이터 사용 ({ items, total } 구조)
API 호출 실패 → IndexedDB fallback (mock 데이터 32개 seed, 동일한 { items, total } 구조로 반환)
```

`noticeService.js`가 `getNotices(skip, limit)`으로 호출받아 `?skip=0&limit=10` 파라미터를 API에 전달한다.  
fallback 시에도 `all.slice(skip, skip + limit)`으로 잘라 `{ items, total }` 구조로 반환해 일관성을 유지한다.  
백엔드 없이도 UI가 동작하도록 임시 구성되어 있는 상태.

---

## PRD 기준 구현 현황

| 항목 | PRD | 현황 |
|------|-----|------|
| DB 모델 (Notice) | O | X |
| Alembic 마이그레이션 | O | X |
| GET /api/v1/notices | O | X |
| GET /api/v1/notices/:id | O | X |
| POST /api/v1/notices | O | X |
| PUT /api/v1/notices/:id | O | X (API + UI 모두 미구현) |
| DELETE /api/v1/notices/:id | O | X |
| NoticeListPage (페이지네이션 포함) | O | O |
| NoticeDetailPage | O | O |
| NoticeWritePage (Tiptap) | O | O |
| 이미지 Base64 저장 | O | O |

---

## 구현 시 참고 정보

### 1. DB 모델 (`backend/models.py` 추가)

기존 모델(`User`, `Friendship`, `MonthlyScore`, `GameVisit`)과 같은 파일에 추가한다.

```python
from sqlalchemy import Text  # 추가 필요

class Notice(Base):
    __tablename__ = "notices"

    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String(255), nullable=False)
    content    = Column(Text, nullable=False)          # Base64 이미지 포함 HTML
    author_id  = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
```

### 2. 라우터 파일 위치 및 등록

- 파일 생성: `backend/app/api/v1/notices.py`
- `backend/main.py`에 등록 (기존 패턴 그대로):

```python
# main.py import 줄
from app.api.v1 import users, auth, monthly_scores, game_visits, friends, chat, pinball_ai, game_sessions, notices

# main.py 라우터 등록 줄
app.include_router(notices.router, prefix="/api/v1/notices", tags=["Notices"])
```

### 3. API 엔드포인트 정의

라우터 경로는 `""` (빈 문자열) 으로 시작한다 — `redirect_slashes=False` 설정 때문에 `"/"`로 시작하면 307 리다이렉트 발생.

```
GET    /api/v1/notices?skip=0&limit=10  → 페이지 목록 (인증 불필요) → { items, total }
GET    /api/v1/notices/{id}             → 상세 조회 (인증 불필요)
POST   /api/v1/notices                  → 작성 (admin only)
PUT    /api/v1/notices/{id}             → 수정 (admin only)
DELETE /api/v1/notices/{id}             → 삭제 (admin only)
```

라우터 코드 패턴:

```python
router = APIRouter()

@router.get("")               # GET /api/v1/notices
@router.get("/{notice_id}")   # GET /api/v1/notices/{id}
@router.post("")              # POST /api/v1/notices
@router.put("/{notice_id}")   # PUT  /api/v1/notices/{id}
@router.delete("/{notice_id}")# DELETE /api/v1/notices/{id}
```

### 4. Admin 권한 검증 방식

현재 프로젝트에는 JWT 기반 `get_current_user` 의존성이 없다. 기존 admin 전용 엔드포인트들은 `X-API-Key` 헤더(`verify_api_key`)로 검증한다.

공지사항 API에서 admin 검증은 두 가지 선택지:
- **A안**: `X-API-Key` 헤더 방식 — 프론트에서 API 키를 헤더에 포함해 요청 (기존 패턴)
- **B안**: JWT 토큰 파싱 — `Authorization: Bearer <token>`에서 role 추출

현재 프론트(`noticeService.js`)는 인증 헤더 없이 `axios.post`를 바로 호출하므로, 선택한 방식에 맞게 프론트도 수정 필요.

### 5. Pydantic 스키마 (`backend/app/schemas/notices.py` 생성)

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NoticeCreateRequest(BaseModel):
    title: str
    content: str

class NoticeUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class NoticeResponse(BaseModel):
    id: int
    title: str
    content: str
    author_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class NoticeListResponse(BaseModel):
    id: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True
```

### 6. Alembic 마이그레이션

```bash
docker compose exec fastapi alembic revision --autogenerate -m "add notices table"
docker compose exec fastapi alembic upgrade head
```

---

## 논의 내용 및 결정사항

상세 논의는 [Notice UI 디테일 개선 논의](2026-04-03-05-Notice-UI-디테일-개선-논의.md) 참조.

**페이지네이션 관련 결정사항 요약** (✅ 구현 완료):
- API 방식: 오프셋 페이지네이션 (`?skip=0&limit=10`), 응답 구조 `{ items, total }`
- UI: 페이지 번호 버튼, 5개씩 슬라이딩, `totalPages > 1`일 때만 표시
- page 상태: URL 쿼리스트링 (`?page=2`), `useSearchParams` 사용

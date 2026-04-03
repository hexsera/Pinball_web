# 공지사항 백엔드 API 실행계획

## 요구사항 요약

**요구사항**: 공지사항 CRUD API 백엔드 구현 (DB 모델, 마이그레이션, 라우터, 스키마)

**목적**: 현재 프론트엔드가 IndexedDB mock 데이터로만 동작 중. 실제 DB와 API를 연결해 공지사항을 영구 저장·조회할 수 있도록 한다.

## 현재상태 분석

- `backend/models.py`: `User`, `Friendship`, `MonthlyScore`, `GameVisit` 존재. `Notice` 없음.
- `backend/app/api/v1/`: `notices.py` 없음.
- `backend/app/schemas/`: `notices.py` 없음.
- `backend/main.py`: `notices` 라우터 미등록.
- 프론트 `noticeService.js`: 인증 헤더 없이 `axios` 호출. API 실패 시 IndexedDB fallback.

## 구현 방법

- 권한 검증 없음 — POST/PUT/DELETE 모두 인증 불필요.
- 응답 구조: 목록은 `{ items, total }`, 상세는 `NoticeResponse`.
- 라우터 경로는 `""` 시작 (`redirect_slashes=False` 때문에 `"/"` 사용 시 307 발생).
- 기존 라우터 파일 패턴(`users.py` 등) 그대로 따름.

## 구현 단계

### 1. Notice 모델 추가 (`backend/models.py`)

```python
from sqlalchemy import Text  # 기존 import 줄에 Text 추가

class Notice(Base):
    __tablename__ = "notices"

    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String(255), nullable=False)
    content    = Column(Text, nullable=False)
    author_id  = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
```
- `content`는 `Text` 타입 — Base64 이미지가 포함된 HTML을 저장하므로 `String`(길이 제한 있음) 불가.
- `author_id`는 `users.id` FK. `ON DELETE CASCADE` 없음 (기존 프로젝트 정책).

### 2. Pydantic 스키마 생성 (`backend/app/schemas/notices.py`)

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

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

class NoticeListItemResponse(BaseModel):
    id: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True

class NoticeListResponse(BaseModel):
    items: List[NoticeListItemResponse]
    total: int
```
- `NoticeListResponse`는 프론트가 기대하는 `{ items, total }` 구조.
- `NoticeListItemResponse`는 목록에서 content(대용량 HTML) 제외, 제목+날짜만 전송.

### 3. 라우터 파일 생성 (`backend/app/api/v1/notices.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.schemas.notices import (
    NoticeCreateRequest, NoticeUpdateRequest,
    NoticeResponse, NoticeListResponse, NoticeListItemResponse
)
import sys
sys.path.insert(0, '/code')
from models import Notice

router = APIRouter()

@router.get("", response_model=NoticeListResponse)
def get_notices(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    total = db.query(Notice).count()
    items = db.query(Notice).order_by(Notice.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": items, "total": total}

@router.get("/{notice_id}", response_model=NoticeResponse)
def get_notice(notice_id: int, db: Session = Depends(get_db)):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    return notice

@router.post("", response_model=NoticeResponse, status_code=201)
def create_notice(body: NoticeCreateRequest, db: Session = Depends(get_db)):
    notice = Notice(title=body.title, content=body.content, author_id=1)
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice

@router.put("/{notice_id}", response_model=NoticeResponse)
def update_notice(notice_id: int, body: NoticeUpdateRequest, db: Session = Depends(get_db)):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    if body.title is not None:
        notice.title = body.title
    if body.content is not None:
        notice.content = body.content
    db.commit()
    db.refresh(notice)
    return notice

@router.delete("/{notice_id}", status_code=204)
def delete_notice(notice_id: int, db: Session = Depends(get_db)):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    db.delete(notice)
    db.commit()
```
- 권한 검증 없음 — `Depends(verify_api_key)` 등 미사용.
- `author_id=1`: 권한 검증 없이 작성자를 저장해야 하므로 임시로 admin 유저(id=1) 고정.
- DELETE는 `204 No Content`로 body 없이 응답.

### 4. main.py에 라우터 등록

```python
# import 줄 수정
from app.api.v1 import users, auth, monthly_scores, game_visits, friends, chat, pinball_ai, game_sessions, notices

# 라우터 등록 줄 추가
app.include_router(notices.router, prefix="/api/v1/notices", tags=["Notices"])
```
- 기존 라우터 등록 패턴과 동일.

### 5. Alembic 마이그레이션 실행

```bash
docker compose exec fastapi alembic revision --autogenerate -m "add notices table"
docker compose exec fastapi alembic upgrade head
```
- `models.py`에 `Notice` 추가 후 실행. autogenerate가 `notices` 테이블 생성 SQL을 자동 작성.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/models.py` | 수정 | `Text` import 추가, `Notice` 모델 추가 |
| `backend/app/schemas/notices.py` | 생성 | Pydantic 스키마 4종 정의 |
| `backend/app/api/v1/notices.py` | 생성 | CRUD 라우터 5개 엔드포인트 |
| `backend/main.py` | 수정 | `notices` import 및 라우터 등록 |

## 완료 체크리스트

- [ ] `GET /api/v1/notices?skip=0&limit=10` → `{ items: [...], total: N }` 응답 확인
- [ ] `GET /api/v1/notices/{id}` → 단건 상세 응답 확인
- [ ] `POST /api/v1/notices` → 201 응답, DB에 row 생성 확인
- [ ] `PUT /api/v1/notices/{id}` → 수정된 데이터 응답 확인
- [ ] `DELETE /api/v1/notices/{id}` → 204 응답, DB에서 row 삭제 확인
- [ ] 프론트 공지사항 목록 페이지에서 IndexedDB fallback 없이 서버 데이터 표시 확인
- [ ] `docker compose logs -f fastapi`에서 에러 없이 서버 기동 확인

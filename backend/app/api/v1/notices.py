import sys
import hashlib
import json
sys.path.insert(0, '/code')
from models import Notice
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.schemas.notices import (
    NoticeCreateRequest, NoticeResponse, NoticeListResult
)

router = APIRouter()


@router.get("", response_model=NoticeListResult)
def get_notices(skip: int = 0, limit: int = 10, db: Session = Depends(get_db), response: Response = None):
    total = db.query(Notice).count()
    items = db.query(Notice).order_by(Notice.created_at.desc()).offset(skip).limit(limit).all()
    response.headers["Cache-Control"] = "public, max-age=600"
    return {"items": items, "total": total}


@router.get("/{notice_id}")
def get_notice(notice_id: int, request: Request, db: Session = Depends(get_db)):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    body = json.dumps({
        "id": notice.id,
        "title": notice.title,
        "content": notice.content,
        "author_id": notice.author_id,
        "created_at": notice.created_at.isoformat(),
        "updated_at": notice.updated_at.isoformat(),
    }, ensure_ascii=False)

    etag = f'"{hashlib.md5(body.encode()).hexdigest()}"'

    if request.headers.get("If-None-Match") == etag:
        return FastAPIResponse(status_code=304, headers={"ETag": etag, "Cache-Control": "public, max-age=3600"})

    return FastAPIResponse(
        content=body,
        media_type="application/json",
        headers={
            "Cache-Control": "public, max-age=600",
            "ETag": etag,

        }
    )



@router.post("", response_model=NoticeResponse)
def create_notice(
    body: NoticeCreateRequest,
    db: Session = Depends(get_db),
):
    notice = Notice(title=body.title, content=body.content, author_id=1)
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice


@router.delete("/{notice_id}")
def delete_notice(
    notice_id: int,
    db: Session = Depends(get_db),
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    db.delete(notice)
    db.commit()
    return {"message": "deleted", "id": notice_id}

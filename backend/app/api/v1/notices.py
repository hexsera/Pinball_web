import sys
sys.path.insert(0, '/code')
from models import Notice, User
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.schemas.notices import (
    NoticeCreateRequest, NoticeResponse, NoticeListResult
)

router = APIRouter()


@router.get("", response_model=NoticeListResult)
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



@router.post("", response_model=NoticeResponse)
def create_notice(
    body: NoticeCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notice = Notice(title=body.title, content=body.content, author_id=current_user.id)
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice


@router.delete("/{notice_id}")
def delete_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    db.delete(notice)
    db.commit()
    return {"message": "deleted", "id": notice_id}

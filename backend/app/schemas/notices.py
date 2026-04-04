from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NoticeCreateRequest(BaseModel):
    title: str
    content: str


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


class NoticeListResult(BaseModel):
    items: list[NoticeListResponse]
    total: int

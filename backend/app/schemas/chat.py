from pydantic import BaseModel
from typing import Optional


class ChatRequest(BaseModel):
    chat_id: Optional[str] = None
    message: str


class ChatResponse(BaseModel):
    chat_id: str
    reply: str

from pydantic import BaseModel


class GameSessionSaveRequest(BaseModel):
    score: int
    lives: int
    stage: int


class GameSessionResponse(BaseModel):
    user_id: int
    score: int
    lives: int
    stage: int
    updated_at: str


class GameSessionDeleteResponse(BaseModel):
    message: str

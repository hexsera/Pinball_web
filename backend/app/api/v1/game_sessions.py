import json
import sys
sys.path.insert(0, '/code')
from models import User
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.redis_client import redis_client
from app.schemas.game_session import (
    GameSessionSaveRequest,
    GameSessionResponse,
    GameSessionDeleteResponse,
)

REDIS_TTL = 7200  # 2시간
router = APIRouter()


@router.put("/{user_id}", response_model=GameSessionResponse)
def save_game_session(
    user_id: int,
    data: GameSessionSaveRequest,
    current_user: User = Depends(get_current_user),
):
    key = f"game_session:{user_id}"
    payload = {
        **data.model_dump(),
        "user_id": user_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    redis_client.set(key, json.dumps(payload), ex=REDIS_TTL)
    return payload


@router.get("/{user_id}", response_model=GameSessionResponse)
def get_game_session(user_id: int):
    key = f"game_session:{user_id}"
    raw = redis_client.get(key)
    if raw is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return json.loads(raw)


@router.delete("/{user_id}", response_model=GameSessionDeleteResponse)
def delete_game_session(
    user_id: int,
    current_user: User = Depends(get_current_user),
):
    key = f"game_session:{user_id}"
    redis_client.delete(key)
    return GameSessionDeleteResponse(message="session deleted")

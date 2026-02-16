# backend/app/api/v1/__init__.py
"""
API v1 라우터 모듈
모든 v1 엔드포인트 라우터를 export
"""

from app.api.v1 import (
    auth,
    users,
    friends,
    monthly_scores,
    game_visits,
)

__all__ = [
    "auth",
    "users",
    "friends",
    "monthly_scores",
    "game_visits",
]

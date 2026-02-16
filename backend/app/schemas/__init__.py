# backend/app/schemas/__init__.py
"""
Pydantic 스키마 모듈
모든 스키마를 한 곳에서 import 가능하도록 export
"""

from app.schemas.user import (
    UserCreateRequest,
    UserRegisterRequest,
    UserUpdateRequest,
    UserResponse,
    LoginRequest,
    LoginResponse,
    DeleteResponse,
)

from app.schemas.monthly_score import (
    MonthlyScoreCreateRequest,
    MonthlyScoreUpdateRequest,
    MonthlyScoreResponse,
    MonthlyScoreListResponse,
    MonthlyScoreDeleteResponse,
)

from app.schemas.friendship import (
    FriendRequestRequest,
    FriendRequestResponse,
    FriendRequestData,
    FriendRequestListResponse,
    FriendRequestActionRequest,
    FriendRequestActionResponse,
)

from app.schemas.game_visit import (
    GameVisitUpdateRequest,
    GameVisitUpdateResponse,
    GameVisitCreateRequest,
    GameVisitCreateResponse,
    DailyVisitStats,
    DailyVisitStatsResponse,
    GameVisitDeleteRequest,
    GameVisitDeleteResponse,
)

__all__ = [
    # User schemas
    "UserCreateRequest",
    "UserRegisterRequest",
    "UserUpdateRequest",
    "UserResponse",
    "LoginRequest",
    "LoginResponse",
    "DeleteResponse",
    # MonthlyScore schemas
    "MonthlyScoreCreateRequest",
    "MonthlyScoreUpdateRequest",
    "MonthlyScoreResponse",
    "MonthlyScoreListResponse",
    "MonthlyScoreDeleteResponse",
    # Friendship schemas
    "FriendRequestRequest",
    "FriendRequestResponse",
    "FriendRequestData",
    "FriendRequestListResponse",
    "FriendRequestActionRequest",
    "FriendRequestActionResponse",
    # GameVisit schemas
    "GameVisitUpdateRequest",
    "GameVisitUpdateResponse",
    "GameVisitCreateRequest",
    "GameVisitCreateResponse",
    "DailyVisitStats",
    "DailyVisitStatsResponse",
    "GameVisitDeleteRequest",
    "GameVisitDeleteResponse",
]

from typing import Literal
from pydantic import BaseModel


class PlayDataPoint(BaseModel):
    timestamp: float
    ball_x: float
    ball_y: float
    ball_vx: float
    ball_vy: float
    left_flipper: bool
    right_flipper: bool


PlaystyleRequest = list[PlayDataPoint]


class PlaystyleResponse(BaseModel):
    success: bool
    playstyle: Literal["attack", "defence", "none"]
    reason: str

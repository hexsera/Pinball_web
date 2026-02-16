# backend/app/db/base.py
from app.db.session import Base

# 모든 모델을 import하여 Base.metadata에 등록
from models import User, Friendship, MonthlyScore, GameVisit

__all__ = ["Base", "User", "Friendship", "MonthlyScore", "GameVisit"]

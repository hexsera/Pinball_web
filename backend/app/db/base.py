# backend/app/db/base.py
# database.py의 Base를 그대로 사용 (models.py가 database.Base에 의존)
from database import Base

# 모든 모델을 import하여 Base.metadata에 등록
from models import User, Score, Friendship, MonthlyScore, GameVisit, HighScore

__all__ = ["Base", "User", "Score", "Friendship", "MonthlyScore", "GameVisit", "HighScore"]

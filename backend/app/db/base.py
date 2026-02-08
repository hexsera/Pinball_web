# backend/app/db/base.py
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# 모든 모델을 여기서 import하여 Base.metadata에 등록
# 현재는 models.py가 아직 분리되지 않았으므로 주석 처리
# Phase 5 이후에 models/ 분리 시 활성화 예정
# from app.models.user import User
# from app.models.score import Score
# from app.models.friendship import Friendship
# from app.models.visit import Visit
# from app.models.monthly_score import MonthlyScore

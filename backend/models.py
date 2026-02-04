from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, UniqueConstraint, CheckConstraint
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    nickname = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)
    birth_date = Column(Date, nullable=False)
    role = Column(String(20), nullable=False, default='user')


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    score = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)


class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, nullable=False, index=True)
    receiver_id = Column(Integer, nullable=False, index=True)
    status = Column(String(20), nullable=False, default='pending')
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)

    __table_args__ = (
        UniqueConstraint('requester_id', 'receiver_id', name='uq_friendship_pair'),
        CheckConstraint('requester_id != receiver_id', name='ck_no_self_friend'),
    )


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    visited_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)


class MonthlyScore(Base):
    __tablename__ = "monthly_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    nickname = Column(String(100), nullable=False)
    score = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)


class GameVisit(Base):
    __tablename__ = "game_visits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    is_visits = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

from enum import Enum
from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, UniqueConstraint, CheckConstraint, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), unique=True, nullable=True,
                    default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    nickname = Column(String(100), nullable=False)
    password = Column(String(255), nullable=True)   # 구글 가입 시 password 없음
    birth_date = Column(Date, nullable=False)
    role = Column(String(20), nullable=False, default='user')
    auth_provider = Column(String(20), nullable=False, default='local')  # DB에 이미 존재
    google_id = Column(String(255), nullable=True, unique=True)           # 신규 추가


class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    status = Column(String(20), nullable=False, default='pending')
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)

    __table_args__ = (
        UniqueConstraint('requester_id', 'receiver_id', name='uq_friendship_pair'),
        CheckConstraint('requester_id != receiver_id', name='ck_no_self_friend'),
    )




class MonthlyScore(Base):
    __tablename__ = "monthly_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    nickname = Column(String(100), nullable=False)
    score = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)


class GameVisit(Base):
    __tablename__ = "game_visits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    ip_address = Column(String(45), nullable=False, index=True)
    is_visits = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class Notice(Base):
    __tablename__ = "notices"

    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String(255), nullable=False)
    content    = Column(Text, nullable=False)
    author_id  = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())


class AclPermission(str, Enum):
    read   = "read"
    manage = "manage"


class AclEntry(Base):
    __tablename__ = "acl_entries"

    id            = Column(Integer, primary_key=True, index=True)
    actor_id      = Column(String(50), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False, index=True)
    resource_id   = Column(Integer, nullable=False, index=True)
    permission    = Column(String(20), nullable=False)

    __table_args__ = (
        UniqueConstraint('actor_id', 'resource_type', 'resource_id', 'permission', name='uq_acl_entry'),
        CheckConstraint("permission IN ('read', 'manage')", name='ck_acl_permission'),
    )

# backend/app/schemas/user.py
from pydantic import BaseModel
from datetime import date
from typing import Optional


class UserCreateRequest(BaseModel):
    """범용 사용자 생성 요청 (role 포함)"""
    email: str
    nickname: str
    password: str
    birth_date: date
    role: str


class UserRegisterRequest(BaseModel):
    """일반 회원가입 요청 (role 제외)"""
    email: str
    nickname: str
    password: str
    birth_date: date


class UserUpdateRequest(BaseModel):
    """사용자 수정 요청 (모든 필드 선택적)"""
    email: Optional[str] = None
    nickname: Optional[str] = None
    password: Optional[str] = None
    birth_date: Optional[date] = None
    role: Optional[str] = None


class UserResponse(BaseModel):
    """사용자 응답 (password 제외)"""
    id: int
    email: str
    nickname: str
    birth_date: date
    role: str

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """로그인 요청"""
    email: str
    password: str


class LoginResponse(BaseModel):
    """로그인 응답"""
    message: str
    user_id: int
    email: str
    nickname: str
    role: str


class DeleteResponse(BaseModel):
    """삭제 응답"""
    message: str
    deleted_user_id: int

from sqlalchemy import Column, Integer, String, Date
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    nickname = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)
    birth_date = Column(Date, nullable=False)
    role = Column(String(20), nullable=False, default='user')

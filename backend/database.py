import os
import time
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = f"mysql+pymysql://{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASSWORD')}@{os.getenv('MYSQL_HOST')}:{os.getenv('MYSQL_PORT')}/{os.getenv('MYSQL_DATABASE')}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def wait_for_db(max_retries=10, delay=2):
    """DB 연결 대기 함수 (재시도 로직)"""
    retries = 0
    print("start Database connect")
    while retries < max_retries:
        try:
            engine.connect()
            print("Database connected successfully")
            return True
        except Exception as e:
            retries += 1
            print(f"Database connection failed (attempt {retries}/{max_retries}): {e}")
            if retries < max_retries:
                time.sleep(delay)
    return False

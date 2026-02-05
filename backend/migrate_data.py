# backend/migrate_data.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from models import User, Score, Friendship, MonthlyScore, GameVisit

load_dotenv()

# MySQL 연결
MYSQL_URL = f"mysql+pymysql://{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASSWORD')}@{os.getenv('MYSQL_HOST')}:{os.getenv('MYSQL_PORT')}/{os.getenv('MYSQL_DATABASE')}"
mysql_engine = create_engine(MYSQL_URL)
MySQLSession = sessionmaker(bind=mysql_engine)

# PostgreSQL 연결
POSTGRES_URL = os.getenv("DATABASE_URL")
postgres_engine = create_engine(POSTGRES_URL)
PostgresSession = sessionmaker(bind=postgres_engine)

def migrate_model(model_class):
    """Model 기반으로 데이터를 MySQL에서 PostgreSQL로 복사"""
    table_name = model_class.__tablename__
    print(f"\n[{table_name}] 마이그레이션 시작...")

    # MySQL에서 데이터 읽기
    mysql_session = MySQLSession()
    try:
        rows = mysql_session.query(model_class).all()
        print(f"  - MySQL에서 {len(rows)}건 읽기 완료")

        if len(rows) == 0:
            print(f"  - {table_name} 테이블에 데이터가 없습니다.")
            return

        # 객체를 딕셔너리로 변환 (새 세션에서 사용하기 위해)
        row_dicts = []
        for row in rows:
            row_dict = {col.name: getattr(row, col.name) for col in model_class.__table__.columns}
            row_dicts.append(row_dict)
    finally:
        mysql_session.close()

    # PostgreSQL에 데이터 삽입
    postgres_session = PostgresSession()
    try:
        # 기존 데이터 삭제
        postgres_session.query(model_class).delete()
        print(f"  - PostgreSQL 기존 데이터 삭제 완료")

        # 새 데이터 삽입
        for row_dict in row_dicts:
            new_obj = model_class(**row_dict)
            postgres_session.add(new_obj)

        postgres_session.commit()
        print(f"  - PostgreSQL에 {len(row_dicts)}건 삽입 완료")
    except Exception as e:
        postgres_session.rollback()
        raise e
    finally:
        postgres_session.close()

def main():
    print("=== MySQL → PostgreSQL 데이터 마이그레이션 시작 ===")

    # 마이그레이션할 Model 목록
    models_to_migrate = [
        User,
        Score,
        Friendship,
        MonthlyScore,
        GameVisit,
    ]

    # 각 Model 마이그레이션 실행
    for model in models_to_migrate:
        try:
            migrate_model(model)
        except Exception as e:
            print(f"  - 오류 발생: {e}")

    print("\n=== 마이그레이션 완료 ===")

if __name__ == "__main__":
    main()

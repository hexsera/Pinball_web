
from sqlalchemy import text


def test_verify_db_name(db_session):
    # PostgreSQL의 현재 데이터베이스 이름을 가져오는 쿼리 실행
    result = db_session.execute(text("SELECT current_database();")).scalar()
    
    print(f"\n현재 연결된 DB 이름: {result}")
    
    # 설정한 테스트 DB 이름과 일치하는지 확인 (예: 'test_db')
    assert result == "hexdb_test"
    assert result != "hexdb"  # 운영 DB가 아님을 확신!
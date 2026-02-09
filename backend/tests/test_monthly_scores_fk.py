"""
MonthlyScore와 User 간의 Foreign Key 관계를 테스트
"""
import pytest
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from database import engine
from models import MonthlyScore, User


def test_monthly_scores_has_foreign_key_to_users():
    """monthly_scores 테이블의 user_id가 users 테이블의 id를 FK로 참조하는지 테스트"""
    inspector = inspect(engine)

    # monthly_scores 테이블의 Foreign Key 정보 가져오기
    foreign_keys = inspector.get_foreign_keys('monthly_scores')

    # Foreign Key가 최소 1개 이상 존재해야 함
    assert len(foreign_keys) > 0, "monthly_scores 테이블에 Foreign Key가 없습니다"

    # user_id 컬럼이 users.id를 참조하는 FK 찾기
    user_fk = None
    for fk in foreign_keys:
        if 'user_id' in fk['constrained_columns'] and fk['referred_table'] == 'users':
            user_fk = fk
            break

    # user_id가 users.id를 FK로 참조하는지 검증
    assert user_fk is not None, "monthly_scores.user_id가 users 테이블을 참조하는 FK가 없습니다"
    assert user_fk['referred_columns'] == ['id'], "FK가 users.id를 참조해야 합니다"
    assert 'user_id' in user_fk['constrained_columns'], "FK의 constrained_columns에 user_id가 있어야 합니다"

# /api/debug/db-info AttributeError 수정 실행계획

## 요구사항 요약

**요구사항**: `conftest.py`의 `db_session()` fixture를 수정하여 `db.get_bind()`가 프로덕션과 동일하게 `Engine` 객체를 반환하도록 한다.

**목적**: 프로덕션 코드는 변경하지 않는다. 테스트 환경이 프로덕션 환경을 최대한 동일하게 재현해야 테스트 결과를 신뢰할 수 있다. 현재 테스트 세션이 `Connection`에 bind되어 있어 프로덕션과 동작이 달라지는 문제를 해결한다.

## 현재상태 분석

1. `db.get_bind()` 반환값: 프로덕션 = `Engine`, 테스트 = `Connection` (불일치)
2. 원인: `TestSessionLocal(bind=connection)`으로 세션 생성 시 `Connection` 객체가 bind됨
3. `db.get_bind().url`은 `Engine`에만 있고 `Connection`에는 없어서 `AttributeError` 발생
4. 동일한 이유로 다른 엔드포인트에서도 `db.get_bind()`를 사용하면 잠재적 오류 가능성이 있음

## 구현 방법

SQLAlchemy 2.0의 공식 테스트 패턴(Join Session into External Transaction)을 올바르게 적용한다.
세션은 `Engine`에 bind된 상태로 생성하고, 외부 `Connection`에서 시작한 트랜잭션에 세션을 `join`하는 방식으로 변경한다.
이렇게 하면 `db.get_bind()`가 `Engine`을 반환하여 프로덕션과 동일해진다.

## 구현 단계

### 1. `db_session()` fixture를 Engine bind + 외부 트랜잭션 join 방식으로 변경

```python
@pytest.fixture(scope="function")
def db_session():
    """각 테스트마다 트랜잭션 생성 및 롤백 (프로덕션과 동일한 세션 방식)"""
    connection = test_engine.connect()
    transaction = connection.begin()

    # Engine에 bind된 세션 생성 (프로덕션과 동일)
    session = TestSessionLocal()

    # 세션이 외부 connection의 트랜잭션에 참여하도록 join
    session.bind = test_engine

    # session.commit() 호출 시 실제 커밋 대신 SAVEPOINT로 처리
    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, trans):
        if trans.nested and not trans._parent.nested:
            session.begin_nested()

    # 세션을 외부 connection의 트랜잭션에 연결
    session.connection(bind_arguments={"bind": connection})
    session.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()
```
- **무엇을 하는가**: 세션을 `Engine`에 bind하여 `db.get_bind()`가 `Engine`을 반환하도록 한다.
- `TestSessionLocal()` — `bind=connection` 인자 없이 생성하므로 내부적으로 `Engine`이 bind됨
- `session.connection(bind_arguments={"bind": connection})` — 세션의 실제 쿼리 실행을 외부 `connection`으로 연결
- `session.begin_nested()` — SAVEPOINT를 생성하여 테스트 내 `commit()`이 실제 DB에 반영되지 않도록 함
- `transaction.rollback()` — 테스트 종료 후 모든 데이터 원복

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/tests/conftest.py` | 수정 | `db_session()` fixture의 세션 생성을 `Engine` bind 방식으로 변경 |

## 완료 체크리스트

- [ ] `docker compose exec fastapi pytest tests/test_high_scores.py::test_create_high_score_success -v` 에서 `AttributeError` 없이 통과한다
- [ ] `db.get_bind()` 반환값이 `Engine` 객체임을 `test_verify_db_name` 테스트로 확인한다
- [ ] `docker compose exec fastapi pytest -v` 전체 테스트에서 `conftest` 관련 오류가 없다
- [ ] 프로덕션 서비스 재시작 시 정상 기동된다 (`docker compose up -d fastapi`)

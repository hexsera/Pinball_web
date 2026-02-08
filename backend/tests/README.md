# Tests 디렉토리

이 디렉토리는 TDD(Test-Driven Development) 방식으로 신규 API를 개발하기 위한 테스트 파일을 담는다.

## TDD 개발 순서

1. **테스트 작성**: 구현하려는 API의 동작을 테스트 코드로 먼저 작성한다 (실패하는 테스트)
2. **최소 구현**: 테스트를 통과할 수 있는 최소한의 코드만 작성한다
3. **리팩토링**: 테스트가 통과하면 코드를 개선한다
4. **반복**: 새로운 기능이 필요하면 1번부터 반복한다

## 테스트 실행 방법

```bash
cd backend
pytest                    # 모든 테스트 실행
pytest tests/test_example.py  # 특정 파일만 실행
pytest -v                 # 상세 출력
pytest -k "health"        # 특정 테스트만 실행 (이름 필터)
```

## 신규 API 개발 예시

예를 들어 `/api/items` 엔드포인트를 TDD로 개발한다면:

1. `tests/test_items.py` 파일 생성
2. 실패하는 테스트 작성:
   ```python
   def test_create_item(client):
       response = client.post("/api/items", json={"name": "Item1", "price": 100})
       assert response.status_code == 201
   ```
3. `pytest` 실행 → 실패 확인
4. `main.py`에 최소 코드 작성하여 테스트 통과
5. 리팩토링 → 재테스트

## 테스트 작성 팁

- fixture 활용: `client`, `db_session`은 conftest.py에 정의되어 있음
- 테스트 격리: 각 테스트는 독립적으로 실행되며, 트랜잭션 롤백으로 DB가 자동 초기화됨
- 테스트 DB: hexdb_test 사용 (프로덕션 hexdb와 분리)

## 테스트 DB 관리

테스트는 별도의 PostgreSQL 데이터베이스(hexdb_test)를 사용합니다.

- 각 테스트는 트랜잭션 내에서 실행되고, 완료 후 자동으로 롤백됩니다
- 테스트 간 데이터 격리가 보장됩니다
- 프로덕션 DB(hexdb)에는 영향을 주지 않습니다

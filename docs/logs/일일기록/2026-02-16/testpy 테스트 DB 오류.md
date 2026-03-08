# 목표
pytest 의 testDB 연결 문제를 해결한다.

## 상세사항
pytest 에 conftest.py 에 testDB 연결 fixture 가 testDB 에 연결이 되지 않는 문제가 있었으나,
내가 수정해서 testDB 까지는 연결이 되는 상태이다. 하지만 db_session(): 에 session 이 bind 로 인하여 실제 프로덕션 DB 환경과 다름으로 인해 실제 프로덕션 상황에서는 문제가 없지만 TDD 환경에서 문제가 생기는 문제가 발생한다. 또한 SQLAlecmy 가 2.0 버전이지만 1.0 버전 기준으로 코드를 작성한 부분이 있어서 해당 오류가 생겼음을 의심해야하는 상황이다.
결과적으로 TDD 의 DB 테스트 환경을 프로덕션 DB 환경과 동일하게 (DB 만 testDB 사용) 하여서 올바른 TDD 환경을 만드는게 목표이다.
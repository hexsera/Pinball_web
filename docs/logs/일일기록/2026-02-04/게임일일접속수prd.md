# 목표
fastapi 에 일일 게임 접속자수 용 PUT 엔드포인트를 생성한다.

## 상세사항
1. api 에 "api/v1/game_visits" 인 PUT 엔드포인트를 생성한다.
2. 해당 PUT 은 ip_address 를 받아 game_vitits 테이블에 is_vitis (bool) 필드를 수정한다.
3. 현재 DB 에 game_vitits 테이블은 만들어져 있지 않다. 테이블은 다음에 만들것이지만 임시로 DB 를 연결한다.

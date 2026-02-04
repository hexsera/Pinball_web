# 목표
fastapi 에 일일 게임 접속자수 용 POST 엔드 포인트를 생성한다.

## 상세사항
1. POST 에서 들어오는 정보는 user_id 가 들어온다.
2. 해당 요청 ip 를 game_visits 테이블에서 오늘 날짜 레코드를 조회하여 같은 ip 가 있는지 찾는다.
2-1. 만약 같은 ip 가 있으면 해당 레코드 user_id 가 null 인지 찾는다.
2-2. 해당 레코드 user_id 가 null 이고 POST 에서 들어온 user_id 가 null 이 아니라면 POST 에서 들어온 user_id 를 해당 레코드에 넣는다.
2-3. 2-1 에서 해당 레코드 user_id 가 null 이 아니라면 아무것도 하지 않는다.
3. 2 에서 레코드에 ip 가 없다면 해당 ip 를 추가한다.


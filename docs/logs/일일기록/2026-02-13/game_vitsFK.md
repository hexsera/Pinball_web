# 목표
game_vits 테이블의 user_id 를 users 테이블의 id 와 PK FK 관계를 설정한다.
users의 id 를 PK 로 game_vits 의 user_id 를 FK 로 지정한다.

## 상세사항
목표를 달성 후 users 테이블에 Delete 명령어에 관련된 FK 레코드를 먼저 지우는 작업에 game_vits 테이블도 추가한다.
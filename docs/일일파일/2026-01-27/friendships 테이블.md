# 목적
friendships 테이블을 만든다.

## 왜 만드는가?
친구 요청을 영구적으로 저장할 필요가 있다.

## 세부 사항
friendships 테이블에는 다음과 같은 컬럼이 필요하다.
id -> 기본 키
requester_id -> 친구 요청 보낸 사람 id
addressee_id -> 친구 요청 받은 사람 id
status -> 친구 요청 상태인지, 친구 상태인지, 거절 상태인지.


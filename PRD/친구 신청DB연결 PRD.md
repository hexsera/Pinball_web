# 목적
fastapi 의 "/api/friend-requests" 엔트포인트 작동을 friendships 테이블과 연결한다.

## 왜 만드는가?
현재 fastapi 의 "/api/friend-requests" 로 들어온 데이터는 영구적으로 저장되어 있지 않다. 이를 영구적으로 저장할 필요가 있다.

## 세부 사항
보안에 대해 고려하지 않을 것.
# 목표
월간 랭킹 테이블 ("/api/v1/monthly-scores") 의 POST GET PUT DELETE 를 DB 와 연결한다.

## 상세사항
POST 와 DELETE 을 DB 에 연결하는 것을 PHASE 1, GET 과 PUT 를 DB 에 연결하는 것을 PHASE 2 로 나누어라.

1. POST 할때 user_id 검색해 같은 user_id 가 있다면 score 를 더 높은 score 로 바꾸어라.
2. 전체 GET 은 score 기준으로 내림차순 하여 가져와라.

fastapi 에 월간 랭킹 데이터 임시 저장 메모리 monthly_scores 는 POST GET PUT DELETE 가 모두 DB 와 연결 된 후에 제거해라.

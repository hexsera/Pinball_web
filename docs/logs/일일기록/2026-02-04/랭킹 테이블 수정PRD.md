# 목표
ranking 테이블에 nickname 필드를 추가하고 "/api/v1/monthly-scores" POST 에서 DB 에 nickname 을 넣으려 할때 user 테이블의 nickname 을 찾아서 넣어줘야한다.

## 세부사항
1. ranking 테이블에 nickname 필드를 추가한다. 해당 필드은 user 테이블의 nickname 필드와 같다.
2. "/api/v1/monthly-scores" POST 에서 레코드를 추가하는 작업을 할 때 user 테이블에서 nickname 을 가져와 nickname 을 넣어주도록 한다.
3. "/api/v1/monthly-scores" GET 에서 MonthlyScoreResponse 에 nickname 을 추가한다. user_id 는 제거한다.
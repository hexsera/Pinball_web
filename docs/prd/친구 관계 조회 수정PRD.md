# 목표
friend-requests 의 GET 을 수정한다.

## 상세사항
friend-requests 의 GET 은 pending 인것만 가져오게 되어있다.
friend-requests 에서 user_id 와 status 를 받아서 해당 status 에 해당하는 것을 반환하게 만들고,
status 중 "all" 을 하면 모든걸 반환 하도록 해라.

그리고 user_id 가 requester_id 일때와 requester_id 일때 모두를 검색해야한다.
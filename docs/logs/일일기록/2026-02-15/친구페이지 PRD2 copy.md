# 목표
친구 페이지 친구 요청 및 현재 친구 수정

## 상세사항
1. 친구 요청에 friends api get 을 보내 친구 목록을 가져온다. 만약 해당 목록의 receiver_id 가 사용자 id 라면 친구요청란에 요청한 사람의 receiver_nickname 을 표시한 후 "승인" 버튼(초록색), "거절" 버튼을 표시한다.
2. 승인 버튼을 누르면 friends api 에 accept 을 보낸다.
3. 거절 버튼을 누르면 friends api reject 을 보낸다.

4. 현재 친구 영역에는 frieds api get 으로 얻은것중 status 가 "accepted" 인 친구를 표시한다.
5. 현재 친구는 receiver_id 가 사용자의 id 와 다르면 reciver_nickname 을, requester_id 가 사용자의 id 와 다르면 requester_nickname 을 친구 닉네임으로 표시해야한다.
# 목표
PinballPage.jsx 에 핀볼 컴포넌트 옆에 채팅창 컴포넌트를 만든다.
해당 채팅창 컴포넌트는 api 에 chat.py 와 연결한다. (chat/models 은 연결하지 않는다.)

## 상세사항
1. 디자인(색상)은 2_AI대전_핀볼_UI_상세PRD.md 파일을 참고한다.
2. api 는 chat.py 와 스키마를 확인한다. 중요한건 처음에 보낼때는 "chat_id" 는 new 로 보내야하고, 응답으로 새 "chat_id" 를 받아서 기억한 후 다음부터는 기억한 "chat_id" 로 보내야한다.
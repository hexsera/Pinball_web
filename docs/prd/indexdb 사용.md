# 목표
현재 공지사항 관련 페이지를 테스트 하기에 api 와 db 가 없어 시각 결과를 보기가 어렵다.
그렇기에 api 와 db 없이 프론트에서 테스트를 해볼 수 있도록 한다.

테스트를 할 겸 공부용으로 데이터는 indexdb 에서 가져오도록 테스트한다.
indexdb 에는 frontend/src/pages/Notice/NoticeListPage.jsx 용 데이터와
frontend/src/pages/Notice/NoticeDetailPage.jsx 용 데이터를 준비하고.
각 api 호출이 실패했을때 대신 indexdb 에서 가져오도록 한다.
indexdb 는 현재 mock 데이터 처럼 쓸 예정이니 나중에 api 가 생기면 삭제함을 생각해야한다.
# 목표
1. HomePage.jsx 의 로그인, 회원가입 버튼을 HeaderUserInfo.jsx 로 대체한다.
2. HomePage.jsx 가 모바일 환경에 헤더 레이아웃이 좋지않다. 이쁘게 꾸민다.

## 상세사항
1.
현재 HomePage.jsx 의 로그인, 회원가입 색상을 HeaderUserInfo.jsx 에 헬퍼로 만들어 props 로 해당 색상을 사용 할 수 있게 한다. 기존 HeaderUserInfo 색상은 기본값으로 지정한다.

2.
모바일 크기일때 Hexsera Pinball 폰트 크기를 줄이고 "게임하기" 버튼을 숨긴다.
"세상에서 가장 짜릿한 핀볼게임을 체험하세요" 가 모바일 환경에서
"세상에서\n가장 짜릿한\n핀볼게임을\n체험하세요" 처럼 나오게 해라.
<Grid container spacing={4} sx={{ mt: 16 }}> 의 mt 를 모바일 환경에서 8 로 주도록 해라.
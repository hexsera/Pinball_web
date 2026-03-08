# 문제사항
웹페이지에 접속하면 다음과 같은 문제가 생긴다.
(index):1 Mixed Content: The page at 'https://hexsera.com/' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://hexsera.com/api/v1/monthly-scores/'. This request has been blocked; the content must be served over HTTPS.

문제사항은 웹에서 http://hexsera.com/api/v1/monthly-scores/ 를 호출에 실패해 랭킹 데이터를 가져오지 못한다.

## 문제 상세
해당 문제는 2월 12일날 발견 한 문제이다. 2월 11일날 프론트를 빌드하여 docker volume 으로 올렸을 때 까지는 문제가 없었다.

2월 12일날 프론트를 빌드해서 바꾼것은 없었으며 backend(fastapi) 폴더 내부 파일만 수정하였다.
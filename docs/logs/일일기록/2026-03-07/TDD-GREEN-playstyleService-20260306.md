# TDD GREEN 완료: playstyleService.js

## 구현 완료 항목
- `playstyleService.js` 신규 생성 (sendPlaystyleData, parsePlaystyleResponse, getRandomSkill)
- `AIPinball.jsx` 40초 타이머 → 30초+10초 이중 타이머 교체
- cleanup에 responseTimerRef 해제 추가

## 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/pages/AIPinball/playstyleService.js` | 신규 생성 - 3가지 순수 함수 구현 |
| `frontend/src/pages/AIPinball/AIPinball.jsx` | playstyleService import 추가, ref 2개 추가, 40초→30초+10초 타이머 교체, cleanup 보강 |
| `frontend/src/test/playstyleService.test.js` | RED 테스트 파일 (7개 테스트) |

## 통과한 테스트 목록
1. sendPlaystyleData - axios를 올바른 URL로 POST 호출한다
2. sendPlaystyleData - 서버 응답 data를 반환한다
3. sendPlaystyleData - axios 실패 시 에러를 throw한다
4. parsePlaystyleResponse - 'attack' 응답을 'small'로 변환한다
5. parsePlaystyleResponse - 'defence' 응답을 'big'으로 변환한다
6. parsePlaystyleResponse - 알 수 없는 값은 null을 반환한다
7. getRandomSkill - 반환값이 항상 'big' 또는 'small' 중 하나다

## 다음 단계
- REFACTOR 단계 또는 추가 기능 구현

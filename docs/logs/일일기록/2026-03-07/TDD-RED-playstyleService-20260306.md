# TDD RED 계획: playstyleService.js

## 구현 목표

`frontend/src/pages/AIPinball/playstyleService.js`를 신규 생성하고 3가지 순수 함수를 구현한다.
이후 `AIPinball.jsx`의 40초 타이머를 30초+10초 이중 타이머 구조로 교체한다.

## 구현 대상 함수

### playstyleService.js
- `sendPlaystyleData(dataArray)`: POST /api/v1/pinball_ai/playstyle 호출, response.data 반환 (axios 사용)
- `parsePlaystyleResponse(response)`: 'attack' → 'small', 'defence' → 'big' 변환
- `getRandomSkill()`: 'big' 또는 'small' 항상 반환 (API 실패 fallback용)

### AIPinball.jsx 변경
- 40초 타이머 → 30초 타이머로 교체
- 30초 후 sendPlaystyleData 호출 + 10초 대기 타이머 시작
- 응답이 10초 내 도착 시 parsePlaystyleResponse 결과를 pendingSkillRef에 저장
- 10초 타이머 종료 시 pendingSkillRef 값(없으면 getRandomSkill())으로 skillState 설정

## RED 테스트 목록

### playstyleService.js 단위 테스트

1. `sendPlaystyleData - axios를 올바른 URL로 POST 호출한다`: POST /api/v1/pinball_ai/playstyle에 dataArray를 body로 전송
2. `sendPlaystyleData - 서버 응답 data를 반환한다`: axios 성공 시 response.data 반환
3. `sendPlaystyleData - axios 실패 시 에러를 throw한다`: 네트워크 오류 시 에러 전파
4. `parsePlaystyleResponse - attack 응답을 small로 변환한다`: { playstyle: 'attack' } → 'small'
5. `parsePlaystyleResponse - defence 응답을 big으로 변환한다`: { playstyle: 'defence' } → 'big'
6. `parsePlaystyleResponse - 알 수 없는 값은 null을 반환한다`: { playstyle: 'unknown' } → null
7. `getRandomSkill - 반환값이 항상 big 또는 small 중 하나다`: 반환값이 정확히 'big' 또는 'small'

## 테스트 파일 위치

`frontend/src/test/playstyleService.test.js`

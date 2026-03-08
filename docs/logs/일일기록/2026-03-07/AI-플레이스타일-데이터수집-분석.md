# AI 플레이스타일 데이터 수집 및 분석 PRD

## 목표

게임 시작 후 30초간 플립퍼 주변에서 공의 움직임과 플립퍼 입력 데이터를 수집하고, 백엔드 AI API에 전송해 사용자의 플레이스타일(공격형/수비형)을 분류한 뒤 그에 맞는 필살기를 활성화한다.

## 현재상태 분석

- `AIPinball.jsx`에 필살기 상태(`skillState`)와 `activateSpecialRef`가 이미 선언되어 있고 `SkillIcon` 컴포넌트가 렌더링 중이다.
- 필살기 아이콘 로딩 표시(`skillState: 'loading'`)는 이미 구현되어 있다.
- 플립퍼 키 입력 여부는 `isLeftKeyPressedRef`, `isRightKeyPressedRef`로 추적 중이다.
- 데이터 수집 trigger body, API 호출, 응답 처리 로직은 아직 존재하지 않는다.

## 실행 방법 및 단계

### Phase 1: 데이터 수집 + 40초 타이머로 랜덤 필살기 활성화

1. **Trigger body 생성**: Matter.js `Bodies.rectangle`로 좌우 플립퍼를 모두 포괄하는 하나의 넓은 sensor body를 생성하고 반투명 녹색으로 표시한다. (`isSensor: true`)
2. **충돌 감지 등록**: `Matter.Events.on(engine, 'collisionStart')`로 공이 trigger body에 닿는 순간을 감지해 `isBallInTriggerRef`를 `true`로 설정하고, `collisionEnd`에서 `false`로 해제한다.
3. **데이터 수집 interval 설정**: 게임 시작 시 `setInterval`(100ms, 초당 10회)을 시작한다. `isBallInTriggerRef`가 `true`일 때만 `{timestamp, ballX, ballY, ballVX, ballVY, leftFlipper, rightFlipper}`를 배열에 push한다.
4. **40초 타이머**: 게임 시작 시 `setTimeout` 40초를 설정한다. 타이머 종료 시 수집 배열을 콘솔에 출력하고, 랜덤(`'big'` 또는 `'small'`)으로 `skillState`를 설정해 `SkillIcon`에 결과를 전달한다.
5. **테스트용 b/s/l 키 제거 및 a 키 필살기 발동**: `handleKeyDown`에서 `b`, `s`, `l` 키 분기를 삭제한다. `a` 키 입력 시 `skillState`가 `'big'` 또는 `'small'`인 경우에만 `activateSpecialRef.current`를 호출해 해당 필살기 공으로 교체한다.
6. **interval/timer 정리**: 컴포넌트 언마운트(`useEffect` cleanup) 시 interval과 setTimeout을 모두 `clearInterval`/`clearTimeout`으로 해제한다.

### Phase 2: API 연동 - 서비스 레이어 분리 + TDD (추후 구현)

API 로직은 `frontend/src/pages/AIPinball/playstyleService.js`로 분리하고 Vitest TDD로 구현한다. `AIPinball.jsx`는 서비스 함수를 호출하기만 한다.

**`playstyleService.js` 함수 구성**
- `sendPlaystyleData(dataArray)`: `POST /api/v1/pinball_ai/playstyle` 호출, 응답 반환
- `parsePlaystyleResponse(response)`: `'attack'` → `'small'`, `'defence'` → `'big'` 변환 후 반환
- `getRandomSkill()`: `'big'` 또는 `'small'` 랜덤 반환

**`AIPinball.jsx` 변경 사항**
- Phase 1의 40초 타이머를 30초로 교체한다.
- 30초 후 `sendPlaystyleData`를 호출하고, 동시에 10초 대기 타이머를 시작한다.
- 응답이 10초 내 도착하면 `parsePlaystyleResponse`로 필살기를 결정해 `pendingSkillRef`에 저장한다.
- 10초 타이머 종료 시 `pendingSkillRef` 값(없으면 `getRandomSkill()`)으로 `skillState`를 설정한다.

## 사용 할 기술 및 패키지

| 기술/패키지 | 용도 |
|---|---|
| Matter.js `Bodies`, `Events` | Trigger sensor body 생성 및 충돌 감지 |
| `setInterval` / `setTimeout` | 100ms 수집 주기 및 40초/30초+10초 타이머 |
| React `useRef` | interval ID, timer ID, 수집 배열, trigger 충돌 상태 보관 |
| `playstyleService.js` (Phase 2) | API 호출, 응답 파싱, 랜덤 필살기 결정 순수 함수 모음 |
| Vitest (Phase 2) | `playstyleService.js` TDD 테스트 |

## 테스트 방법

1. 게임 시작 후 플립퍼 전체를 덮는 trigger body가 화면에 녹색 반투명으로 표시되는지 확인한다.
2. 공이 trigger body 안에 있을 때만 브라우저 콘솔에 수집 로그가 출력되는지 확인한다.
3. 40초 후 수집된 데이터 배열이 콘솔에 출력되고 `SkillIcon`이 big 또는 small로 변경되는지 확인한다.
4. `a` 키를 눌러 필살기가 발동되는지, 필살기 미확정(`loading`) 상태에서는 아무 반응이 없는지 확인한다.
5. `b`, `s`, `l` 키를 눌러 아무 반응이 없는지 확인한다.

## 체크리스트

- [ ] 게임 시작 시 플립퍼 영역을 통합한 녹색 반투명 sensor body 1개가 렌더링된다.
- [ ] 공이 trigger body 안에 있을 때만 콘솔에 수집 로그가 출력된다. (초당 10회)
- [ ] 공이 trigger body 밖으로 나가면 수집이 중단된다.
- [ ] 40초 후 수집된 데이터 배열이 콘솔에 출력된다.
- [ ] 40초 후 `SkillIcon`이 `'big'` 또는 `'small'`로 랜덤 변경된다.
- [ ] `a` 키 입력 시 `skillState`가 `'big'`이면 큰 공 필살기가 발동된다.
- [ ] `a` 키 입력 시 `skillState`가 `'small'`이면 작은 공 필살기가 발동된다.
- [ ] `skillState`가 `'loading'`일 때 `a` 키를 눌러도 아무 반응이 없다.
- [ ] `b`, `s`, `l` 키를 눌러도 아무 반응이 없다.
- [ ] 컴포넌트 언마운트 시 interval과 타이머가 모두 정리되어 메모리 누수가 없다.

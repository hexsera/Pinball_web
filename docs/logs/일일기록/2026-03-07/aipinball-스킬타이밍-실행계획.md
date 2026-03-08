# AIPinball 스킬 타이밍 수정 실행계획

## 요구사항 요약

**요구사항**:
1. API 응답 대기 시간을 10초 → 30초로 변경 (데이터 수집 10초는 유지)
2. 대기시간 내 API 응답이 오면 30초를 기다리지 않고 즉시 스킬 활성화

**목적**: 네트워크가 느린 환경에서 랜덤 스킬로 폴백되는 경우를 줄이고, 응답이 오면 불필요한 대기 없이 바로 스킬을 적용한다.

## 현재상태 분석

- [AIPinball.jsx:127](../frontend/src/pages/AIPinball/AIPinball.jsx#L127): `setCooldownProgress(elapsed / 10000)` — 충전 진행도를 10초 기준으로 계산 (수집 단계)
- [AIPinball.jsx:131](../frontend/src/pages/AIPinball/AIPinball.jsx#L131): `analysisTimerRef` — 10초 후 데이터 수집 종료 및 API 호출 (유지)
- [AIPinball.jsx:150~157](../frontend/src/pages/AIPinball/AIPinball.jsx#L150): `responseTimerRef` — API 호출 후 10초 대기, 만료 시 pendingSkill 또는 랜덤 스킬 적용
- API 응답이 오면 `pendingSkillRef.current`에 저장만 하고, 실제 스킬 적용은 responseTimer 만료까지 보류됨

## 구현 방법

- `analysisTimerRef`(데이터 수집 타이머)와 진행도 기준값은 10초 그대로 유지
- `responseTimerRef` setTimeout 딜레이를 `10000 → 30000`으로 변경
- API `.then()` 콜백에서 `pendingSkillRef`에 저장하는 동시에 즉시 스킬을 적용하고, responseTimer를 취소

## 구현 단계

### 1. responseTimer 딜레이 변경 (10000 → 30000)

```javascript
// 변경 전
responseTimerRef.current = setTimeout(() => {
  if (pendingSkillRef.current === null) {
    console.warn('API 응답이 오지 않았습니다. 랜덤 스킬을 적용합니다.');
  }
  const resolved = pendingSkillRef.current ?? getRandomSkill();
  skillStateRef.current = resolved;
  setSkillState(resolved);
}, 10000);

// 변경 후
responseTimerRef.current = setTimeout(() => {
  console.warn('API 응답이 오지 않았습니다. 랜덤 스킬을 적용합니다.');
  const skill = getRandomSkill();
  skillStateRef.current = skill;
  setSkillState(skill);
}, 30000);
```

- 폴백 대기시간을 30초로 늘려 API가 응답할 기회를 더 부여
- 30초 만료 시 `pendingSkillRef` 확인 없이 바로 랜덤 스킬 적용 (이미 응답이 왔다면 타이머가 취소되어 실행되지 않음)

### 2. API 응답 즉시 스킬 적용 및 타이머 취소

```javascript
// 변경 전
sendPlaystyleData(playstyleDataRef.current)
  .then((data) => {
    const skill = parsePlaystyleResponse(data);
    if (skill) {
      pendingSkillRef.current = skill;
    }
  })
  .catch((err) => {
    console.error('플레이스타일 API 오류:', err);
  });

// 변경 후
sendPlaystyleData(playstyleDataRef.current)
  .then((data) => {
    const skill = parsePlaystyleResponse(data);
    if (skill) {
      clearTimeout(responseTimerRef.current); // 폴백 타이머 취소
      skillStateRef.current = skill;
      setSkillState(skill);
    }
  })
  .catch((err) => {
    console.error('플레이스타일 API 오류:', err);
  });
```

- 응답이 오면 즉시 `clearTimeout`으로 폴백 타이머를 취소
- 그 직후 스킬을 적용해 30초를 기다리지 않고 즉시 활성화

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/pages/AIPinball/AIPinball.jsx` | 수정 | responseTimer 딜레이 10000→30000, .then()에서 즉시 스킬 적용 및 타이머 취소 추가 |

## 완료 체크리스트

- [ ] 스킬 충전 UI 바가 기존과 동일하게 10초 동안 채워지는지 확인
- [ ] API 응답이 30초 안에 오면 즉시 스킬 아이콘이 활성화되는지 확인
- [ ] API 응답이 30초를 초과하면 랜덤 스킬이 적용되는지 확인
- [ ] API 오류(catch) 발생 시 30초 후 랜덤 스킬이 적용되는지 확인

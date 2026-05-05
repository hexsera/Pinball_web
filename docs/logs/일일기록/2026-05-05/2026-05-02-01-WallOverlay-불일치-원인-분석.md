# WallOverlay.jsx 불일치 원인 분석

## 문제 요약

`Pinball.jsx`의 실제 물리 벽 위치와 `WallOverlay.jsx`의 시각적 오버레이 위치가 어긋나 있다.

## 원인

`AIPinball.jsx`가 `WallOverlay.jsx`를 공유 컴포넌트로 import해서 사용하고 있다.

```
frontend/src/pages/AIPinball/AIPinball.jsx
  └─ import WallOverlay from '../Pinball/WallOverlay';  ← 공유 중
```

`AIPinball.jsx`의 깔대기(funnel) 물리 좌표가 `Pinball.jsx`와 다르기 때문에, WallOverlay를 AIPinball 기준으로 수정하면 Pinball.jsx와 어긋나게 된다.

## 두 파일의 깔대기 물리 좌표 비교

| 항목 | Pinball.jsx | AIPinball.jsx |
|------|------------|---------------|
| 왼쪽 깔대기 center X | 105 | 147.3 |
| 왼쪽 깔대기 center Y | 915 | 915 |
| 왼쪽 깔대기 width | 260 | 262 |
| 오른쪽 깔대기 center X | 540 | 552.8 |
| 오른쪽 깔대기 center Y | 925 | 925 |
| 오른쪽 깔대기 width | 220 | 262 |

현재 `WallOverlay.jsx`의 좌표(`left:16.3, top:905` / `left:421.8, top:915`)는 AIPinball 기준(center 147.3, 552.8)에 맞춰져 있다.
Pinball.jsx 기준으로는 왼쪽 깔대기 `left: 105 - 130 = -25`, 오른쪽 `left: 540 - 110 = 430`이어야 한다.

## 결정사항

- **지금 해야 할 일**: `WallOverlay.jsx`를 `Pinball.jsx`의 물리 좌표에 정확히 맞게 수정한다.
- **나중에 할 일**: `AIPinball.jsx` 전용 오버레이 컴포넌트를 분리한다 (현재는 하지 않음).

현재 `WallOverlay.jsx`가 어느 쪽 기준으로 맞춰져야 하는지 혼동이 생긴 근본 원인은 두 게임이 같은 컴포넌트를 공유하면서 각자 다른 좌표를 사용하기 때문이다.

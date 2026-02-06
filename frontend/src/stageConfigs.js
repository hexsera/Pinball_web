// 스테이지 설정 데이터 정의
export const STAGE_CONFIGS = {
  1: {
    name: 'Stage 1',
    targetScore: 1000,  // 이 점수 달성 시 스테이지 2로 전환
    obstacles: [
      { type: 'circle', x: 300, y: 300, radius: 30, options: { isStatic: true, render: { fillStyle: '#0f3460' } } },
      { type: 'circle', x: 500, y: 300, radius: 30, options: { isStatic: true, render: { fillStyle: '#0f3460' } } }
    ],
    bumpers: [
      { x: 400, y: 600, radius: 40, options: { isStatic: true, restitution: 1.5, label: 'bumper', render: { fillStyle: '#e74c3c' } } }
    ],
    targets: [
      { x: 500, y: 590, radius: 40, options: { isStatic: true, restitution: 1.5, label: 'target', render: { fillStyle: '#87CEEB' } } }
    ]
  },
  2: {
    name: 'Stage 2',
    targetScore: null,  // 마지막 스테이지 (전환 없음)
    obstacles: [
      { type: 'circle', x: 200, y: 250, radius: 25, options: { isStatic: true, render: { fillStyle: '#8e44ad' } } },
      { type: 'circle', x: 400, y: 200, radius: 25, options: { isStatic: true, render: { fillStyle: '#8e44ad' } } },
      { type: 'circle', x: 500, y: 400, radius: 25, options: { isStatic: true, render: { fillStyle: '#8e44ad' } } }
    ],
    bumpers: [
      { x: 300, y: 500, radius: 35, options: { isStatic: true, restitution: 1.5, label: 'bumper', render: { fillStyle: '#e74c3c' } } },
      { x: 500, y: 700, radius: 35, options: { isStatic: true, restitution: 1.5, label: 'bumper', render: { fillStyle: '#e74c3c' } } }
    ],
    targets: [
      { x: 350, y: 350, radius: 35, options: { isStatic: true, restitution: 1.5, label: 'target', render: { fillStyle: '#87CEEB' } } },
      { x: 200, y: 600, radius: 35, options: { isStatic: true, restitution: 1.5, label: 'target', render: { fillStyle: '#87CEEB' } } }
    ]
  }
};

function WallOverlay() {
  return (
    <>
      {/* 왼쪽 벽: center(20,550), 40×1100 → left:0, top:0 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '40px',
        height: '1100px',
        background: 'linear-gradient(to right, #0a0a1a, #1a1a3e)',
        borderRight: '3px solid #00d4ff',
        boxShadow: 'inset -4px 0 12px rgba(0,212,255,0.3), 4px 0 15px rgba(0,212,255,0.4), inset -8px 0 0 0 #D1A47A',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* 천장 왼쪽(upWallLeft): center(100,20), 200×40 → left:0, top:0 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '200px',
        height: '40px',
        background: 'linear-gradient(to bottom, #0a0a1a, #1a1a3e)',
        borderBottom: '3px solid #00d4ff',
        boxShadow: 'inset 0 -4px 12px rgba(0,212,255,0.3), 0 4px 15px rgba(0,212,255,0.4), inset 0 -8px 0 0 #D1A47A',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* 천장 오른쪽(upWallRight): center(550,20), 300×40 → left:400, top:0 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '400px',
        width: '300px',
        height: '40px',
        background: 'linear-gradient(to bottom, #0a0a1a, #1a1a3e)',
        borderBottom: '3px solid #00d4ff',
        boxShadow: 'inset 0 -4px 12px rgba(0,212,255,0.3), 0 4px 15px rgba(0,212,255,0.4), inset 0 -8px 0 0 #D1A47A',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* 왼쪽 깔대기: center(105,915), 260×20, rotate(35deg)
          CSS top/left 는 div 중심이 아닌 좌상단 기준 → center에서 절반 빼기
          top: 915 - 10 = 905, left: 105 - 130 = -25 */}
      <div style={{
        position: 'absolute',
        top: '905px',
        left: '-25px',
        width: '260px',
        height: '20px',
        background: 'linear-gradient(to right, #1a0a2e, #2e1a4e)',
        border: '2px solid #e94560',
        boxShadow: '0 0 12px rgba(233,69,96,0.7), inset 0 0 6px rgba(233,69,96,0.3)',
        transform: 'rotate(35deg)',
        transformOrigin: 'center center',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* 오른쪽 깔대기: center(540,925), 220×20, rotate(-35deg)
          top: 925 - 10 = 915, left: 540 - 110 = 430 */}
      <div style={{
        position: 'absolute',
        top: '915px',
        left: '430px',
        width: '220px',
        height: '20px',
        background: 'linear-gradient(to left, #1a0a2e, #2e1a4e)',
        border: '2px solid #e94560',
        boxShadow: '0 0 12px rgba(233,69,96,0.7), inset 0 0 6px rgba(233,69,96,0.3)',
        transform: 'rotate(-35deg)',
        transformOrigin: 'center center',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

    </>
  );
}

export default WallOverlay;

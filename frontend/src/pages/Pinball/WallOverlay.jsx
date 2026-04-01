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

      {/* 왼쪽 깔대기: center(147.3,915), 262×20, rotate(35deg)
          top: 915 - 10 = 905, left: 147.3 - 131 = 16.3 */}
      <div style={{
        position: 'absolute',
        top: '905px',
        left: '16.3px',
        width: '262px',
        height: '20px',
        background: 'linear-gradient(to right, #1a0a2e, #2e1a4e)',
        border: '2px solid #e94560',
        boxShadow: '0 0 12px rgba(233,69,96,0.7), inset 0 0 6px rgba(233,69,96,0.3)',
        transform: 'rotate(35deg)',
        transformOrigin: 'center center',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* 오른쪽 깔대기: center(552.8,925), 262×20, rotate(-35deg)
          top: 925 - 10 = 915, left: 552.8 - 131 = 421.8 */}
      <div style={{
        position: 'absolute',
        top: '915px',
        left: '421.8px',
        width: '262px',
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

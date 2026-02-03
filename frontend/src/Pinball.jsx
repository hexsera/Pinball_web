import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import axios from 'axios';
import { Button, Box, Typography } from '@mui/material';
import { useAuth } from './AuthContext';

function Pinball() {
  const { user } = useAuth();
  const sceneRef = useRef(null);
  const bgmRef = useRef(null);
  const hitSoundRef = useRef(null);
  const ballRef = useRef(null);
  const livesRef = useRef(2);
  const scoreRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [overlayState, setOverlayState] = useState(null);
  const [bestScore, setBestScore] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [gameScale, setGameScale] = useState(1);

  const BASE_WIDTH = 816;
  const BASE_HEIGHT = 1296;

  // 음악 재생 버튼 클릭 핸들러
  const handlePlayMusic = () => {
    if (bgmRef.current) {
      bgmRef.current.play();
      setIsPlaying(true);
    }
  };

  // 점수 전송 및 최고점수 갱신 함수
  const submitScore = async () => {
    if (!user || !user.id) {
      console.log('User not logged in, score not submitted');
      return;
    }

    try {
      const response = await axios.post('/api/v1/monthly-scores', {
        user_id: user.id,
        score: scoreRef.current
      });
      console.log("sendsocre", scoreRef.current);
      console.log('Score submitted successfully:', response.data);
      setBestScore(response.data.score);
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  };

  // 최적 스케일 계산 함수
  const calculateScale = useCallback(() => {
    const canvasWidth = 700;
    const canvasHeight = 1200;
    const padding = 120; // 여백

    // 화면 너비/높이 기준으로 각각 계산
    const scaleByWidth = (windowSize.width - padding) / canvasWidth;
    const scaleByHeight = (windowSize.height - padding) / canvasHeight;

    // 둘 중 작은 값을 선택하여 화면에 꽉 차지 않도록
    const optimalScale = Math.min(scaleByWidth, scaleByHeight, 1);

    setGameScale(optimalScale);
  }, [windowSize]);




  useEffect(() => {
    // 배경음악 설정
    const bgm = new Audio('/audio/back_bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.05;
    bgmRef.current = bgm;

    // 충돌 사운드 설정
    const hitSound = new Audio('/audio/ball_hit.wav');
    hitSound.volume = 0.5;
    hitSoundRef.current = hitSound;

    // Matter.js 모듈 가져오기
    const Engine = Matter.Engine;
    const Render = Matter.Render;
    const Runner = Matter.Runner;
    const World = Matter.World;
    const Bodies = Matter.Bodies;
    const Body = Matter.Body;
    const Events = Matter.Events;
    const Constraint = Matter.Constraint;
    const Vector = Matter.Vector;

    // 엔진 만들기
    const engine = Engine.create({
        gravity: {
            x: 0,
            y: 1
        }
    });

    // 화면에 보여주기 위한 렌더러 만들기
    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: 700,
        height: 1100,
        wireframes: false,
        background: 'transparent'
      }
    });

    // 왼쪽 벽 (두께 40px, 내면 x=40)
    const leftWall = Bodies.rectangle(20, 550, 40, 1100, {
      isStatic: true,
      render: { fillStyle: '#16213e' }
    });

    // 오른쪽 벽 (두께 40px, 내면 x=660)
    const rightWall = Bodies.rectangle(700, 550, 40, 1100, {
      isStatic: true,
      render: { fillStyle: '#16213e' }
    });

    const rightWall2 = Bodies.rectangle(630, 550, 30, 1100, {
      isStatic: true,
      render: { fillStyle: '#16213e' }
    });

    // 천장 (두께 40px)
    const upWall = Bodies.rectangle(350, 20, 700, 40, {
      isStatic: true,
      render: { fillStyle: '#16213e' }
    });

    // 깔대기 경사면 설정값
    // 왼쪽: (40, 950) → (270, 1080), 오른쪽: (660, 950) → (430, 1080)
    // 수평 230px, 수직 130px → 길이 ≈ 264.2px, 각도 ≈ 29.5°
    //const FUNNEL_LENGTH = Math.sqrt(230 * 230 + 130 * 130); // ≈ 264.2
    const FUNNEL_ANGLE = 35 * Math.PI / 180;         // ≈ 0.515 rad (29.5°)
    const FUNNEL_THICKNESS = 20;

    // 깔대기 왼쪽 경사면 (중심: x=155, y=1015)
    const leftFunnelWall = Bodies.rectangle(105, 915, 260, FUNNEL_THICKNESS, {
      isStatic: true,
      render: { fillStyle: '#16213e' }
    });
    Body.setAngle(leftFunnelWall, FUNNEL_ANGLE);

    // 깔대기 오른쪽 경사면 (중심: x=545, y=1015)
    const rightFunnelWall = Bodies.rectangle(540, 925, 220, FUNNEL_THICKNESS, {
      isStatic: true,
      render: { fillStyle: '#16213e' }
    });
    Body.setAngle(rightFunnelWall, -FUNNEL_ANGLE);

    // 죽음구역 만들기 (깔대기 구멍 아래, 센서 역할)
    const deathZone = Bodies.rectangle(350, 1195, 700, 30, {
      isStatic: true,
      isSensor: true,
      label: 'deathZone',
      render: {
        fillStyle: '#8b0000',
        opacity: 0.3
      }
    });

    // 핀볼 공 만들기
    const ball = Bodies.circle(250, 400, 15, {
      restitution: 0.8,
      friction: 0,
      frictionAir: 0,
      render: { fillStyle: '#e94560' }

    });

    ballRef.current = ball;

    // 장애물 만들기
    const obstacle1 = Bodies.circle(300, 300, 30, {
      isStatic: true,
      render: { fillStyle: '#0f3460' }
    });

    const obstacle2 = Bodies.circle(500, 300, 30, {
      isStatic: true,
      render: { fillStyle: '#0f3460' }
    });

    // 범퍼 만들기 (충돌 시 강하게 튕겨냄)
    const bumper = Bodies.circle(400, 600, 40, {
      isStatic: true,
      restitution: 1.5,
      label: 'bumper',
      render: { fillStyle: '#e74c3c' }
    });

    // 목표 오브젝트 만들기 (충돌 시 강하게 튕겨냄)
    const target = Bodies.circle(500, 500, 40, {
      isStatic: true,
      restitution: 1.5,
      label: 'target',
      render: { fillStyle: '#87CEEB' }
    });

    // 왼쪽 플리퍼 (회전축 x=270, 중심 = 회전축 + 길이절반50 = x=320)
    const leftFlipper = Bodies.rectangle(320, 1090, 100, 20, {
      chamfer: { radius: 10 },
      render: { fillStyle: '#f39c12' },
      density: 0.001,
      isSleeping: false,
      sleepThreshold: Infinity
    });

    // 오른쪽 플리퍼 (회전축 x=430, 중심 = 회전축 - 길이절반50 = x=380)
    const rightFlipper = Bodies.rectangle(380, 1090, 100, 20, {
      chamfer: { radius: 10 },
      render: { fillStyle: '#f39c12' },
      density: 0.001,
      isSleeping: false,
      sleepThreshold: Infinity
    });

    const leftFlipperConstraint = Constraint.create({
      bodyA: leftFlipper,
      pointA: { x: -40, y: 0 },
      pointB: { x: 225, y: 995 }, // 경사면 끝점 왼쪽
      stiffness: 1,
      damping: 0,
      length: 0
    });

    const rightFlipperConstraint = Constraint.create({
      bodyA: rightFlipper,
      pointA: { x: 40, y: 0 },
      pointB: { x: 440, y: 995 }, // 경사면 끝점 오른쪽
      stiffness: 1,
      damping: 0,
      length: 0
    });
//(-Math.PI / 6;
    // 플리퍼 각도 제한 상수
    const LEFT_FLIPPER_MIN_ANGLE = -35 * Math.PI / 180  // -30도 (라디안)
    const LEFT_FLIPPER_MAX_ANGLE = 15 * Math.PI / 180;              // 0도
    const RIGHT_FLIPPER_MIN_ANGLE = -15 * Math.PI / 180;             // 0도
    const RIGHT_FLIPPER_MAX_ANGLE = 35 * Math.PI / 180;   // 30도 (라디안)
    const FLIPPER_SPEED = 0.3;

    // 키 누름 상태 변수
    let isLeftKeyPressed = false;
    let isRightKeyPressed = false;

    // 세계에 모든 물체 추가
    World.add(engine.world, [
      leftWall,
      rightWall,
      rightWall2,
      upWall,
      leftFunnelWall,
      rightFunnelWall,
      deathZone,
      ball,
      obstacle1,
      obstacle2,
      bumper,
      target,
      leftFlipper,
      rightFlipper,
      leftFlipperConstraint,
      rightFlipperConstraint
    ]);

    //

    Matter.Body.setVelocity(ball, {x:0, y:0});

    // 범퍼 충돌 이벤트
    Events.on(engine, 'collisionStart', (event) => {
      const pairs = event.pairs;

      pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        //console.log(bodyA);

        // 공이 포함된 충돌인지 확인하여 소리 재생
        if (bodyA === ball || bodyB === ball) {
          if (hitSoundRef.current) {
            hitSoundRef.current.currentTime = 0; // 재생 위치 초기화
            hitSoundRef.current.play().catch(err => {
              console.log('Sound play failed:', err);
            });
          }
        }

        // 공과 범퍼가 충돌했는지 확인
        if ((bodyA.label === 'bumper' && bodyB === ball) ||
            (bodyB.label === 'bumper' && bodyA === ball)) {
          console.log('Bumper hit!');

          // 충돌 방향 계산 (범퍼 중심 → 공 중심)
          const bumperBody = bodyA.label === 'bumper' ? bodyA : bodyB;
          const direction = Vector.sub(ball.position, bumperBody.position);
          const normalised = Vector.normalise(direction);

          // 공에 추가 속도 부여 (현재 속도 + 범퍼 효과)
          const bumperForce = Vector.mult(normalised, 15);
          const currentVelocity = ball.velocity;
          const newVelocity = Vector.add(currentVelocity, bumperForce);

          Body.setVelocity(ball, newVelocity);
        }

        // 공과 목표 오브젝트가 충돌했는지 확인
        if ((bodyA.label === 'target' && bodyB === ball) ||
            (bodyB.label === 'target' && bodyA === ball)) {
          console.log('target 충돌했음');
          setScore(prev => prev + 300);
        }

        // 죽음구역 충돌 감지
        if ((bodyA.label === 'deathZone' && bodyB === ball) ||
            (bodyB.label === 'deathZone' && bodyA === ball)) {
          console.log('Ball entered death zone!');

          // livesRef로 최신 lives 값 확인
          if (livesRef.current > 0) {
            // 공을 초기 위치로 이동
            Body.setPosition(ball, { x: 250, y: 400 });

            // 속도 초기화
            Body.setVelocity(ball, { x: 0, y: 0 });

            // 각속도 초기화 (회전 방지)
            Body.setAngularVelocity(ball, 0);

            // lives 감소 (상태와 ref 모두 업데이트)
            const newLives = livesRef.current - 1;
            livesRef.current = newLives;
            setLives(newLives);

            console.log(`Ball revived! Lives remaining: ${newLives}`);
          } else {
            // 생명이 없으면 공 제거 (게임 오버)
            World.remove(engine.world, ball);
            console.log('Game Over!');
            setOverlayState('gameOver');
            submitScore();
          }
        }
      });
    });

    // 플리퍼 각도 제한 및 속도 제어 이벤트
    Events.on(engine, 'beforeUpdate', () => {
      // 왼쪽 플리퍼 디버그 로그
      /* console.log('Left Flipper Debug:', {
        isLeftKeyPressed: isLeftKeyPressed,
        angle: leftFlipper.angle,
        angleDegrees: (leftFlipper.angle * 180 / Math.PI).toFixed(2),
        angularVelocity: leftFlipper.angularVelocity,
        isSleeping: leftFlipper.isSleeping,
        position: { x: leftFlipper.position.x, y: leftFlipper.position.y }
      }); */

      // 왼쪽 플리퍼 제어
      if (isLeftKeyPressed) {
        // 왼쪽 키를 누르고 있으면 반시계방향으로 회전
        Body.setAngularVelocity(leftFlipper, -FLIPPER_SPEED);
      } else {
        // 키를 떼면 0도로 복귀
        Body.setAngularVelocity(leftFlipper, FLIPPER_SPEED);
      }

      // 왼쪽 플리퍼 각도 제한
      if (leftFlipper.angle < LEFT_FLIPPER_MIN_ANGLE) {
        Body.setAngle(leftFlipper, LEFT_FLIPPER_MIN_ANGLE);
      }
      if (leftFlipper.angle > LEFT_FLIPPER_MAX_ANGLE) {
        Body.setAngle(leftFlipper, LEFT_FLIPPER_MAX_ANGLE);
      }

      // 오른쪽 플리퍼 제어
      if (isRightKeyPressed) {
        // 오른쪽 키를 누르고 있으면 시계방향으로 회전
        Body.setAngularVelocity(rightFlipper, FLIPPER_SPEED);
      } else {
        Body.setAngularVelocity(rightFlipper, -FLIPPER_SPEED);
      }

      // 오른쪽 플리퍼 각도 제한
      if (rightFlipper.angle > RIGHT_FLIPPER_MAX_ANGLE) {
        Body.setAngle(rightFlipper, RIGHT_FLIPPER_MAX_ANGLE);
      }
      if (rightFlipper.angle < RIGHT_FLIPPER_MIN_ANGLE) {
        Body.setAngle(rightFlipper, RIGHT_FLIPPER_MIN_ANGLE);
      }
    });

    // 엔진과 렌더러 시작
    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    const handleKeyDown = (event) => {
  if (event.key === 'ArrowLeft') {
    console.log('왼쪽 방향키 눌림');
    isLeftKeyPressed = true;
  }
  if (event.key === 'ArrowRight') {
    console.log('오른쪽 방향키 눌림');
    isRightKeyPressed = true;
  }
};

const handleTouchStart = (event) => {
  const touch = event.touches[0];
  const rect = sceneRef.current.getBoundingClientRect();
  const touchX = touch.clientX - rect.left;
  const centerX = rect.width / 2;

  if (touchX < centerX) {
    console.log('왼쪽 터치');
    isLeftKeyPressed = true;
  } else {
    console.log('오른쪽 터치');
    isRightKeyPressed = true;
  }
};

const handleKeyUp = (event) => {
  if (event.key === 'ArrowLeft') {
    isLeftKeyPressed = false;
  }
  if (event.key === 'ArrowRight') {
    isRightKeyPressed = false;
  }
};

const handleTouchEnd = () => {
  isLeftKeyPressed = false;
  isRightKeyPressed = false;
};

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

if (sceneRef.current) {
  sceneRef.current.addEventListener('touchstart', handleTouchStart);
  sceneRef.current.addEventListener('touchend', handleTouchEnd);
}

    // 컴포넌트가 사라질 때 정리
    return () => {
  if (bgmRef.current) {
    bgmRef.current.pause();
    bgmRef.current.currentTime = 0;
  }
  if (hitSoundRef.current) {
    hitSoundRef.current.pause();
    hitSoundRef.current.currentTime = 0;
  }
  Events.off(engine, 'beforeUpdate');
  Events.off(engine, 'collisionStart');
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  if (sceneRef.current) {
    sceneRef.current.removeEventListener('touchstart', handleTouchStart);
    sceneRef.current.removeEventListener('touchend', handleTouchEnd);
  }
  Render.stop(render);
  Runner.stop(runner);
  Engine.clear(engine);
};
  }, []);

  // 창 크기 변경 이벤트 리스너
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // score 상태가 변경될 때마다 scoreRef에 동기화
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // windowSize 변경 시 스케일 재계산
  useEffect(() => {
    calculateScale();
  }, [windowSize, calculateScale]);

  /*
display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'

  */

  return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {!isPlaying && (
          <Button variant="contained" onClick={handlePlayMusic}>
            음악 시작
          </Button>
        )}
        <Box sx={{
          position: 'relative',
          width: '700px',
          height: '1200px',
          transform: `scale(${gameScale})`,
          transformOrigin: 'top center'
        }}>
          {/* UI 영역 (상단 300px) */}
          <Box sx={{
            width: '700px',
            height: '100px',
            backgroundColor: '#000000',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Typography sx={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#ffffff'
            }}>
              LIVES: {lives}
            </Typography>
          </Box>

          {/* 게임 영역 (하단 1100px) */}
          <Box sx={{
            position: 'relative',
            width: '700px',
            height: '1100px',
            backgroundImage: 'url(/images/pinball_back.png)',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}>
            {/* 점수 컴포넌트 (게임 영역 내부, 반투명 흰색) */}
            <Box sx={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '8px',
              padding: '6px 20px',
              zIndex: 5
            }}>
              <Typography sx={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#000000'
              }}>
                SCORE: {score}
              </Typography>
            </Box>

            <div ref={sceneRef} />

            {/* 인게임 오버레이 (게임 캔버스 영역 위) */}
            {overlayState && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10,
                }}
              >
                {overlayState === 'gameOver' && (
                  <>
                    <Typography variant="h2" sx={{ color: '#ff0000', fontWeight: 'bold', mb: 4 }}>
                      GAME OVER
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#ffffff', mb: 2 }}>
                      획득 점수: {score}
                    </Typography>
                    <Typography variant="h5" sx={{ color: '#ffff00', mb: 4 }}>
                      최고 점수: {bestScore !== null ? bestScore : '---'}
                    </Typography>
                    <Button
                      variant="contained"
                      
                      sx={{ fontSize: '1.2rem', padding: '10px 30px' }}
                    >
                      다시 시작
                    </Button>
                  </>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
  )
  ;
}

export default Pinball;
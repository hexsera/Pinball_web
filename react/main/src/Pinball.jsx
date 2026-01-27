import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import { Button, Box, Typography } from '@mui/material';

function Pinball() {
  const sceneRef = useRef(null);
  const bgmRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(30);

  const BASE_WIDTH = 816;
  const BASE_HEIGHT = 1296;

  // 음악 재생 버튼 클릭 핸들러
  const handlePlayMusic = () => {
    if (bgmRef.current) {
      bgmRef.current.play();
      setIsPlaying(true);
    }
  };




  useEffect(() => {
    // 배경음악 설정
    const bgm = new Audio('/audio/back_bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.05;
    bgmRef.current = bgm;

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
        height: 1200,
        wireframes: false,
        background: 'transparent'
      }
    });

    // 바닥 만들기
    const ground = Bodies.rectangle(350, 1200, 700, 20, {
      isStatic: true,
      render: { fillStyle: '#16213e' }
    });

    // 왼쪽 벽
    const leftWall = Bodies.rectangle(0, 600, 20, 1200, {
      isStatic: true,
      render: { fillStyle: '#16213e' }
    });

    // 오른쪽 벽
    const rightWall = Bodies.rectangle(700, 600, 20, 1200, {
      isStatic: true,
      render: { fillStyle: '#16213e' }
    });

    const upWall = Bodies.rectangle(350, 0, 700, 20, {
      isStatic: true,
      render: { fillStyle: '#16213e' }
    });

    // 핀볼 공 만들기
    const ball = Bodies.circle(250, 400, 15, {
      restitution: 0.8,
      friction: 0,
      frictionAir: 0,
      render: { fillStyle: '#e94560' }

    });

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

    const leftFlipper = Bodies.rectangle(200, 1150, 100, 20, {
    chamfer: { radius: 10 },
    render: { fillStyle: '#f39c12' },
    density: 0.001,
    isSleeping: false,
    sleepThreshold: Infinity
    });

// 오른쪽 플리퍼 만들기
    const rightFlipper = Bodies.rectangle(550, 1150, 100, 20, {
    chamfer: { radius: 10 },
    render: { fillStyle: '#f39c12' },
    density: 0.001,
    isSleeping: false,
    sleepThreshold: Infinity
    });

    const leftFlipperConstraint = Constraint.create({
  bodyA: leftFlipper,
  pointA: { x: -40, y: 0 }, // 플리퍼 왼쪽 끝
  pointB: { x: 210, y: 1150 }, // 고정 위치
  stiffness: 1,
  damping: 0,
  length: 0
});

    const rightFlipperConstraint = Constraint.create({
  bodyA: rightFlipper,
  pointA: { x: 40, y: 0 }, // 플리퍼 오른쪽 끝
  pointB: { x: 540, y: 1150 }, // 고정 위치
  stiffness: 1,
  damping: 0,
  length: 0
});
//(-Math.PI / 6;
    // 플리퍼 각도 제한 상수
    const LEFT_FLIPPER_MIN_ANGLE = -35 * Math.PI / 180  // -30도 (라디안)
    const LEFT_FLIPPER_MAX_ANGLE = -15 * Math.PI / 180;              // 0도
    const RIGHT_FLIPPER_MIN_ANGLE = 15 * Math.PI / 180;             // 0도
    const RIGHT_FLIPPER_MAX_ANGLE = 35 * Math.PI / 180;   // 30도 (라디안)
    const FLIPPER_SPEED = 0.3;

    // 키 누름 상태 변수
    let isLeftKeyPressed = false;
    let isRightKeyPressed = false;

    // 세계에 모든 물체 추가
    World.add(engine.world, [
    ground,
    leftWall,
    rightWall,
    upWall,
    ball,
    obstacle1,
    obstacle2,
    bumper,
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
          backgroundImage: 'url(/images/pinball_back.png)',
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transform: { xs: 'scale(0.5)', sm: 'scale(0.5)', md: 'scale(0.8)' },
          transformOrigin: 'top center'
        }}>
          {/* 점수 표시 UI */}
          <Box sx={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '10px 20px',
            borderRadius: '8px',
            border: '2px solid #ffffff'
          }}>
            <Typography sx={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#ffffff',
              
            }}>
              SCORE: {score}
            </Typography>
          </Box>

          <div ref={sceneRef} />
        </Box>
      </Box>
  )
  ;
}

export default Pinball;
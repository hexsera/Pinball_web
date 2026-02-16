import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import axios from 'axios';
import { Button, Box, Typography, IconButton } from '@mui/material';
import { keyframes } from '@mui/system';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useAuth } from '../../contexts/AuthContext';
import { STAGE_CONFIGS, BUMPER_RADIUS } from './stageConfigs';
import { playFlipperSound, playLifeDownSound, playGameOverSound, playBumperSound } from './pinballSound';
import { getRestartState } from './pinballRestart';
import WallOverlay from './WallOverlay';

const scorePopAnimation = keyframes`
  0% {
    font-size: 120px;
    color: #ffffffee;
  }
  100% {
    font-size: 92px;
    color: #ffffffb2;
  }
`;

function Pinball({ onReady }) {
  const { user } = useAuth();
  const sceneRef = useRef(null);
  const bgmRef = useRef(null);
  const hitSoundRef = useRef(null);
  const fliperSoundRef = useRef(null);
  const lifeDownSoundRef = useRef(null);
  const gameoverSoundRef = useRef(null);
  const bumperSoundRef = useRef(null);
  const ballRef = useRef(null);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const stageRef = useRef(1);
  const stageBodiesRef = useRef([]);
  const engineRef = useRef(null);
  const loadStageMapRef = useRef(null);
  const plungerRef = useRef(null);
  const plungerStartRef = useRef(null);
  const plungerReleaseRef = useRef(null);
  const pressFlipperKeyRef = useRef(null);
  const releaseFlipperKeyRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [score, setScore] = useState(0);
  const [scoreAnimKey, setScoreAnimKey] = useState(0);
  const [lives, setLives] = useState(3);
  const [stage, setStage] = useState(1);
  const [overlayState, setOverlayState] = useState(null);
  const [bestScore, setBestScore] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const isLeftKeyPressedRef = useRef(false);
  const isRightKeyPressedRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const spaceHoldStartTimeRef = useRef(0);
  const [gameStarted, setGameStarted] = useState(false);
  const gameStartedRef = useRef(false);
  const runnerRef = useRef(null);

  const BASE_WIDTH = 816;
  const BASE_HEIGHT = 1296;

  const addScore = (points) => {
    setScore(prev => prev + points);
    setScoreAnimKey(prev => prev + 1);
  };

  // 마스터 볼륨 음소거 토글 핸들러
  const handleToggleMusic = () => {
    const allRefs = [bgmRef, hitSoundRef, fliperSoundRef, lifeDownSoundRef, gameoverSoundRef, bumperSoundRef];
    const nextMuted = !isMuted;
    allRefs.forEach(ref => {
      if (ref.current) ref.current.muted = nextMuted;
    });
    setIsMuted(nextMuted);
  };

  // 게임 시작 함수 (시작 UI에서 Space/클릭 시 호출)
  const startGame = () => {
    if (gameStartedRef.current) return;
    gameStartedRef.current = true;
    setGameStarted(true);
    engineRef.current.timing.timeScale = 1;
    bgmRef.current?.play().catch(() => {});
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

  // 재시작 핸들러
  const handleRestart = () => {
    const { overlayState, score, lives, stage } = getRestartState();

    // React 상태 초기화
    setOverlayState(overlayState);
    setScore(score);
    setLives(lives);
    setStage(stage);

    // ref 초기화
    scoreRef.current = score;
    livesRef.current = lives;
    stageRef.current = stage;

    // Matter.js 물리 상태 초기화
    const ball = ballRef.current;
    const engine = engineRef.current;
    if (ball && engine) {
      // 공을 World에 다시 추가 (게임오버 시 제거됐으므로)
      const World = Matter.World;
      const Body = Matter.Body;
      World.add(engine.world, ball);
      Body.setPosition(ball, { x: 662, y: 990 });
      Body.setVelocity(ball, { x: 0, y: 0 });
      Body.setAngularVelocity(ball, 0);
    }

    // plunger 원래 위치로 복귀
    if (plungerRef.current && engineRef.current) {
      Matter.Body.setPosition(plungerRef.current, { x: 662, y: 1020 });
    }

    // 스테이지 1 맵 다시 로딩
    if (loadStageMapRef.current) {
      loadStageMapRef.current(1);
    }
  };

  // 터치 디바이스 감지
  useEffect(() => {
    setIsTouchDevice(navigator.maxTouchPoints > 0);
  }, []);

  // 게임 방문 기록 API 호출
  useEffect(() => {
    const recordGameVisit = async () => {
      try {
        await axios.post('/api/v1/game_visits', {
          user_id: user?.id || null
        });
      } catch (error) {
        console.error('Game visit recording failed:', error);
      }
    };

    recordGameVisit();
  }, []);

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

    // 플리퍼 사운드 설정
    const fliperSound = new Audio('/audio/fliper.mp3');
    fliperSound.volume = 0.5;
    fliperSoundRef.current = fliperSound;

    // 라이프다운 사운드 설정
    const lifeDownSound = new Audio('/audio/lifedown_cut.mp3');
    lifeDownSound.volume = 0.7;
    lifeDownSoundRef.current = lifeDownSound;

    // 게임오버 사운드 설정
    const gameoverSound = new Audio('/audio/gameover.mp3');
    gameoverSound.volume = 0.7;
    gameoverSoundRef.current = gameoverSound;

    // 범퍼 사운드 설정
    const bumperSound = new Audio('/audio/bumper.mp3');
    bumperSound.volume = 0.7;
    bumperSoundRef.current = bumperSound;

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
    engine.timing.timeScale = 0; // 게임 시작 전 물리 정지
    engineRef.current = engine;

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

    // rightWall2: y=200~1100 구간만 벽 유지 (상단 160px 개방하여 Plunger lane 출구 생성)
    const rightWall2 = Bodies.rectangle(630, 700, 30, 850, {
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

    // Plunger lane 상단 가이드 벽 (공이 왼쪽 게임 필드로 나가도록 유도)
    const plungerLaneGuide = Bodies.rectangle(660, 150, 60, 10, {
      isStatic: true,
      angle: 40 * Math.PI/180,
      render: { fillStyle: '#16213e' }
    });

    // Plunger 상수
    const PLUNGER_X = 662;
    const PLUNGER_REST_Y = 1020;
    const PLUNGER_PULL_SPEED = 0.8;
    const PLUNGER_MAX_PULL_Y = 1080;
    const PLUNGER_MAX_LAUNCH_SPEED = 55;
    const SHELF_Y = 1010; // 발판벽 y좌표 (플런저 위)

    // 발판벽 (플런저 레인 내 공이 올라설 수평 발판)
    const plungerShelf = Bodies.rectangle(PLUNGER_X, SHELF_Y, 80, 10, {
      isStatic: true,
      label: 'plungerShelf',
      render: { fillStyle: '#16213e' }
    });

    // Plunger Body (시각적 표현, isStatic)
    const plunger = Bodies.rectangle(PLUNGER_X, PLUNGER_REST_Y, 30, 15, {
      isStatic: true,
      label: 'plunger',
      render: { fillStyle: '#c0c0c0' }
    });
    plungerRef.current = plunger;

    // 핀볼 공 만들기 (발판벽 위에서 시작)
    const ball = Bodies.circle(662, SHELF_Y - 20, 15, {
      restitution: 0.8,
      friction: 0,
      frictionAir: 0,
      render: { fillStyle: '#e94560' }

    });

    ballRef.current = ball;

    // 왼쪽 플리퍼 (회전축 x=270, 중심 = 회전축 + 길이절반50 = x=320)
    const leftFlipper = Bodies.rectangle(265, 995, 100, 20, {
      chamfer: { radius: 10 },
      render: { fillStyle: '#f39c12' },
      density: 0.001,
      isSleeping: false,
      sleepThreshold: Infinity
    });

    // 오른쪽 플리퍼 (회전축 x=430, 중심 = 회전축 - 길이절반50 = x=380)
    const rightFlipper = Bodies.rectangle(400, 995, 100, 20, {
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

    // 키 누름 상태 변수 (ref를 직접 사용)
    const isLeftKeyPressed = isLeftKeyPressedRef;
    const isRightKeyPressed = isRightKeyPressedRef;
    const isSpacePressed = isSpacePressedRef;
    const spaceHoldStartTime = spaceHoldStartTimeRef;

    // 맵 로딩 함수
    const loadStageMap = (stageNumber) => {
      // 기존 스테이지 Bodies 제거
      if (stageBodiesRef.current.length > 0) {
        World.remove(engine.world, stageBodiesRef.current);
        stageBodiesRef.current = [];
      }

      const config = STAGE_CONFIGS[stageNumber];
      const newBodies = [];

      // 장애물 생성
      config.obstacles.forEach((obs) => {
        const body = Bodies.circle(obs.x, obs.y, obs.radius, obs.options);
        newBodies.push(body);
      });

      // 범퍼 생성
      config.bumpers.forEach((b) => {
        const body = Bodies.circle(b.x, b.y, b.radius, b.options);
        newBodies.push(body);
      });

      // 목표물 생성
      config.targets.forEach((t) => {
        const body = Bodies.circle(t.x, t.y, t.radius, t.options);
        newBodies.push(body);
      });


      // World에 추가
      World.add(engine.world, newBodies);
      stageBodiesRef.current = newBodies;
    };
    loadStageMapRef.current = loadStageMap;

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
      leftFlipper,
      rightFlipper,
      leftFlipperConstraint,
      rightFlipperConstraint,
      plunger,
      plungerShelf,
      plungerLaneGuide
    ]);

    // 스테이지 1 맵 로딩
    loadStageMap(1);

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
          playBumperSound(bumperSoundRef.current);

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
          addScore(300);
        }

        // 죽음구역 충돌 감지
        if ((bodyA.label === 'deathZone' && bodyB === ball) ||
            (bodyB.label === 'deathZone' && bodyA === ball)) {
          console.log('Ball entered death zone!');
          const newLives = livesRef.current - 1;
          livesRef.current = newLives;
          setLives(newLives);
          playLifeDownSound(lifeDownSoundRef.current);

          // livesRef로 최신 lives 값 확인
          if (livesRef.current > 0) {
            // 공을 발판벽 위로 이동
            Body.setPosition(ball, { x: 662, y: 990 });

            // 속도 초기화
            Body.setVelocity(ball, { x: 0, y: 0 });

            // 각속도 초기화 (회전 방지)
            Body.setAngularVelocity(ball, 0);

            // lives 감소 (상태와 ref 모두 업데이트)
            

            console.log(`Ball revived! Lives remaining: ${newLives}`);
          } else {
            // 생명이 없으면 공 제거 (게임 오버)
            World.remove(engine.world, ball);
            console.log('Game Over!');
            playGameOverSound(gameoverSoundRef.current);
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
      if (isLeftKeyPressed.current) {
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
      if (isRightKeyPressed.current) {
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

      // Plunger 시각적 당기기 (스페이스바 누르고 있을 때)
      if (isSpacePressed.current) {
        const currentY = plunger.position.y;
        if (currentY < PLUNGER_MAX_PULL_Y) {
          Body.setPosition(plunger, {
            x: PLUNGER_X,
            y: Math.min(currentY + PLUNGER_PULL_SPEED, PLUNGER_MAX_PULL_Y)
          });
        }
      }
    });

    // 범퍼 네온 글로우 커스텀 렌더링
    let firstFrameFired = false;
    Events.on(render, 'afterRender', () => {
      if (!firstFrameFired) {
        firstFrameFired = true;
        onReady?.();
      }
      const ctx = render.context;

      // 발사 영역 디버그 렌더링 (빨간 반투명 사각형)
      /* const LAUNCH_ZONE = { x: 630, y: SHELF_Y - 25, w: 65, h: 25 };
      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(LAUNCH_ZONE.x, LAUNCH_ZONE.y, LAUNCH_ZONE.w, LAUNCH_ZONE.h);
      ctx.strokeRect(LAUNCH_ZONE.x, LAUNCH_ZONE.y, LAUNCH_ZONE.w, LAUNCH_ZONE.h);
      ctx.restore(); */

      // 플런저 스프링 코일 드로잉
      const px = plunger.position.x;
      const py = plunger.position.y + 8;
      const bottomY = 1100;
      const coilCount = 12;
      const coilWidth = 12;
      const segH = (bottomY - py) / coilCount;
      ctx.save();
      ctx.strokeStyle = '#b0b0b0';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#888888';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let i = 0; i < coilCount; i++) {
        const dirX = (i % 2 === 0) ? coilWidth : -coilWidth;
        ctx.lineTo(px + dirX, py + segH * (i + 0.5));
        ctx.lineTo(px, py + segH * (i + 1));
      }
      ctx.stroke();
      ctx.restore();

      const bumperBodies = stageBodiesRef.current.filter(b => b.label === 'bumper');

      bumperBodies.forEach((bumper) => {
        const { x, y } = bumper.position;
        const r = bumper.circleRadius || BUMPER_RADIUS;

        ctx.save();

        // 외곽 글로우 레이어 1 (가장 넓게 번짐)
        ctx.beginPath();
        ctx.arc(x, y, r + 12, 0, Math.PI * 2);
        ctx.shadowColor = '#ff2244';
        ctx.shadowBlur = 30;
        ctx.strokeStyle = 'rgba(255, 34, 68, 0.25)';
        ctx.lineWidth = 8;
        ctx.stroke();

        // 외곽 글로우 레이어 2 (중간)
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, Math.PI * 2);
        ctx.shadowColor = '#ff4466';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = 'rgba(255, 80, 100, 0.6)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 범퍼 몸체 (방사형 그라디언트)
        const bodyGrad = ctx.createRadialGradient(x, y - r * 0.3, r * 0.05, x, y, r);
        bodyGrad.addColorStop(0, '#ff6688');   // 중앙 밝은 핑크
        bodyGrad.addColorStop(0.5, '#cc1133'); // 중간 빨강
        bodyGrad.addColorStop(1, '#660011');   // 외곽 짙은 빨강
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.shadowColor = '#ff2244';
        ctx.shadowBlur = 15;
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // 내부 선명한 테두리 링
        ctx.beginPath();
        ctx.arc(x, y, r - 2, 0, Math.PI * 2);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ff8899';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 중앙 하이라이트 (상단 반사광)
        const highlightGrad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.35, 1, x, y, r * 0.55);
        highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
        highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = highlightGrad;
        ctx.fill();

        ctx.restore();
      });

      // 타겟 pop bumper 스타일 렌더링
      const targetBodies = stageBodiesRef.current.filter(b => b.label === 'target');

      targetBodies.forEach((target) => {
        const { x, y } = target.position;
        const radius = target.circleRadius || 40;

        ctx.save();

        // ① 외곽 글로우 레이어 1 (가장 넓게 번짐)
        ctx.beginPath();
        ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
        ctx.shadowColor = '#00aaff00';
        ctx.shadowBlur = 30;
        ctx.strokeStyle = 'rgba(186, 245, 255, 0.34)';
        ctx.lineWidth = 8;
        ctx.stroke();

        // ② 외곽 글로우 레이어 2 (중간)
        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
        ctx.shadowColor = '#33ccff00';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = 'rgba(93, 182, 255, 0.69)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // ③ 본체 (방사형 그라디언트: 중앙 밝은 하늘색 → 가장자리 진한 파란색)
        const gradient = ctx.createRadialGradient(x, y, radius * 0.28, x, y, radius);
        gradient.addColorStop(0, '#DDFAFF');
        gradient.addColorStop(0.5, '#77DDFF');
        gradient.addColorStop(1, '#2299CC');
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        //ctx.strokeStyle = '#1188BB';
        //ctx.lineWidth = 5;
        //ctx.stroke();

        // ② 방사형 톱니 별 패턴 (하늘색 계열, innerRadius를 더 작게 → 톱니 깊이 증가)
        ctx.fillStyle = 'rgba(0, 120, 180, 0.55)';
        const numPoints = 16;
        const outerRadius = radius;
        const innerRadius = radius * 0.45;
        ctx.beginPath();
        for (let i = 0; i < numPoints * 2; i++) {
          const r = (i % 2 === 0) ? outerRadius : innerRadius;
          const angle = (i / (numPoints * 2)) * Math.PI * 2;
          const px = x + r * Math.cos(angle);
          const py = y + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // ③ 내부 원 (톱니 중앙)
        const innerCircleGrad = ctx.createRadialGradient(x, y, 0, x, y, innerRadius);
        innerCircleGrad.addColorStop(0, '#EEFAFF');
        innerCircleGrad.addColorStop(1, '#44BBEE');
        ctx.beginPath();
        ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = innerCircleGrad;
        ctx.fill();
        //ctx.strokeStyle = '#1188BB';
        //ctx.lineWidth = 2;
        //ctx.stroke();

        ctx.restore();
      });
    });

    // 플런저 충전 시작 (버튼 onPointerDown에서 호출)
    plungerStartRef.current = () => {
      if (!isSpacePressed.current) {
        isSpacePressed.current = true;
        spaceHoldStartTime.current = Date.now();
      }
    };

    // 플런저 발사 (버튼 onPointerUp/onPointerLeave에서 호출)
    plungerReleaseRef.current = () => {
      if (isSpacePressed.current) {
        isSpacePressed.current = false;

        const holdDuration = Math.min(Date.now() - spaceHoldStartTime.current, 1500);
        const chargeRatio = Math.max(holdDuration / 1500, 0.1);
        const launchSpeed = PLUNGER_MAX_LAUNCH_SPEED * chargeRatio;

        const ballInLane = ball.position.x > 630 && ball.position.x < 695 &&
                           ball.position.y > SHELF_Y - 25 && ball.position.y < SHELF_Y;

        if (ballInLane) {
          Body.setVelocity(ball, { x: 0, y: -launchSpeed });
        }

        Body.setPosition(plunger, { x: PLUNGER_X, y: PLUNGER_REST_Y });
      }
    };

    // 엔진과 렌더러 시작
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);
    Render.run(render);

    const pressFlipperKey = (keyRef) => {
      if (!keyRef.current) {
        playFlipperSound(fliperSoundRef.current);
      }
      keyRef.current = true;
    };
    pressFlipperKeyRef.current = pressFlipperKey;

    const releaseFlipperKey = (keyRef) => {
      if (keyRef.current) {
        playFlipperSound(fliperSoundRef.current);
      }
      keyRef.current = false;
    };
    releaseFlipperKeyRef.current = releaseFlipperKey;

    const handleKeyDown = (event) => {
  // 게임 시작 전: Space만 인식하고 나머지 키 무시
  if (!gameStartedRef.current) {
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      startGame();
    }
    return;
  }
  if (event.key === 'ArrowLeft') {
    console.log('왼쪽 방향키 눌림');
    pressFlipperKey(isLeftKeyPressed);
  }
  if (event.key === 'ArrowRight') {
    console.log('오른쪽 방향키 눌림');
    pressFlipperKey(isRightKeyPressed);
  }
  // 스페이스바로 Plunger 충전
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    if (!isSpacePressed.current) {
      isSpacePressed.current = true;
      spaceHoldStartTime.current = Date.now();
      console.log('스페이스바 눌림 - Plunger 충전 시작');
    }
  }
  // 'n' 키로 스테이지 전환 (테스트용)
  if (event.key === 'n' || event.key === 'N') {
    const currentStage = stageRef.current;
    const nextStage = currentStage + 1;
    if (STAGE_CONFIGS[nextStage]) {
      console.log(`Stage ${currentStage} → Stage ${nextStage} (테스트)`);

      // 스테이지 전환
      stageRef.current = nextStage;
      setStage(nextStage);

      // 생명 초기화
      livesRef.current = 3;  // lives 상태는 +1이므로 ref는 2
      setLives(3);

      // 공을 Plunger lane으로 이동
      Body.setPosition(ball, { x: 662, y: 1020 });
      Body.setVelocity(ball, { x: 0, y: 0 });
      Body.setAngularVelocity(ball, 0);

      // 맵 전환
      loadStageMap(nextStage);
    } else {
      console.log('마지막 스테이지입니다');
    }
  }
};

const handleTouchStart = (event) => {
  const touch = event.touches[0];
  const rect = sceneRef.current.getBoundingClientRect();
  const touchX = touch.clientX - rect.left;
  const centerX = rect.width / 2;

  if (touchX < centerX) {
    console.log('왼쪽 터치');
    pressFlipperKey(isLeftKeyPressed);
  } else {
    console.log('오른쪽 터치');
    pressFlipperKey(isRightKeyPressed);
  }
};

const handleKeyUp = (event) => {
  if (event.key === 'ArrowLeft') {
    releaseFlipperKey(isLeftKeyPressed);
  }
  if (event.key === 'ArrowRight') {
    releaseFlipperKey(isRightKeyPressed);
  }
  // 스페이스바 발사
  if (event.key === ' ' || event.code === 'Space') {
    if (isSpacePressed.current) {
      isSpacePressed.current = false;

      const holdDuration = Math.min(Date.now() - spaceHoldStartTime.current, 1500);
      const chargeRatio = Math.max(holdDuration / 1500, 0.1);
      const launchSpeed = PLUNGER_MAX_LAUNCH_SPEED * chargeRatio;

      // 공이 발판벽 위에 있을 때만 발사
      const ballInLane = ball.position.x > 630 && ball.position.x < 695 &&
                         ball.position.y > SHELF_Y - 50 && ball.position.y < SHELF_Y;

      if (ballInLane) {
        Body.setVelocity(ball, { x: 0, y: -launchSpeed });
        console.log(`Plunger 발사! 충전: ${(chargeRatio * 100).toFixed(0)}%`);
      }

      // Plunger 원래 위치로 복귀
      Body.setPosition(plunger, { x: PLUNGER_X, y: PLUNGER_REST_Y });
    }
  }
};

const handleTouchEnd = () => {
  releaseFlipperKey(isLeftKeyPressed);
  releaseFlipperKey(isRightKeyPressed);
};

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

if (sceneRef.current && !(navigator.maxTouchPoints > 0)) {
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
  if (fliperSoundRef.current) {
    fliperSoundRef.current.pause();
    fliperSoundRef.current.currentTime = 0;
  }
  if (lifeDownSoundRef.current) {
    lifeDownSoundRef.current.pause();
    lifeDownSoundRef.current.currentTime = 0;
  }
  if (gameoverSoundRef.current) {
    gameoverSoundRef.current.pause();
    gameoverSoundRef.current.currentTime = 0;
  }
  if (bumperSoundRef.current) {
    bumperSoundRef.current.pause();
    bumperSoundRef.current.currentTime = 0;
  }
  Events.off(engine, 'beforeUpdate');
  Events.off(engine, 'collisionStart');
  Events.off(render, 'afterRender');
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  if (sceneRef.current && !(navigator.maxTouchPoints > 0)) {
    sceneRef.current.removeEventListener('touchstart', handleTouchStart);
    sceneRef.current.removeEventListener('touchend', handleTouchEnd);
  }
  Render.stop(render);
  Runner.stop(runner);
  Engine.clear(engine);
};
  }, []);

  // score 상태가 변경될 때마다 scoreRef에 동기화
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

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
        <Box sx={{
          position: 'relative',
          width: '700px',
          height: '1200px',
        }}>
          {/* UI 영역 (상단 300px) */}
          <Box sx={{
            width: '700px',
            height: '100px',
            backgroundColor: '#000000',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 20px'
          }}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '6px'
            }}>
              {Array.from({ length: lives }).map((_, index) => (
                <FavoriteIcon
                  key={index}
                  sx={{
                    fontSize: '36px',
                    color: '#ff1744'
                  }}
                />
              ))}
            </Box>

            <IconButton
              onClick={handleToggleMusic}
              sx={{
                color: '#ffffff7a',
                '&:hover': { color: '#ffffffb7' },
              }}
            >
              {!isMuted ? (
                <VolumeUpIcon sx={{ fontSize: '36px' }} />
              ) : (
                <VolumeOffIcon sx={{ fontSize: '36px' }} />
              )}
            </IconButton>
          </Box>

          {/* 게임 영역 (하단 1100px) */}
          <Box sx={{
            position: 'relative',
            width: '700px',
            height: '1100px',
            overflow: 'hidden',
            backgroundImage: 'url(/images/newbg.jpg)',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}>
            {/* CSS 벽 오버레이 (Canvas 아래, z-index:1) */}
            <WallOverlay />

            {/* 점수 컴포넌트 (게임 영역 내부, 투명) */}
            <Box sx={{
              position: 'absolute',
              top: '100px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 5
            }}>
              <Typography
                key={scoreAnimKey}
                sx={{
                  fontSize: '92px',
                  fontWeight: 'bold',
                  color: '#ffffffa1',
                  animation: scoreAnimKey > 0
                    ? `${scorePopAnimation} 3s ease-out forwards`
                    : 'none',
                }}
              >
                {score}
              </Typography>
            </Box>

            <div ref={sceneRef} style={{ position: 'relative', zIndex: 2 }} />

            {/* 모바일 조작 버튼 (터치 디바이스에서만 표시) */}
            {isTouchDevice && (
              <Box sx={{
                position: 'absolute',
                bottom: '40px',
                left: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 40px',
                zIndex: 20,
                pointerEvents: 'none',
                boxSizing: 'border-box',
              }}>
                {/* 왼쪽 플리퍼 버튼 */}
                <Box
                  onPointerDown={() => pressFlipperKeyRef.current?.(isLeftKeyPressedRef)}
                  onPointerUp={() => releaseFlipperKeyRef.current?.(isLeftKeyPressedRef)}
                  onPointerLeave={() => releaseFlipperKeyRef.current?.(isLeftKeyPressedRef)}
                  sx={{
                    width: '100px', height: '100px', borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    pointerEvents: 'auto',
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                />
                {/* 플런저 버튼 */}
                <Box
                  onPointerDown={() => { plungerStartRef.current && plungerStartRef.current(); }}
                  onPointerUp={() => { plungerReleaseRef.current && plungerReleaseRef.current(); }}
                  onPointerLeave={() => { plungerReleaseRef.current && plungerReleaseRef.current(); }}
                  sx={{
                    width: '100px', height: '100px', borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    pointerEvents: 'auto',
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                />
                {/* 오른쪽 플리퍼 버튼 */}
                <Box
                  onPointerDown={() => pressFlipperKeyRef.current?.(isRightKeyPressedRef)}
                  onPointerUp={() => releaseFlipperKeyRef.current?.(isRightKeyPressedRef)}
                  onPointerLeave={() => releaseFlipperKeyRef.current?.(isRightKeyPressedRef)}
                  sx={{
                    width: '100px', height: '100px', borderRadius: '50%',
                    backgroundColor: 'hsla(0, 0%, 100%, 0.20)',
                    pointerEvents: 'auto',
                    userSelect: 'none',
                    touchAction: 'none',
                  }}
                />
              </Box>
            )}

            {/* 게임 시작 UI 오버레이 */}
            {!gameStarted && (
              <Box
                onClick={startGame}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10,
                  cursor: 'pointer',
                }}
              >
                <Typography sx={{
                  fontSize: '92px',
                  fontWeight: 'bold',
                  color: '#e94560',
                  textShadow: '0 0 20px #e94560, 0 0 40px #e94560',
                  mb: 4,
                }}>
                  PINBALL
                </Typography>
                {!isTouchDevice && (
                  <>
                    <Typography sx={{ color: '#ffffff', fontSize: '32px', mb: 1 }}>← → : 플립퍼 작동</Typography>
                    <Typography sx={{ color: '#ffffff', fontSize: '32px', mb: 4 }}>SPACE : 플런저 발사</Typography>
                  </>
                )}
                <Typography sx={{ color: '#f39c12', fontSize: '32px', fontWeight: 'bold' }}>
                  {isTouchDevice ? '화면을 터치해서 시작' : 'PRESS SPACE TO START'}
                </Typography>
              </Box>
            )}

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
                      onClick={handleRestart}
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
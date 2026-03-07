# 플레이스타일 분석 API 기본 틀 PRD

## 목표

핀볼 플레이 데이터를 POST로 받아 Gemini AI 클라이언트를 1회용으로 생성하고, 프롬프트 없이 원시 응답값을 반환하는 `/api/v1/pinball_ai/playstyle` 엔드포인트를 구현한다.
이후 시스템 프롬프트 및 response 스키마 작업의 기반이 되는 API 틀을 완성하는 것이 목표다.

## 현재상태 분석

- `backend/app/api/v1/chat.py`에 Gemini 클라이언트 사용 예시가 있다. `genai.Client(api_key=settings.GEMINI_API_KEY)`로 클라이언트를 생성하고 `gemini-2.5-flash` 모델을 사용한다.
- `backend/main.py`에서 라우터를 `prefix="/api/v1/..."` 형태로 등록한다.
- `backend/app/core/config.py`에 `settings.GEMINI_API_KEY`가 이미 설정되어 있다.
- `pinball_ai` 관련 라우터 파일이 아직 존재하지 않는다.

## 실행 방법 및 단계

1. `backend/app/schemas/pinball_ai.py` 파일 생성: 요청 데이터 스키마(`PlayDataPoint`, `PlaystyleRequest`)와 응답 스키마(`PlaystyleResponse`) 정의
2. `backend/app/api/v1/pinball_ai.py` 파일 생성: `POST /playstyle` 엔드포인트 작성, Gemini 1회용 클라이언트 생성 후 수신 데이터를 문자열로 변환해 그대로 전달, 원시 응답 텍스트를 response에 반환
3. `backend/main.py`에 라우터 import 및 `prefix="/api/v1/pinball_ai"` 로 등록

## 사용 할 기술 및 패키지

| 기술/패키지 | 용도 |
|-------------|------|
| `google-genai` | Gemini AI 클라이언트 생성 및 콘텐츠 생성 (`genai.Client`) |
| `FastAPI` | API 엔드포인트 라우터 |
| `Pydantic (BaseModel)` | 요청/응답 데이터 스키마 정의 |
| `settings.GEMINI_API_KEY` | Gemini API 인증 키 (기존 config 재사용) |

## 요청/응답 스키마

### 요청 (Request)

`POST /api/v1/pinball_ai/playstyle`
- Content-Type: `application/json`
- Body: `PlayDataPoint` 객체의 배열

```python
class PlayDataPoint(BaseModel):
    timestamp: float      # 수집 시각 (초 단위, 게임 시작 기준)
    ball_x: float         # 공의 x 좌표 (픽셀)
    ball_y: float         # 공의 y 좌표 (픽셀)
    ball_vx: float        # 공의 x 방향 속도
    ball_vy: float        # 공의 y 방향 속도
    left_flipper: bool    # 왼쪽 플립퍼 버튼 누름 여부
    right_flipper: bool   # 오른쪽 플립퍼 버튼 누름 여부

# 엔드포인트 파라미터
PlaystyleRequest = list[PlayDataPoint]
```

```json
[
  {
    "timestamp": 1.0,
    "ball_x": 400.0,
    "ball_y": 900.0,
    "ball_vx": -2.5,
    "ball_vy": 5.0,
    "left_flipper": false,
    "right_flipper": true
  }
]
```

### 응답 (Response)

```python
class PlaystyleResponse(BaseModel):
    success: bool                          # 처리 성공 여부
    playstyle: Literal["attack", "defence"] # Gemini가 판단한 플레이 성향
```

```json
{
  "success": true,
  "playstyle": "attack"
}
```

## 테스트 방법

1. Docker 컨테이너 재시작 후 `GET /api/` 헬스체크로 서버 정상 구동 확인
2. `POST /api/v1/pinball_ai/playstyle`에 아래 형태의 JSON을 전송해 응답 확인

```json
[
  {
    "timestamp": 1.0,
    "ball_x": 400.0,
    "ball_y": 900.0,
    "ball_vx": -2.5,
    "ball_vy": 5.0,
    "left_flipper": false,
    "right_flipper": true
  }
]
```

## 체크리스트

- [ ] `POST /api/v1/pinball_ai/playstyle` 엔드포인트가 200 응답을 반환한다
- [ ] 응답 body에 `playstyle` 필드가 `"attack"` 또는 `"defence"` 값으로 반환된다
- [ ] 잘못된 형식의 요청(빈 배열, 필드 누락)을 보내면 422 Unprocessable Entity가 반환된다
- [ ] Docker 로그(`docker compose logs -f fastapi`)에서 Gemini 호출 관련 에러가 없다

# 핀볼 AI 시스템 프롬프트 및 response_schema 실행계획

## 요구사항 요약

**요구사항**: `PLAYSTYLE_PROMPT`를 구체적인 시스템 프롬프트로 교체하고, Gemini `response_schema`를 적용해 응답을 `"attack"`, `"defence"`, `"none"` 중 하나로 강제한다. `reason` 필드를 추가해 판단 근거를 함께 반환한다.

**목적**: 현재 텍스트 파싱 방식은 Gemini가 예상치 못한 형식으로 응답할 경우 항상 `"attack"` fallback이 발생한다. JSON 스키마 강제로 응답 신뢰성을 높이고, `"none"` 케이스를 정상 응답으로 처리해 데이터 부족 상황을 사용자에게 안내할 수 있다.

## 현재상태 분석

- `backend/app/schemas/pinball_ai.py`: `PlaystyleResponse`에 `reason` 필드 없음. `playstyle`은 `Literal["attack", "defence"]`만 허용.
- `backend/app/api/v1/pinball_ai.py`: `PLAYSTYLE_PROMPT`는 단순 1줄 지시문. `response_schema` 없이 `response.text.strip()`으로 파싱. `"attack"/"defence"` 외 응답 시 무조건 `"attack"` fallback.
- Gemini 모델 `gemini-2.5-flash`는 `response_schema` 지원됨.

## 구현 방법

- `schemas/pinball_ai.py`에서 Pydantic 모델을 수정해 `reason` 필드와 `"none"` 리터럴을 추가한다.
- `api/v1/pinball_ai.py`에서 `TypedDict`로 `response_schema`를 정의하고, `PLAYSTYLE_PROMPT`를 상세 시스템 프롬프트로 교체한다.
- Gemini `generate_content` 호출 시 `config`에 `response_mime_type`과 `response_schema`를 전달해 JSON 응답을 강제한다.
- 응답을 `json.loads(response.text)`로 파싱해 `playstyle`과 `reason` 두 필드를 추출한다.

## 구현 단계

### 1. `PlaystyleResponse` 스키마 수정

```python
# backend/app/schemas/pinball_ai.py
from typing import Literal
from pydantic import BaseModel


class PlayDataPoint(BaseModel):
    timestamp: float
    ball_x: float
    ball_y: float
    ball_vx: float
    ball_vy: float
    left_flipper: bool
    right_flipper: bool


PlaystyleRequest = list[PlayDataPoint]


class PlaystyleResponse(BaseModel):
    success: bool
    playstyle: Literal["attack", "defence", "none"]
    reason: str
```

- **무엇을 하는가**: `playstyle`에 `"none"` 리터럴을 추가하고, 판단 근거를 담는 `reason: str` 필드를 신규 추가한다.
- `reason`은 항상 반환되므로 `Optional`이 아닌 필수 필드로 선언한다.

### 2. `response_schema`용 `TypedDict` 정의

```python
# backend/app/api/v1/pinball_ai.py 상단에 추가
import json
import random
from typing import Annotated, Literal
from typing_extensions import TypedDict
from google import genai
from fastapi import APIRouter, Body
from app.core.config import settings
from app.schemas.pinball_ai import PlayDataPoint, PlaystyleResponse

router = APIRouter()


class PlaystyleSchema(TypedDict):
    playstyle: Literal["attack", "defence", "none"]
    reason: str
```

- **무엇을 하는가**: Gemini SDK가 `response_schema` 파라미터로 받는 `TypedDict` 클래스를 정의한다.
- `typing_extensions.TypedDict`를 사용해야 Gemini SDK가 타입 정보를 올바르게 읽는다.

### 3. `PLAYSTYLE_PROMPT` 교체

```python
PLAYSTYLE_PROMPT = """너는 핀볼 게임 플레이 데이터를 분석하는 AI다.

[작업]
아래 데이터를 분석하여 플레이어 성향을 다음 세 가지 중 하나로 분류한다.
- attack: 플리퍼를 정확한 타이밍에 제어하고, 공의 속도와 방향을 활용해 높은 점수를 노리는 공격적 플레이
- defence: 플리퍼를 자주 연타하거나 과도하게 조작해 공을 떨어뜨리지 않는 데 집중하는 수비적 플레이
- none: 데이터가 너무 적거나, 플리퍼 입력이 전혀 없어 성향을 판단할 수 없는 경우

[데이터 수집 조건]
이 데이터는 공이 플립퍼 주변 영역에 진입했을 때만 수집된다. 즉, 각 데이터 포인트는 플레이어가 플리퍼를 조작해야 하는 상황에서 기록된 것이다.

[입력 데이터 필드 설명]
- timestamp: 데이터 기록 시각 (초 단위)
- ball_x, ball_y: 공의 위치 좌표. 게임 화면 기준으로 x는 가로, y는 세로(아래로 갈수록 증가)
- ball_vx, ball_vy: 공의 속도 벡터. 양수 vx는 오른쪽, 양수 vy는 아래쪽 방향
- left_flipper: 왼쪽 플립퍼 상태. 회전축 위치 (x=225, y=995), 길이 100. true면 플립퍼가 올라간(타격) 상태
- right_flipper: 오른쪽 플립퍼 상태. 회전축 위치 (x=440, y=995), 길이 100. true면 플립퍼가 올라간(타격) 상태

[none 선택 조건]
- 데이터 포인트가 5개 미만인 경우
- 모든 left_flipper, right_flipper가 false여서 플리퍼 조작 패턴을 알 수 없는 경우
- 위 조건에 해당하면 reason에 판단 불가 이유를 한국어로 작성

[reason 작성 규칙]
- attack 또는 defence 선택 시: 판단 근거를 한국어로 1~2문장으로 작성
- none 선택 시: 판단할 수 없는 이유를 한국어로 1~2문장으로 작성

[플레이 데이터]
"""
```

- **무엇을 하는가**: AI가 각 분류 기준, 입력 필드 의미, `none` 조건, `reason` 작성 방법을 명확히 알 수 있도록 상세 프롬프트를 작성한다.
- `none` 조건을 구체적인 수치(5개 미만)로 명시해 AI의 판단 기준을 일관되게 만든다.

### 4. `generate_content` 호출 수정 및 응답 파싱 변경

```python
@router.post("/playstyle", response_model=PlaystyleResponse)
def analyze_playstyle(
    play_data: Annotated[list[PlayDataPoint], Body(min_length=1)],
):
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    data_str = "\n".join(str(point.model_dump()) for point in play_data)
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=PLAYSTYLE_PROMPT + data_str,
            config=genai.types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=PlaystyleSchema,
            ),
        )
        result = json.loads(response.text)
        playstyle = result["playstyle"]
        reason = result["reason"]
        return PlaystyleResponse(success=True, playstyle=playstyle, reason=reason)
    except Exception as e:
        print(f"[pinball_ai] Gemini 오류: {e}")
        playstyle = random.choice(["attack", "defence"])
        return PlaystyleResponse(
            success=False,
            playstyle=playstyle,
            reason="분석 중 오류가 발생했습니다.",
        )
```

- **무엇을 하는가**: `config`에 `response_mime_type`과 `response_schema`를 전달해 Gemini가 항상 정해진 JSON 구조로 응답하도록 강제한다.
- `json.loads(response.text)`로 파싱해 `playstyle`, `reason`을 추출한다.
- `"none"` 응답은 별도 fallback 없이 정상 응답으로 그대로 반환한다.
- 예외 발생 시 `success=False`와 `reason="분석 중 오류가 발생했습니다."`를 반환한다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/app/schemas/pinball_ai.py` | 수정 | `playstyle`에 `"none"` 추가, `reason: str` 필드 추가 |
| `backend/app/api/v1/pinball_ai.py` | 수정 | `TypedDict` 정의, `PLAYSTYLE_PROMPT` 교체, `generate_content` config 추가, 응답 파싱 변경 |

## 완료 체크리스트

- [ ] `POST /api/v1/pinball_ai/playstyle` 응답에 `playstyle`과 `reason` 두 필드가 항상 존재함
- [ ] 플립퍼 연타 데이터 전송 → `"playstyle": "defence"`, `reason`에 판단 근거 한국어 문장 포함
- [ ] 플립퍼 무반응(전부 false) 데이터 전송 → `"playstyle": "none"`, `reason`에 판단 불가 이유 포함
- [ ] 데이터 포인트 1~2개만 전송 → `"playstyle": "none"`, `reason`에 데이터 부족 이유 포함
- [ ] `playstyle` 값이 `"attack"`, `"defence"`, `"none"` 외 다른 값으로 오지 않음
- [ ] Gemini API 키 오류 시 `"success": false`, `"reason": "분석 중 오류가 발생했습니다."` 반환

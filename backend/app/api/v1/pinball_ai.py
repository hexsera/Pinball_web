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
        print(reason)
        return PlaystyleResponse(success=True, playstyle=playstyle, reason=reason)
    except Exception as e:
        print(f"[pinball_ai] Gemini 오류: {e}")
        playstyle = random.choice(["attack", "defence"])
        return PlaystyleResponse(
            success=False,
            playstyle=playstyle,
            reason="분석 중 오류가 발생했습니다.",
        )

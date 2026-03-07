import random
from typing import Annotated
from google import genai
from fastapi import APIRouter, Body
from app.core.config import settings
from app.schemas.pinball_ai import PlayDataPoint, PlaystyleResponse

router = APIRouter()

PLAYSTYLE_PROMPT = (
    "다음은 핀볼 게임 플레이 데이터다. "
    "이 데이터를 분석하여 플레이어의 성향을 'attack' 또는 'defence' 중 하나로만 답해라. "
    "다른 텍스트 없이 단어 하나만 반환해라.\n\n"
)


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
        )
        playstyle = response.text.strip().lower()
        if playstyle not in ("attack", "defence"):
            playstyle = "attack"
        return PlaystyleResponse(success=True, playstyle=playstyle)
    except Exception as e:
        print(f"[pinball_ai] Gemini 오류: {e}")
        playstyle = random.choice(["attack", "defence"])
        return PlaystyleResponse(success=False, playstyle=playstyle)

import uuid
from google import genai
from google.genai import types
from fastapi import APIRouter
from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter()

SYSTEM_PROMPT = (
    "너는 핀볼 게임에서 사용자와 대결 중인 AI 상대방이다. "
    "반말을 사용하고 흔한 게이머 말투(ㅋㅋ, ㄷㄷ, 실화냐, ㄹㅇ, 개잘함 등)를 구사해. "
    "욕설과 과한 표현은 반드시 순화해서 표현해 (예: '미친' → '헐', '개' → '엄청', '씨발' → '아씨'). "
    "핀볼 점수, 게임 전략, 승부 이야기 위주로 대화해. "
    "한국어로만 대화하고, 게임 외 주제는 핀볼 대결로 돌려서 답해. "
    "반드시 한 문장 이내로만 답해. 절대 두 문장 이상 보내지 마."
)

AI_INIT_TRIGGER = "__AI_INIT__"

# 서버 메모리에 chat_id → Chat 객체 보관
_sessions: dict = {}


def _get_client() -> genai.Client:
    return genai.Client(api_key=settings.GEMINI_API_KEY)


@router.get("/chat/models")
def list_models():
    models = [m.name for m in _get_client().models.list()]
    return {"models": models}


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    client = _get_client()
    print("session", _sessions)

    if request.chat_id and request.chat_id in _sessions:
        # 기존 세션 재사용

        chat_session = _sessions[request.chat_id]
        chat_id = request.chat_id
    else:
        # 새 세션 생성
        chat_session = client.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
            ),
        )
        chat_id = str(uuid.uuid4())
        _sessions[chat_id] = chat_session

    # AI 선제 메시지 트리거 처리
    if request.message == AI_INIT_TRIGGER:
        prompt = "대결 시작 전 상대방에게 짧은 인사를 반말 게이머 말투로 건네."
    else:
        prompt = request.message

    response = chat_session.send_message(prompt)
    return ChatResponse(chat_id=chat_id, reply=response.text)

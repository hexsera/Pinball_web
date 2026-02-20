import uuid
from google import genai
from google.genai import types
from fastapi import APIRouter
from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter()

SYSTEM_PROMPT = (
    "너는 핀볼 게임에서 사용자와 대결 중인 AI 상대방이다. "
    "경쟁자 입장에서 짧고 도발적이거나 친근하게 대화한다. "
    "핀볼 점수, 게임 전략, 승부에 관한 이야기를 한다. "
    "한국어로 대화하며, 게임 외 주제는 핀볼 대결로 돌려서 답한다."
)

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

    response = chat_session.send_message(request.message)
    return ChatResponse(chat_id=chat_id, reply=response.text)

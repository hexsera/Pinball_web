# Gemini AI 핀볼 대결 채팅 실행계획

## 요구사항 요약

**요구사항**: Gemini SDK를 사용해 "핀볼 대결 상대방" 역할의 AI 채팅 API를 FastAPI Docs에서 테스트 가능한 형태로 구현한다.

**목적**: 사용자가 핀볼 게임 중 AI 상대방과 채팅으로 대화할 수 있는 기능의 백엔드 기반을 마련한다. 현재는 Docs 테스트용으로 만들고, 이후 프론트엔드 채팅창에 연결한다.

## 현재상태 분석

- `backend/app/api/v1/chat.py`: 라우터 파일이 이미 존재하지만 **httpx로 REST API 직접 호출** 방식이며 시스템 프롬프트 없음
- `backend/app/schemas/chat.py`: `ChatRequest(message)` / `ChatResponse(reply)` 스키마 존재
- `backend/main.py`: chat 라우터가 **미등록** 상태 (`include_router` 누락)
- `backend/app/core/config.py`: `GEMINI_API_KEY` 환경변수가 **미정의** 상태
- `backend/requirements.txt`: `google-genai` 패키지 **미설치** 상태
- Gemini 무료 모델: `gemini-2.0-flash`

## 구현 방법

- `google-genai` Python SDK를 설치해 REST API 직접 호출 방식을 SDK 방식으로 교체한다.
- SDK의 `client.models.generate_content()` 호출 시 `config` 파라미터에 `system_instruction`을 넣어 AI에게 "핀볼 대결 상대방" 역할을 부여한다.
- `requirements.txt`에 패키지를 추가하고, `config.py` → `chat.py` → `main.py` 순서로 수정한다.

## 구현 단계

### 1. requirements.txt에 google-genai 패키지 추가

```text
# backend/requirements.txt 하단에 추가
google-genai
```
- `google-genai`는 Gemini Python 공식 SDK 패키지다.
- Docker 이미지 빌드 시 자동으로 설치된다.

### 2. config.py에 GEMINI_API_KEY 추가

```python
# backend/app/core/config.py
class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    API_KEY: str = os.getenv("API_KEY")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL")
    ADMIN_NICKNAME: str = os.getenv("ADMIN_NICKNAME")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD")
    ADMIN_BIRTH_DATE: str = os.getenv("ADMIN_BIRTH_DATE")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")  # 추가
```
- `settings.GEMINI_API_KEY`로 chat.py에서 API Key를 불러온다.
- `.env` 파일에 `GEMINI_API_KEY=실제키값` 항목을 별도로 추가해야 한다.

### 3. chat.py를 SDK 방식으로 전면 교체

```python
# backend/app/api/v1/chat.py
from google import genai
from google.genai import types
from fastapi import APIRouter, HTTPException
from app.core.config import settings
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter()

SYSTEM_PROMPT = (
    "너는 핀볼 게임에서 사용자와 대결 중인 AI 상대방이다. "
    "경쟁자 입장에서 짧고 도발적이거나 친근하게 대화한다. "
    "핀볼 점수, 게임 전략, 승부에 관한 이야기를 한다. "
    "한국어로 대화하며, 게임 외 주제는 핀볼 대결로 돌려서 답한다."
)

@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=request.message,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
        ),
    )
    return ChatResponse(reply=response.text)
```
- `genai.Client(api_key=...)` 로 SDK 클라이언트를 생성한다.
- `client.models.generate_content()`가 REST API 직접 호출을 대체한다.
- `types.GenerateContentConfig(system_instruction=...)` 으로 AI 역할을 부여한다.
- httpx, GEMINI_URL 등 REST 관련 코드는 모두 제거한다.

### 4. main.py에 chat 라우터 등록

```python
# backend/main.py
from app.api.v1 import users, auth, monthly_scores, game_visits, friends, chat  # chat 추가

# 기존 라우터 등록 아래에 추가
app.include_router(chat.router, prefix="/api/v1", tags=["Chat"])
```
- 등록 후 `POST /api/v1/chat` 엔드포인트가 FastAPI Docs(`/docs`)에 노출된다.

### 5. Docker 컨테이너 재빌드 및 테스트

```bash
docker compose up -d --build fastapi
docker compose logs -f fastapi
```
- `requirements.txt` 변경이 있으므로 `--build` 플래그로 이미지를 재빌드해야 한다.
- FastAPI Docs(`http://localhost:8000/docs`)에서 `POST /api/v1/chat` 으로 테스트한다.

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `backend/requirements.txt` | 수정 | `google-genai` SDK 패키지 추가 |
| `backend/app/core/config.py` | 수정 | `GEMINI_API_KEY` 환경변수 필드 추가 |
| `backend/.env` | 수정 | `GEMINI_API_KEY=실제키값` 항목 추가 |
| `backend/app/api/v1/chat.py` | 수정 | httpx REST 방식 → SDK 방식으로 전면 교체, 시스템 프롬프트 추가 |
| `backend/main.py` | 수정 | chat 라우터 import 및 `include_router` 등록 |

## 완료 체크리스트

- [ ] FastAPI Docs(`/docs`)에서 `POST /api/v1/chat` 엔드포인트가 보인다.
- [ ] `{"message": "안녕"}` 요청 시 핀볼 대결 상대방 역할로 응답이 온다.
- [ ] 게임 외 주제 메시지를 보내면 핀볼 대결 관련 내용으로 돌려서 답한다.
- [ ] `docker compose logs -f fastapi`에 에러 없이 서버가 정상 기동된다.
- [ ] Gemini API 키 오류(502) 없이 응답이 반환된다.

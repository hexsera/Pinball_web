# 핀볼 AI 시스템 프롬프트 및 response_schema 작성 PRD

## 목표

`backend/app/api/v1/pinball_ai.py`의 `PLAYSTYLE_PROMPT`를 구체적인 시스템 프롬프트로 교체하고,
Gemini의 `generation_config`에 `response_schema`를 적용해 응답을 `"attack"`, `"defence"`, `"none"` 중 하나로 강제한다.
`"none"`은 데이터가 부족하거나 판단 불가 시 반환되며, 이유를 `reason` 텍스트 필드로 함께 반환한다.
프론트엔드는 `"none"` 수신 시 `reason`을 표시해 사용자에게 상황을 안내한다.

## 현재상태 분석

- `pinball_ai.py`: `PLAYSTYLE_PROMPT`는 단순 지시문 1줄. `response_schema` 없이 텍스트 응답을 파싱함.
- `PlaystyleResponse` 스키마: `success`, `playstyle(attack|defence)` 2개 필드만 존재. `reason` 필드 없음.
- `PlayDataPoint` 스키마: `timestamp, ball_x/y, ball_vx/vy, left_flipper, right_flipper`.
- `"attack"/"defence"` 외 응답 시 무조건 `"attack"` fallback 처리 중 → `"none"` 케이스를 처리하지 못함.
- Gemini 모델: `gemini-2.5-flash`. `response_schema`는 이 모델에서 지원됨.

## 실행 방법 및 단계

1. `schemas/pinball_ai.py`의 `PlaystyleResponse`에 `reason: str` 필드를 추가한다.
2. `PlaystyleResponse`의 `playstyle` 타입을 `Literal["attack", "defence", "none"]`으로 변경한다.
3. `response_schema`용 `TypedDict`를 정의한다: `playstyle: Literal["attack", "defence", "none"]`, `reason: str`.
4. `PLAYSTYLE_PROMPT`를 아래 5가지 내용을 담은 시스템 프롬프트로 교체한다.
   1. 너는 무엇인지: 핀볼 게임 플레이 성향 분석 AI
   2. 해야할 작업: `attack`(공격적, 고수 행동), `defence`(수비적, 초보 행동), `none`(판단 불가) 분류 기준 설명
   3. 들어온 데이터 설명: 각 필드(timestamp, ball_x/y, ball_vx/vy, left_flipper, right_flipper) 의미 설명
   4. `none` 선택 조건: 데이터가 너무 적거나, 플립퍼 입력이 없어 성향을 판단할 수 없을 때. `reason`에 판단 불가 이유를 한국어로 작성.
   5. `attack`/`defence` 선택 시에도 `reason`에 판단 근거를 한국어로 1~2문장으로 작성.
5. `generate_content` 호출 시 `config`에 `response_mime_type: "application/json"`과 `response_schema`를 추가한다.
6. 응답 파싱을 `json.loads(response.text)`로 변경하고, `playstyle`, `reason` 두 필드를 모두 추출한다.
7. `playstyle`이 `"none"`일 때 별도 fallback 없이 그대로 반환한다 (정상 응답임).
8. 예외 발생 시 기존대로 `success=False`, `playstyle` 랜덤, `reason="분석 중 오류가 발생했습니다."` 반환.

## 사용 할 기술 및 패키지

| 기술/패키지 | 용도 |
|-------------|------|
| `google-genai` SDK | Gemini API 호출 (`from google import genai`) |
| `typing_extensions.TypedDict` | `response_schema` 타입 정의 |
| `typing.Literal` | playstyle 값을 `"attack"/"defence"/"none"`으로 제한 |
| `json` (표준 라이브러리) | Gemini JSON 응답 파싱 |

## 테스트 방법

1. `POST /api/v1/pinball_ai/playstyle`에 플립퍼 연타 패턴 데이터 전송 → `"defence"` + `reason` 확인.
2. 플립퍼 무반응 데이터 전송 → `"attack"` + `reason` 확인.
3. 데이터 포인트를 극소수(1~2개)만 전송 → `"none"` + 데이터 부족 이유 `reason` 확인.
4. 모든 `left_flipper/right_flipper`가 `false`이고 공 움직임도 없는 데이터 전송 → `"none"` 확인.
5. Gemini 오류 상황(잘못된 API 키) 시 `success: false` + `reason: "분석 중 오류가 발생했습니다."` 확인.

## 체크리스트

- [ ] 응답에 `playstyle`과 `reason` 두 필드가 항상 존재함
- [ ] 플립퍼 연타 데이터 → `"playstyle": "defence"`, `reason`에 근거 문장 포함
- [ ] 플립퍼 무반응 데이터 → `"playstyle": "attack"`, `reason`에 근거 문장 포함
- [ ] 극소수 데이터 전송 → `"playstyle": "none"`, `reason`에 데이터 부족/판단 불가 이유 포함
- [ ] `playstyle`이 `"attack"/"defence"/"none"` 외 다른 값으로 오지 않음 (스키마 강제 확인)
- [ ] Gemini 오류 시 `"success": false`, `reason: "분석 중 오류가 발생했습니다."` 반환

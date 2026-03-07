# TDD RED 계획: 플레이스타일 분석 API

## 구현 목표

핀볼 플레이 데이터를 POST로 받아 Gemini AI를 호출하고,
`playstyle` 필드(`"attack"` 또는 `"defence"`)를 반환하는
`POST /api/v1/pinball_ai/playstyle` 엔드포인트를 구현한다.

## RED 테스트 목록

1. `test_playstyle_returns_200`: 유효한 PlayDataPoint 배열 전송 시 200 반환
2. `test_playstyle_response_has_success_true`: 응답 body에 `success: true` 포함
3. `test_playstyle_response_has_valid_playstyle`: 응답 body의 `playstyle`이 `"attack"` 또는 `"defence"`
4. `test_playstyle_empty_array_returns_422`: 빈 배열 전송 시 422 반환
5. `test_playstyle_missing_field_returns_422`: 필드 누락 요청 시 422 반환

## 테스트 파일 위치

`backend/tests/test_pinball_ai.py`

## 모킹 전략

Gemini API는 실제 네트워크 호출이므로 `unittest.mock.patch`로 `genai.Client` 모킹.
- 성공 케이스: `"attack"` 또는 `"defence"` 반환하도록 mock 설정
- 422 케이스: mock 불필요 (스키마 검증 단계에서 거부)

import os
os.environ["TESTING"] = "1"

from unittest.mock import patch, MagicMock
import pytest


VALID_PLAY_DATA = [
    {
        "timestamp": 1.0,
        "ball_x": 400.0,
        "ball_y": 900.0,
        "ball_vx": -2.5,
        "ball_vy": 5.0,
        "left_flipper": False,
        "right_flipper": True,
    }
]


def _mock_gemini(playstyle: str):
    """Gemini 클라이언트를 모킹하는 헬퍼"""
    mock_response = MagicMock()
    mock_response.text = playstyle

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response
    return mock_client


def test_playstyle_returns_200(client):
    """유효한 PlayDataPoint 배열 전송 시 200 반환"""
    with patch("app.api.v1.pinball_ai.genai.Client", return_value=_mock_gemini("attack")):
        response = client.post("/api/v1/pinball_ai/playstyle", json=VALID_PLAY_DATA)
    assert response.status_code == 200


def test_playstyle_response_has_success_true(client):
    """응답 body에 success: true 포함"""
    with patch("app.api.v1.pinball_ai.genai.Client", return_value=_mock_gemini("attack")):
        response = client.post("/api/v1/pinball_ai/playstyle", json=VALID_PLAY_DATA)
    assert response.json()["success"] is True


def test_playstyle_response_has_valid_playstyle(client):
    """응답 body의 playstyle이 'attack' 또는 'defence'"""
    with patch("app.api.v1.pinball_ai.genai.Client", return_value=_mock_gemini("defence")):
        response = client.post("/api/v1/pinball_ai/playstyle", json=VALID_PLAY_DATA)
    assert response.json()["playstyle"] in ("attack", "defence")


def test_playstyle_empty_array_returns_422(client):
    """빈 배열 전송 시 422 반환"""
    response = client.post("/api/v1/pinball_ai/playstyle", json=[])
    assert response.status_code == 422


def test_playstyle_missing_field_returns_422(client):
    """필드 누락 요청 시 422 반환"""
    incomplete_data = [{"timestamp": 1.0, "ball_x": 400.0}]  # ball_y 등 누락
    response = client.post("/api/v1/pinball_ai/playstyle", json=incomplete_data)
    assert response.status_code == 422

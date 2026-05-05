import pytest
from fastapi.testclient import TestClient
from app.redis_client import redis_client


TEST_USER_ID = 999


@pytest.fixture(autouse=True)
def cleanup_redis():
    """각 테스트 전후로 테스트용 Redis key 삭제"""
    key = f"game_session:{TEST_USER_ID}"
    redis_client.delete(key)
    yield
    redis_client.delete(key)


def test_put_game_session_saves_data(auth_client):
    """PUT 요청 시 200 반환 + 응답에 score/lives/stage/user_id/updated_at 포함"""
    response = auth_client.put(
        f"/api/v1/game-sessions/{TEST_USER_ID}",
        json={"score": 1500, "lives": 2, "stage": 3}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == TEST_USER_ID
    assert body["score"] == 1500
    assert body["lives"] == 2
    assert body["stage"] == 3
    assert "updated_at" in body


def test_put_game_session_overwrites_existing(auth_client):
    """같은 user_id로 PUT 두 번 시 최신 값으로 덮어쓰기"""
    auth_client.put(f"/api/v1/game-sessions/{TEST_USER_ID}", json={"score": 1000, "lives": 3, "stage": 1})
    response = auth_client.put(f"/api/v1/game-sessions/{TEST_USER_ID}", json={"score": 2500, "lives": 1, "stage": 4})

    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 2500
    assert body["lives"] == 1
    assert body["stage"] == 4


def test_get_game_session_returns_saved_data(auth_client):
    """PUT 후 GET 요청 시 동일한 값 반환"""
    auth_client.put(f"/api/v1/game-sessions/{TEST_USER_ID}", json={"score": 3000, "lives": 2, "stage": 2})

    response = auth_client.get(f"/api/v1/game-sessions/{TEST_USER_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == TEST_USER_ID
    assert body["score"] == 3000
    assert body["lives"] == 2
    assert body["stage"] == 2


def test_get_game_session_returns_404_when_not_found(auth_client):
    """세션 없는 user_id로 GET 시 404 반환"""
    response = auth_client.get(f"/api/v1/game-sessions/{TEST_USER_ID}")

    assert response.status_code == 404


def test_delete_game_session_removes_data(auth_client):
    """DELETE 후 GET 요청 시 404 반환"""
    auth_client.put(f"/api/v1/game-sessions/{TEST_USER_ID}", json={"score": 500, "lives": 3, "stage": 1})
    auth_client.delete(f"/api/v1/game-sessions/{TEST_USER_ID}")

    response = auth_client.get(f"/api/v1/game-sessions/{TEST_USER_ID}")
    assert response.status_code == 404


def test_delete_game_session_returns_success_message(auth_client):
    """DELETE 요청 시 200 + {"message": "session deleted"} 반환"""
    auth_client.put(f"/api/v1/game-sessions/{TEST_USER_ID}", json={"score": 500, "lives": 3, "stage": 1})

    response = auth_client.delete(f"/api/v1/game-sessions/{TEST_USER_ID}")

    assert response.status_code == 200
    assert response.json() == {"message": "session deleted"}


def test_delete_game_session_is_idempotent(auth_client):
    """세션 없는 user_id로 DELETE 시에도 200 반환 (멱등성)"""
    response = auth_client.delete(f"/api/v1/game-sessions/{TEST_USER_ID}")

    assert response.status_code == 200
    assert response.json() == {"message": "session deleted"}

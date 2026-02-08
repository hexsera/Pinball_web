"""
개인 최고기록 API 테스트

TDD 순서:
1. RED: 실패하는 테스트 작성 (이 파일)
2. RED 검증: pytest 실행하여 실패 확인
3. GREEN: 최소한의 코드로 테스트 통과
4. GREEN 검증: pytest 실행하여 통과 확인
5. REFACTOR: 코드 정리
"""

import pytest


def test_create_high_score_success(client, db_session):
    """최초 최고 기록 생성 성공 케이스"""
    response = client.post(
        "/api/v1/high-scores",
        json={"user_id": 1, "score": 1000}
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == 1
    assert data["score"] == 1000
    assert "created_at" in data


def test_create_high_score_updates_if_higher(client, db_session):
    """기존 점수보다 높은 점수로 업데이트"""
    # 기존 기록 생성
    client.post("/api/v1/high-scores", json={"user_id": 1, "score": 1000})

    # 더 높은 점수로 요청
    response = client.post(
        "/api/v1/high-scores",
        json={"user_id": 1, "score": 1500}
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == 1
    assert data["score"] == 1500  # 업데이트됨


def test_create_high_score_keeps_existing_if_lower(client, db_session):
    """기존 점수보다 낮으면 기존 점수 유지"""
    # 기존 기록 생성
    client.post("/api/v1/high-scores", json={"user_id": 1, "score": 2000})

    # 더 낮은 점수로 요청
    response = client.post(
        "/api/v1/high-scores",
        json={"user_id": 1, "score": 1000}
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == 1
    assert data["score"] == 2000  # 기존 점수 유지


def test_create_high_score_without_user_id(client, db_session):
    """user_id 없이 요청 시 422 에러"""
    response = client.post(
        "/api/v1/high-scores",
        json={"score": 1000}  # user_id 누락
    )

    assert response.status_code == 422

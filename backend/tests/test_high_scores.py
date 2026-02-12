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
    """client 확인용"""
    response = client.get("/api/debug/db-info")
    data = response.json()
    print(data)

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


# ===== GET API 테스트 (개인 최고기록 조회) =====

def test_get_high_score_returns_200_for_existing_user(client, db_session):
    """존재하는 사용자의 최고 기록 조회 시 200 상태 코드 반환"""
    # Given: user_id=1인 점수 기록이 DB에 존재
    client.post("/api/v1/high-scores", json={"user_id": 1, "score": 15000})

    # When: GET /api/v1/high-scores?user_id=1 요청
    response = client.get("/api/v1/high-scores?user_id=1")

    # Then: 200 OK 응답
    assert response.status_code == 200


def test_get_high_score_returns_score_data(client, db_session):
    """응답 본문에 점수 데이터 포함"""
    # Given: user_id=1, score=15000 기록이 DB에 존재
    client.post("/api/v1/high-scores", json={"user_id": 1, "score": 15000})

    # When: GET /api/v1/high-scores?user_id=1 요청
    response = client.get("/api/v1/high-scores?user_id=1")

    # Then: response.json()에 score 필드가 15000
    data = response.json()
    assert data["score"] == 15000


def test_get_high_score_returns_user_id(client, db_session):
    """응답 본문에 user_id 포함"""
    # Given: user_id=1 기록이 DB에 존재
    client.post("/api/v1/high-scores", json={"user_id": 1, "score": 15000})

    # When: GET /api/v1/high-scores?user_id=1 요청
    response = client.get("/api/v1/high-scores?user_id=1")

    # Then: response.json()에 user_id 필드가 1
    data = response.json()
    assert data["user_id"] == 1


def test_get_high_score_returns_created_at(client, db_session):
    """응답 본문에 기록 생성 시각 포함"""
    # Given: user_id=1 기록이 DB에 존재
    client.post("/api/v1/high-scores", json={"user_id": 1, "score": 15000})

    # When: GET /api/v1/high-scores?user_id=1 요청
    response = client.get("/api/v1/high-scores?user_id=1")

    # Then: response.json()에 created_at 필드가 존재하고 datetime 형식
    data = response.json()
    assert "created_at" in data
    assert isinstance(data["created_at"], str)  # ISO 8601 문자열


def test_get_high_score_returns_updated_at(client, db_session):
    """응답 본문에 기록 갱신 시각 포함"""
    # Given: user_id=1 기록이 DB에 존재
    client.post("/api/v1/high-scores", json={"user_id": 1, "score": 15000})

    # When: GET /api/v1/high-scores?user_id=1 요청
    response = client.get("/api/v1/high-scores?user_id=1")

    # Then: response.json()에 updated_at 필드가 존재하고 datetime 형식
    data = response.json()
    assert "updated_at" in data
    assert isinstance(data["updated_at"], str)  # ISO 8601 문자열


def test_get_high_score_returns_id(client, db_session):
    """응답 본문에 고유 ID 포함"""
    # Given: user_id=1 기록이 DB에 존재
    client.post("/api/v1/high-scores", json={"user_id": 1, "score": 15000})

    # When: GET /api/v1/high-scores?user_id=1 요청
    response = client.get("/api/v1/high-scores?user_id=1")

    # Then: response.json()에 id 필드가 존재하고 양의 정수
    data = response.json()
    assert "id" in data
    assert isinstance(data["id"], int)
    assert data["id"] > 0


def test_get_high_score_returns_404_for_nonexistent_user(client, db_session):
    """존재하지 않는 사용자 조회 시 404 반환"""
    # Given: user_id=9999 기록이 DB에 없음

    # When: GET /api/v1/high-scores?user_id=9999 요청
    response = client.get("/api/v1/high-scores?user_id=9999")

    # Then: 404 Not Found 응답
    assert response.status_code == 404


def test_get_high_score_returns_error_message_for_nonexistent_user(client, db_session):
    """404 응답에 명확한 에러 메시지 포함"""
    # Given: user_id=9999 기록이 DB에 없음

    # When: GET /api/v1/high-scores?user_id=9999 요청
    response = client.get("/api/v1/high-scores?user_id=9999")

    # Then: response.json()['detail']에 "High score not found" 메시지
    data = response.json()
    assert "detail" in data
    assert "not found" in data["detail"].lower()


def test_get_high_score_returns_422_for_missing_user_id(client, db_session):
    """user_id 파라미터 누락 시 422 반환"""
    # Given: 파라미터 없음

    # When: GET /api/v1/high-scores 요청 (쿼리 파라미터 없음)
    response = client.get("/api/v1/high-scores")

    # Then: 422 Unprocessable Entity 응답
    assert response.status_code == 422


def test_get_high_score_returns_422_for_invalid_user_id_type(client, db_session):
    """user_id가 정수가 아닐 때 422 반환"""
    # Given: user_id="abc" (문자열)

    # When: GET /api/v1/high-scores?user_id=abc 요청
    response = client.get("/api/v1/high-scores?user_id=abc")

    # Then: 422 Unprocessable Entity 응답
    assert response.status_code == 422


def test_get_high_score_returns_zero_score(client, db_session):
    """점수가 0인 경우도 정상 반환"""
    # Given: user_id=2, score=0 기록이 DB에 존재
    client.post("/api/v1/high-scores", json={"user_id": 2, "score": 0})

    # When: GET /api/v1/high-scores?user_id=2 요청
    response = client.get("/api/v1/high-scores?user_id=2")

    # Then: response.json()['score']가 0
    data = response.json()
    assert data["score"] == 0


def test_get_high_score_returns_negative_user_id_422(client, db_session):
    """음수 user_id는 422 반환"""
    # Given: user_id=-1

    # When: GET /api/v1/high-scores?user_id=-1 요청
    response = client.get("/api/v1/high-scores?user_id=-1")

    # Then: 422 Unprocessable Entity 응답
    assert response.status_code == 422


# ===== Foreign Key 제약조건 테스트 =====

def test_create_high_score_with_valid_user_id_succeeds(client, db_session, sample_users):
    """존재하는 user_id로 HighScore 생성 시 성공"""
    # Given: sample_users fixture로 user1, user2가 DB에 존재 (id=1, id=2)
    user1 = sample_users[0]

    # When: 존재하는 user_id로 HighScore 생성
    response = client.post(
        "/api/v1/high-scores",
        json={"user_id": user1.id, "score": 5000}
    )

    # Then: 201 Created 응답
    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == user1.id
    assert data["score"] == 5000


def test_create_high_score_with_nonexistent_user_id_fails(client, db_session):
    """존재하지 않는 user_id로 HighScore 생성 시 실패 (FK 제약조건)"""
    # Given: user_id=99999가 users 테이블에 존재하지 않음
    nonexistent_user_id = 99999

    # When: 존재하지 않는 user_id로 HighScore 생성 시도
    response = client.post(
        "/api/v1/high-scores",
        json={"user_id": nonexistent_user_id, "score": 1000}
    )

    # Then: 400 Bad Request 또는 422 Unprocessable Entity 응답
    # (FK 제약조건 위반으로 인한 실패)
    assert response.status_code in [400, 422, 500]
    data = response.json()
    assert "detail" in data

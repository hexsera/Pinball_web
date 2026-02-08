"""친구 요청 API 테스트

TDD RED 단계: 실패하는 테스트를 먼저 작성
"""

import pytest


class TestFriendRequestValidation:
    """친구 요청 검증 로직 테스트"""

    def test_cannot_send_friend_request_to_yourself(self, client, sample_users):
        """자기 자신에게 친구 요청을 보낼 수 없다"""
        user1 = sample_users[0]

        response = client.post("/api/friend-requests", json={
            "requester_id": user1.id,
            "receiver_id": user1.id
        })

        assert response.status_code == 400
        assert response.json()["detail"] == "Cannot send friend request to yourself"

    def test_cannot_send_duplicate_friend_request(self, client, sample_users, db_session):
        """이미 보낸 친구 요청은 중복 전송할 수 없다"""
        from models import Friendship

        user1, user2 = sample_users[0], sample_users[1]

        # 첫 번째 요청 생성
        friendship = Friendship(
            requester_id=user1.id,
            receiver_id=user2.id,
            status="pending"
        )
        db_session.add(friendship)
        db_session.commit()

        # 두 번째 요청 시도 (중복)
        response = client.post("/api/friend-requests", json={
            "requester_id": user1.id,
            "receiver_id": user2.id
        })

        assert response.status_code == 400
        assert response.json()["detail"] == "Friend request already sent"

    def test_cannot_send_reverse_friend_request_when_pending(self, client, sample_users, db_session):
        """상대방이 이미 보낸 친구 요청(pending)이 있으면 역방향 요청 불가"""
        from models import Friendship

        user1, user2 = sample_users[0], sample_users[1]

        # User 1 → User 2 요청 생성
        friendship = Friendship(
            requester_id=user1.id,
            receiver_id=user2.id,
            status="pending"
        )
        db_session.add(friendship)
        db_session.commit()

        # User 2 → User 1 요청 시도 (역방향)
        response = client.post("/api/friend-requests", json={
            "requester_id": user2.id,
            "receiver_id": user1.id
        })

        assert response.status_code == 400
        assert "already sent you a friend request" in response.json()["detail"]

    def test_cannot_send_reverse_friend_request_when_accepted(self, client, sample_users, db_session):
        """이미 친구인 경우 역방향 요청 불가"""
        from models import Friendship

        user1, user2 = sample_users[0], sample_users[1]

        # User 1 → User 2 요청이 수락됨
        friendship = Friendship(
            requester_id=user1.id,
            receiver_id=user2.id,
            status="accepted"
        )
        db_session.add(friendship)
        db_session.commit()

        # User 2 → User 1 요청 시도 (역방향)
        response = client.post("/api/friend-requests", json={
            "requester_id": user2.id,
            "receiver_id": user1.id
        })

        assert response.status_code == 400
        assert response.json()["detail"] == "Already friends"

    def test_cannot_send_reverse_friend_request_when_rejected(self, client, sample_users, db_session):
        """거절된 요청이 있을 때 역방향 요청 불가"""
        from models import Friendship

        user1, user2 = sample_users[0], sample_users[1]

        # User 1 → User 2 요청이 거절됨
        friendship = Friendship(
            requester_id=user1.id,
            receiver_id=user2.id,
            status="rejected"
        )
        db_session.add(friendship)
        db_session.commit()

        # User 2 → User 1 요청 시도 (역방향)
        response = client.post("/api/friend-requests", json={
            "requester_id": user2.id,
            "receiver_id": user1.id
        })

        assert response.status_code == 400
        assert "Previous request was rejected" in response.json()["detail"]

    def test_requester_id_must_exist(self, client, sample_users):
        """존재하지 않는 requester_id로 요청 불가 (FK 제약조건)"""
        user1 = sample_users[0]
        non_existent_user_id = 999

        response = client.post("/api/friend-requests", json={
            "requester_id": non_existent_user_id,
            "receiver_id": user1.id
        })

        assert response.status_code == 404
        assert "Requester user not found" in response.json()["detail"]

    def test_receiver_id_must_exist(self, client, sample_users):
        """존재하지 않는 receiver_id로 요청 불가 (FK 제약조건)"""
        user1 = sample_users[0]
        non_existent_user_id = 999

        response = client.post("/api/friend-requests", json={
            "requester_id": user1.id,
            "receiver_id": non_existent_user_id
        })

        assert response.status_code == 404
        assert "Receiver user not found" in response.json()["detail"]

    def test_create_friend_request_successfully(self, client, sample_users):
        """정상적인 친구 요청 생성"""
        user1, user2 = sample_users[0], sample_users[1]

        response = client.post("/api/friend-requests", json={
            "requester_id": user1.id,
            "receiver_id": user2.id
        })

        assert response.status_code == 200
        assert response.json()["message"] == "Friend request sent successfully"
        assert response.json()["requester_id"] == user1.id
        assert response.json()["receiver_id"] == user2.id

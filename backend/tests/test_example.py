"""
TDD 방식으로 신규 API 개발 시 참고할 수 있는 예시 테스트 파일

TDD 개발 순서:
1. 테스트 작성 (실패하는 테스트)
2. 최소한의 코드로 테스트 통과
3. 리팩토링

예시: 새로운 /api/items 엔드포인트를 TDD로 개발한다면
"""

def test_health_check(client):
    """GET /api/ 헬스 체크 테스트 (테스트 환경 검증용)"""
    response = client.get("/api/")
    assert response.status_code == 200


# 신규 API 개발 시 아래와 같은 방식으로 테스트 작성
# 1단계: 실패하는 테스트 작성
# def test_create_item(client):
#     """POST /api/items 아이템 생성 테스트"""
#     response = client.post("/api/items", json={
#         "name": "Test Item",
#         "price": 1000
#     })
#     assert response.status_code == 201
#     assert response.json()["name"] == "Test Item"
#
# 2단계: main.py에 최소한의 코드로 엔드포인트 구현
# 3단계: 테스트 통과 확인
# 4단계: 코드 리팩토링 (필요시)

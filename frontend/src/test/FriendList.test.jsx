import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FriendPage from '../pages/FriendPage';
import axios from 'axios';

// axios mock
vi.mock('axios');

// Mock 데이터
const MOCK_ACCEPTED_FRIENDS = {
  requests: [
    { id: 3, requester_id: 1, requester_nickname: '나', receiver_id: 2, receiver_nickname: '테스트유저2', status: 'accepted' },
    { id: 4, requester_id: 4, requester_nickname: '김철수', receiver_id: 1, receiver_nickname: '나', status: 'accepted' },
  ]
};


describe('현재 친구 목록 렌더링', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));

    axios.get.mockImplementation((_url, config) => {
      if (config?.params?.friend_status === 'accepted') {
        return Promise.resolve({ data: MOCK_ACCEPTED_FRIENDS });
      }
      if (config?.params?.friend_status === 'pending') {
        return Promise.resolve({ data: { requests: [] } });
      }
      return Promise.resolve({ data: { requests: [] } });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('오른쪽 영역에 "현재 친구" 제목이 표시된다', async () => {
    render(<FriendPage />);
    await waitFor(() => {
      expect(screen.getByText('현재 친구')).toBeInTheDocument();
    });
  });

  it('현재 친구 목록 영역이 오른쪽(friend-right-area) 안에 존재한다', async () => {
    render(<FriendPage />);
    const rightArea = screen.getByTestId('friend-right-area');

    await waitFor(() => {
      const friendListSection = rightArea.querySelector('[data-testid="friend-list-section"]');
      expect(friendListSection).toBeInTheDocument();
    });
  });
});

describe('현재 친구 목록 API 호출', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));

    axios.get.mockImplementation((_url, config) => {
      if (config?.params?.friend_status === 'accepted') {
        return Promise.resolve({ data: MOCK_ACCEPTED_FRIENDS });
      }
      if (config?.params?.friend_status === 'pending') {
        return Promise.resolve({ data: { requests: [] } });
      }
      return Promise.resolve({ data: { requests: [] } });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('페이지 접속 시 GET /api/friend-requests?user_id=1&friend_status=accepted 를 호출한다', async () => {
    render(<FriendPage />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/friend-requests', {
        params: { user_id: 1, friend_status: 'accepted' }
      });
    });
  });

  it('API 응답의 친구 목록이 화면에 표시된다', async () => {
    render(<FriendPage />);

    await waitFor(() => {
      // receiver_id 2, requester_id 4가 표시되는지 확인
      const rightArea = screen.getByTestId('friend-right-area');
      expect(rightArea.textContent).toMatch(/2|4|테스트유저2|김철수/);
    });
  });

  it('내가 requester인 경우 receiver의 닉네임이 표시된다', async () => {
    axios.get.mockImplementation((_url, config) => {
      if (config?.params?.friend_status === 'accepted') {
        return Promise.resolve({
          data: { requests: [{ id: 3, requester_id: 1, requester_nickname: '나', receiver_id: 2, receiver_nickname: '테스트유저2', status: 'accepted' }] }
        });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);

    await waitFor(() => {
      const rightArea = screen.getByTestId('friend-right-area');
      expect(rightArea.textContent).toContain('테스트유저2');
    });
  });

  it('내가 receiver인 경우 requester의 닉네임이 표시된다', async () => {
    axios.get.mockImplementation((_url, config) => {
      if (config?.params?.friend_status === 'accepted') {
        return Promise.resolve({
          data: { requests: [{ id: 4, requester_id: 4, requester_nickname: '김철수', receiver_id: 1, receiver_nickname: '나', status: 'accepted' }] }
        });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);

    await waitFor(() => {
      const rightArea = screen.getByTestId('friend-right-area');
      expect(rightArea.textContent).toContain('김철수');
    });
  });

  it('친구가 0명이면 "친구가 없습니다" 메시지가 표시된다', async () => {
    axios.get.mockImplementation((_url, config) => {
      if (config?.params?.friend_status === 'accepted') {
        return Promise.resolve({ data: { requests: [] } });
      }
      if (config?.params?.friend_status === 'pending') {
        return Promise.resolve({ data: { requests: [] } });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);

    await waitFor(() => {
      expect(screen.getByText('친구가 없습니다')).toBeInTheDocument();
    });
  });
});

describe('친구 목록 표시 정보', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));

    axios.get.mockImplementation((_url, config) => {
      if (config?.params?.friend_status === 'accepted') {
        return Promise.resolve({ data: MOCK_ACCEPTED_FRIENDS });
      }
      if (config?.params?.friend_status === 'pending') {
        return Promise.resolve({ data: { requests: [] } });
      }
      return Promise.resolve({ data: { requests: [] } });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('각 친구 항목에 사용자 ID가 표시된다', async () => {
    render(<FriendPage />);

    await waitFor(() => {
      const rightArea = screen.getByTestId('friend-right-area');
      // requester_id: 1 -> receiver_id: 2 (상대방 ID: 2)
      // requester_id: 4 -> receiver_id: 1 (상대방 ID: 4)
      expect(rightArea.textContent).toMatch(/2|4/);
    });
  });
});

// ─── PRD: 현재 친구 월간 최고점수 표시 ───────────────────────────

describe('현재 친구 목록 - 월간 최고점수 표시', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, nickname: '나' }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('친구 목록 로드 시 각 친구의 GET /api/v1/monthly-scores/{user_id}를 호출한다', async () => {
    // 친구 2명: receiver_id=2(내가 요청자), requester_id=4(상대가 요청자)
    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'accepted') {
        return Promise.resolve({ data: MOCK_ACCEPTED_FRIENDS });
      }
      if (url === '/api/v1/monthly-scores/2' || url === '/api/v1/monthly-scores/4') {
        return Promise.resolve({ data: { nickname: '친구', score: 1000, created_at: '2026-02-01T00:00:00' } });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/monthly-scores/2');
      expect(axios.get).toHaveBeenCalledWith('/api/v1/monthly-scores/4');
    });
  });

  it('친구의 월간 점수가 있으면 점수가 표시된다', async () => {
    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'accepted') {
        return Promise.resolve({
          data: {
            requests: [
              { id: 3, requester_id: 1, requester_nickname: '나', receiver_id: 2, receiver_nickname: '테스트유저2', status: 'accepted' }
            ]
          }
        });
      }
      if (url === '/api/v1/monthly-scores/2') {
        return Promise.resolve({ data: { nickname: '테스트유저2', score: 9999, created_at: '2026-02-01T00:00:00' } });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);

    await waitFor(() => {
      expect(screen.getByText('최고점수:9999')).toBeInTheDocument();
    });
  });

  it('친구의 월간 점수가 없으면 "-"가 표시된다', async () => {
    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'accepted') {
        return Promise.resolve({
          data: {
            requests: [
              { id: 3, requester_id: 1, requester_nickname: '나', receiver_id: 2, receiver_nickname: '테스트유저2', status: 'accepted' }
            ]
          }
        });
      }
      if (url === '/api/v1/monthly-scores/2') {
        return Promise.reject({ response: { status: 404 } });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);

    await waitFor(() => {
      const listSection = screen.getByTestId('friend-list-section');
      expect(listSection.textContent).toContain('-');
    });
  });
});

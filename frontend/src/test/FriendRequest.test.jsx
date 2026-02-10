import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import FriendPage from '../pages/FriendPage';
import axios from 'axios';

// axios mock
vi.mock('axios');

// Mock 데이터
const MOCK_PENDING_REQUESTS = {
  requests: [
    { id: 1, requester_id: 3, receiver_id: 1, status: 'pending' },
    { id: 2, requester_id: 5, receiver_id: 1, status: 'pending' },
  ]
};

const MOCK_USERS = {
  3: { id: 3, email: 'user3@test.com', nickname: '홍길동', birth_date: '2000-01-03', role: 'user' },
  5: { id: 5, email: 'user5@test.com', nickname: '박영희', birth_date: '2000-01-05', role: 'user' },
};

describe('친구 요청란 렌더링', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));

    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'pending') {
        return Promise.resolve({ data: MOCK_PENDING_REQUESTS });
      }
      return Promise.resolve({ data: { requests: [] } });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('오른쪽 영역에 "친구 요청" 제목이 표시된다', async () => {
    render(<FriendPage />);
    await waitFor(() => {
      expect(screen.getByText('친구 요청')).toBeInTheDocument();
    });
  });

  it('친구 요청란 영역이 오른쪽(friend-right-area) 안에 존재한다', async () => {
    render(<FriendPage />);
    const rightArea = screen.getByTestId('friend-right-area');

    await waitFor(() => {
      const friendRequestSection = rightArea.querySelector('[data-testid="friend-request-section"]');
      expect(friendRequestSection).toBeInTheDocument();
    });
  });
});

describe('친구 요청 API 호출', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));

    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'pending') {
        return Promise.resolve({ data: MOCK_PENDING_REQUESTS });
      }
      if (config?.params?.friend_status === 'accepted') {
        return Promise.resolve({ data: { requests: [] } });
      }
      return Promise.resolve({ data: { requests: [] } });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('페이지 접속 시 GET /api/friend-requests?user_id=1&friend_status=pending 를 호출한다', async () => {
    render(<FriendPage />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/friend-requests', {
        params: { user_id: 1, friend_status: 'pending' }
      });
    });
  });

  it('API 응답으로 받은 친구 요청 목록이 화면에 표시된다', async () => {
    render(<FriendPage />);

    await waitFor(() => {
      // 요청 ID 1, 2가 표시되는지 확인
      const rightArea = screen.getByTestId('friend-right-area');
      expect(rightArea.textContent).toMatch(/요청 ID: 1|요청 ID: 2/);
    });
  });

  it('친구 요청이 0건이면 "받은 친구 요청이 없습니다" 메시지가 표시된다', async () => {
    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'pending') {
        return Promise.resolve({ data: { requests: [] } });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);

    await waitFor(() => {
      expect(screen.getByText('받은 친구 요청이 없습니다')).toBeInTheDocument();
    });
  });
});

describe('친구 승인 버튼', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));

    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'pending') {
        return Promise.resolve({ data: MOCK_PENDING_REQUESTS });
      }
      if (config?.params?.friend_status === 'accepted') {
        return Promise.resolve({ data: { requests: [] } });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    axios.post.mockResolvedValue({
      data: { message: 'Friend request accepted', status: 'accepted' }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('각 친구 요청 항목마다 "친구 승인" 버튼이 존재한다', async () => {
    render(<FriendPage />);

    await waitFor(() => {
      const approveButtons = screen.getAllByRole('button', { name: '친구 승인' });
      expect(approveButtons.length).toBe(2);
    });
  });

  it('"친구 승인" 버튼 클릭 시 POST /api/friend-requests/accept 를 호출한다', async () => {
    const user = userEvent.setup();
    render(<FriendPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '친구 승인' }).length).toBeGreaterThan(0);
    });

    const approveButtons = screen.getAllByRole('button', { name: '친구 승인' });
    await user.click(approveButtons[0]);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/friend-requests/accept', {
        requester_id: 3,
        receiver_id: 1
      });
    });
  });

  it('친구 승인 성공 후 해당 요청이 목록에서 사라진다', async () => {
    const user = userEvent.setup();

    // 첫 호출: pending 2건, 승인 후 호출: pending 1건
    let callCount = 0;
    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'pending') {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: MOCK_PENDING_REQUESTS });
        } else {
          // 승인 후 requester_id 3 제거
          return Promise.resolve({
            data: { requests: [{ id: 2, requester_id: 5, receiver_id: 1, status: 'pending' }] }
          });
        }
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '친구 승인' }).length).toBe(2);
    });

    const approveButtons = screen.getAllByRole('button', { name: '친구 승인' });
    await user.click(approveButtons[0]);

    // 승인 후 목록에서 제거되어 버튼이 1개만 남음
    await waitFor(() => {
      const remainingButtons = screen.getAllByRole('button', { name: '친구 승인' });
      expect(remainingButtons.length).toBe(1);
    });
  });

  it('친구 승인 실패 시 에러 메시지가 표시된다', async () => {
    const user = userEvent.setup();

    axios.post.mockRejectedValue({
      response: { status: 404, data: { detail: 'Friend request not found' } }
    });

    render(<FriendPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '친구 승인' }).length).toBeGreaterThan(0);
    });

    const approveButtons = screen.getAllByRole('button', { name: '친구 승인' });
    await user.click(approveButtons[0]);

    await waitFor(() => {
      // 에러 메시지가 화면에 표시되는지 확인
      expect(screen.getByText(/에러|실패|오류|Friend request not found/i)).toBeInTheDocument();
    });
  });
});

describe('친구 거절 버튼', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));

    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'pending') {
        return Promise.resolve({ data: MOCK_PENDING_REQUESTS });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    axios.post.mockResolvedValue({
      data: { message: 'Friend request rejected', status: 'rejected' }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('각 친구 요청 항목마다 "거절" 버튼이 존재한다', async () => {
    render(<FriendPage />);

    await waitFor(() => {
      const rejectButtons = screen.getAllByRole('button', { name: '거절' });
      expect(rejectButtons.length).toBe(2);
    });
  });

  it('"거절" 버튼 클릭 시 POST /api/friend-requests/reject 를 호출한다', async () => {
    const user = userEvent.setup();
    render(<FriendPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '거절' }).length).toBeGreaterThan(0);
    });

    const rejectButtons = screen.getAllByRole('button', { name: '거절' });
    await user.click(rejectButtons[0]);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/friend-requests/reject', {
        requester_id: 3,
        receiver_id: 1
      });
    });
  });

  it('거절 성공 후 해당 요청이 목록에서 사라진다', async () => {
    const user = userEvent.setup();

    let callCount = 0;
    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'pending') {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: MOCK_PENDING_REQUESTS });
        } else {
          return Promise.resolve({
            data: { requests: [{ id: 2, requester_id: 5, receiver_id: 1, status: 'pending' }] }
          });
        }
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '거절' }).length).toBe(2);
    });

    const rejectButtons = screen.getAllByRole('button', { name: '거절' });
    await user.click(rejectButtons[0]);

    await waitFor(() => {
      const remainingButtons = screen.getAllByRole('button', { name: '거절' });
      expect(remainingButtons.length).toBe(1);
    });
  });
});

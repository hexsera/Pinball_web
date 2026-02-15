import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import FriendPage from '../pages/FriendPage';

vi.mock('axios');

const mockCurrentUser = { id: 1, nickname: '나', email: 'me@test.com' };

beforeEach(() => {
  localStorage.setItem('user', JSON.stringify(mockCurrentUser));
  // 마운트 시 호출되는 친구 목록/요청 API 기본 응답
  axios.get.mockImplementation((url) => {
    if (url === '/api/friend-requests') {
      return Promise.resolve({ data: { requests: [] } });
    }
    return Promise.resolve({ data: [] });
  });
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ─── 검색 API 연결 ────────────────────────────────────────────

describe('닉네임 검색 API 연결', () => {
  it('닉네임 검색 시 GET /api/v1/users API를 호출한다', async () => {
    const user = userEvent.setup();
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/users') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);

    const searchInput = screen.getByPlaceholderText('닉네임을 입력하세요');
    await user.type(searchInput, '홍길동');
    await user.click(screen.getByRole('button', { name: '검색' }));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        '/api/v1/users',
        expect.objectContaining({ params: expect.objectContaining({ nickname: '홍길동' }) })
      );
    });
  });

  it('API 응답의 사용자 목록이 검색 결과로 표시된다', async () => {
    const user = userEvent.setup();
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/users') {
        return Promise.resolve({
          data: [
            { id: 10, nickname: '홍길동', email: 'hong@test.com', role: 'user' }
          ]
        });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);
    await user.type(screen.getByPlaceholderText('닉네임을 입력하세요'), '홍');
    await user.click(screen.getByRole('button', { name: '검색' }));

    expect(await screen.findByText('홍길동')).toBeInTheDocument();
  });

  it('API 호출 실패 시 에러 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/users') {
        return Promise.reject(new Error('Network Error'));
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);
    await user.type(screen.getByPlaceholderText('닉네임을 입력하세요'), '홍');
    await user.click(screen.getByRole('button', { name: '검색' }));

    expect(await screen.findByText(/검색에 실패했습니다/)).toBeInTheDocument();
  });

  it('검색 결과가 빈 배열이면 안내 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/users') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);
    await user.type(screen.getByPlaceholderText('닉네임을 입력하세요'), 'zzz없는닉네임');
    await user.click(screen.getByRole('button', { name: '검색' }));

    expect(await screen.findByText('검색 결과가 없습니다')).toBeInTheDocument();
  });
});

// ─── 친구추가 API 연결 ────────────────────────────────────────

describe('친구추가 API 연결', () => {
  it('"친구추가" 버튼 클릭 시 POST /api/friend-requests를 호출한다', async () => {
    const user = userEvent.setup();
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/users') {
        return Promise.resolve({
          data: [{ id: 10, nickname: '홍길동', email: 'hong@test.com', role: 'user' }]
        });
      }
      return Promise.resolve({ data: { requests: [] } });
    });
    axios.post.mockResolvedValue({ data: { message: 'Friend request sent successfully' } });

    render(<FriendPage />);
    await user.type(screen.getByPlaceholderText('닉네임을 입력하세요'), '홍');
    await user.click(screen.getByRole('button', { name: '검색' }));

    const addButton = await screen.findByRole('button', { name: '친구추가' });
    await user.click(addButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/friend-requests',
        expect.objectContaining({ requester_id: 1, receiver_id: 10 })
      );
    });
  });

  it('친구추가 API 호출 실패 시 에러를 표시한다', async () => {
    const user = userEvent.setup();
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/users') {
        return Promise.resolve({
          data: [{ id: 10, nickname: '홍길동', email: 'hong@test.com', role: 'user' }]
        });
      }
      return Promise.resolve({ data: { requests: [] } });
    });
    axios.post.mockRejectedValue({
      response: { data: { detail: 'Friend request already sent' } }
    });

    render(<FriendPage />);
    await user.type(screen.getByPlaceholderText('닉네임을 입력하세요'), '홍');
    await user.click(screen.getByRole('button', { name: '검색' }));

    const addButton = await screen.findByRole('button', { name: '친구추가' });
    await user.click(addButton);

    expect(await screen.findByText(/Friend request already sent/)).toBeInTheDocument();
  });
});

// ─── 버튼 상태 제어 ───────────────────────────────────────────

describe('친구추가 버튼 상태 제어', () => {
  it('현재 친구인 유저의 친구추가 버튼은 "요청됨"으로 표시된다', async () => {
    const user = userEvent.setup();
    // 검색 결과: id=10 유저
    axios.get.mockImplementation((url, config) => {
      if (url === '/api/v1/users') {
        return Promise.resolve({
          data: [{ id: 10, nickname: '홍길동', email: 'hong@test.com', role: 'user' }]
        });
      }
      if (url === '/api/friend-requests') {
        const status = config?.params?.friend_status;
        if (status === 'accepted') {
          // 나(1)와 홍길동(10)이 이미 친구
          return Promise.resolve({
            data: { requests: [{ id: 99, requester_id: 1, receiver_id: 10, status: 'accepted' }] }
          });
        }
        return Promise.resolve({ data: { requests: [] } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<FriendPage />);
    await user.type(screen.getByPlaceholderText('닉네임을 입력하세요'), '홍');
    await user.click(screen.getByRole('button', { name: '검색' }));

    expect(await screen.findByRole('button', { name: '요청됨' })).toBeInTheDocument();
  });

  it('pending 요청을 보낸 유저의 친구추가 버튼은 "요청됨"으로 표시된다', async () => {
    const user = userEvent.setup();
    axios.get.mockImplementation((url, config) => {
      if (url === '/api/v1/users') {
        return Promise.resolve({
          data: [{ id: 10, nickname: '홍길동', email: 'hong@test.com', role: 'user' }]
        });
      }
      if (url === '/api/friend-requests') {
        const status = config?.params?.friend_status;
        if (status === 'pending') {
          // 내가 홍길동에게 pending 요청을 보낸 상태
          return Promise.resolve({
            data: { requests: [{ id: 99, requester_id: 1, receiver_id: 10, status: 'pending' }] }
          });
        }
        return Promise.resolve({ data: { requests: [] } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<FriendPage />);
    await user.type(screen.getByPlaceholderText('닉네임을 입력하세요'), '홍');
    await user.click(screen.getByRole('button', { name: '검색' }));

    expect(await screen.findByRole('button', { name: '요청됨' })).toBeInTheDocument();
  });

  it('"요청됨" 버튼은 비활성화(disabled) 상태이다', async () => {
    const user = userEvent.setup();
    axios.get.mockImplementation((url, config) => {
      if (url === '/api/v1/users') {
        return Promise.resolve({
          data: [{ id: 10, nickname: '홍길동', email: 'hong@test.com', role: 'user' }]
        });
      }
      if (url === '/api/friend-requests') {
        const status = config?.params?.friend_status;
        if (status === 'accepted') {
          return Promise.resolve({
            data: { requests: [{ id: 99, requester_id: 1, receiver_id: 10, status: 'accepted' }] }
          });
        }
        return Promise.resolve({ data: { requests: [] } });
      }
      return Promise.resolve({ data: [] });
    });

    render(<FriendPage />);
    await user.type(screen.getByPlaceholderText('닉네임을 입력하세요'), '홍');
    await user.click(screen.getByRole('button', { name: '검색' }));

    const disabledButton = await screen.findByRole('button', { name: '요청됨' });
    expect(disabledButton).toBeDisabled();
  });

  it('아직 친구가 아닌 유저의 친구추가 버튼은 활성화되어 있다', async () => {
    const user = userEvent.setup();
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/users') {
        return Promise.resolve({
          data: [{ id: 10, nickname: '홍길동', email: 'hong@test.com', role: 'user' }]
        });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);
    await user.type(screen.getByPlaceholderText('닉네임을 입력하세요'), '홍');
    await user.click(screen.getByRole('button', { name: '검색' }));

    const addButton = await screen.findByRole('button', { name: '친구추가' });
    expect(addButton).not.toBeDisabled();
  });
});

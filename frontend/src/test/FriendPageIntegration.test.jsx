import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import FriendPage from '../FriendPage';
import axios from 'axios';

// axios mock
vi.mock('axios');

// Mock 데이터
const MOCK_PENDING_REQUESTS = {
  requests: [
    { id: 1, requester_id: 3, receiver_id: 1, status: 'pending' },
  ]
};

const MOCK_ACCEPTED_FRIENDS = {
  requests: [
    { id: 2, requester_id: 1, receiver_id: 2, status: 'accepted' },
  ]
};

const MOCK_ACCEPTED_FRIENDS_AFTER_APPROVE = {
  requests: [
    { id: 2, requester_id: 1, receiver_id: 2, status: 'accepted' },
    { id: 1, requester_id: 3, receiver_id: 1, status: 'accepted' },
  ]
};

describe('FriendPage 통합 - 친구 요청 + 친구 목록', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));

    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'pending') {
        return Promise.resolve({ data: MOCK_PENDING_REQUESTS });
      }
      if (config?.params?.friend_status === 'accepted') {
        return Promise.resolve({ data: MOCK_ACCEPTED_FRIENDS });
      }
      return Promise.resolve({ data: { requests: [] } });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('페이지 접속 시 친구 요청과 친구 목록이 동시에 표시된다', async () => {
    render(<FriendPage />);

    await waitFor(() => {
      // "친구 요청" 섹션 존재 확인
      expect(screen.getByText('친구 요청')).toBeInTheDocument();

      // "현재 친구" 섹션 존재 확인
      expect(screen.getByText('현재 친구')).toBeInTheDocument();
    });
  });

  it('친구 승인 후 해당 사용자가 친구 목록에 추가된다', async () => {
    const user = userEvent.setup();

    let pendingCallCount = 0;
    let acceptedCallCount = 0;

    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'pending') {
        pendingCallCount++;
        if (pendingCallCount === 1) {
          return Promise.resolve({ data: MOCK_PENDING_REQUESTS });
        } else {
          // 승인 후 pending 목록에서 제거
          return Promise.resolve({ data: { requests: [] } });
        }
      }
      if (config?.params?.friend_status === 'accepted') {
        acceptedCallCount++;
        if (acceptedCallCount === 1) {
          return Promise.resolve({ data: MOCK_ACCEPTED_FRIENDS });
        } else {
          // 승인 후 accepted 목록에 추가
          return Promise.resolve({ data: MOCK_ACCEPTED_FRIENDS_AFTER_APPROVE });
        }
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    axios.post.mockResolvedValue({
      data: { message: 'Friend request accepted', status: 'accepted' }
    });

    render(<FriendPage />);

    // 초기 친구 목록 1명 확인
    await waitFor(() => {
      const rightArea = screen.getByTestId('friend-right-area');
      expect(rightArea.textContent).toMatch(/1/); // 1명
    });

    // 친구 승인 버튼 클릭
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '친구 승인' })).toBeInTheDocument();
    });

    const approveButton = screen.getByRole('button', { name: '친구 승인' });
    await user.click(approveButton);

    // 승인 후 친구 목록에 추가 (2명)
    await waitFor(() => {
      const rightArea = screen.getByTestId('friend-right-area');
      expect(rightArea.textContent).toMatch(/2/); // 2명
    });
  });

  it('왼쪽 영역(검색)과 오른쪽 영역(요청+목록)이 분리되어 렌더링된다', async () => {
    render(<FriendPage />);

    const leftArea = screen.getByTestId('friend-left-area');
    const rightArea = screen.getByTestId('friend-right-area');

    // 왼쪽 영역에 검색 관련 요소 존재
    expect(leftArea.querySelector('input[placeholder="닉네임을 입력하세요"]')).toBeInTheDocument();

    // 오른쪽 영역에 친구 요청 + 친구 목록 관련 요소 존재
    await waitFor(() => {
      expect(rightArea.textContent).toMatch(/친구 요청|현재 친구/);
    });
  });
});

describe('로딩 및 에러 상태', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: '테스트유저' }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('API 호출 중 로딩 표시가 나타난다', async () => {
    // 지연된 Promise로 mock
    let resolvePending;
    let resolveAccepted;

    axios.get.mockImplementation((url, config) => {
      if (config?.params?.friend_status === 'pending') {
        return new Promise((resolve) => {
          resolvePending = resolve;
        });
      }
      if (config?.params?.friend_status === 'accepted') {
        return new Promise((resolve) => {
          resolveAccepted = resolve;
        });
      }
      return Promise.resolve({ data: { requests: [] } });
    });

    render(<FriendPage />);

    // 로딩 인디케이터가 표시되는지 확인 (CircularProgress 또는 "로딩 중..." 텍스트)
    await waitFor(() => {
      const loadingElement = screen.queryByText(/로딩|Loading/i) ||
                            document.querySelector('.MuiCircularProgress-root');
      expect(loadingElement).toBeInTheDocument();
    });

    // Promise resolve하여 로딩 종료
    resolvePending({ data: { requests: [] } });
    resolveAccepted({ data: { requests: [] } });
  });

  it('API 호출 실패 시 에러 메시지가 표시된다', async () => {
    axios.get.mockRejectedValue({
      response: { status: 500, data: { detail: 'Internal server error' } }
    });

    render(<FriendPage />);

    await waitFor(() => {
      // 에러 메시지가 화면에 표시되는지 확인
      expect(screen.getByText(/에러|실패|오류|error/i)).toBeInTheDocument();
    });
  });

  it('로그인하지 않은 상태에서는 API를 호출하지 않는다', () => {
    // localStorage에 user 미설정
    localStorage.clear();

    render(<FriendPage />);

    // axios.get이 호출되지 않았는지 확인
    expect(axios.get).not.toHaveBeenCalled();
  });
});

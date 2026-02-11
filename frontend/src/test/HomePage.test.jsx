import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import HomePage from '../pages/HomePage/HomePage';

vi.mock('axios');
vi.mock('../components/Aurora/Aurora', () => ({
  default: () => <div data-testid="aurora-mock" />,
}));

const MOCK_MONTHLY_SCORES = {
  scores: [
    { nickname: 'alpha', score: 1234500 },
    { nickname: 'ninja', score: 987300 },
    { nickname: 'hexfan', score: 765000 },
    { nickname: 'king', score: 543200 },
    { nickname: '홍길동', score: 321000 },
    { nickname: 'player6', score: 200000 },
    { nickname: 'player7', score: 150000 },
    { nickname: 'player8', score: 100000 },
    { nickname: 'player9', score: 50000 },
    { nickname: 'player10', score: 10000 },
    { nickname: 'player11', score: 5000 },
  ],
  total: 11,
};

describe('HomePage 랭킹 API 연동', () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: MOCK_MONTHLY_SCORES });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('페이지 접속 시 GET /api/v1/monthly-scores 를 호출한다', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/monthly-scores');
    });
  });

  it('API 응답의 닉네임이 랭킹 테이블에 표시된다', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
      expect(screen.getByText('ninja')).toBeInTheDocument();
    });
  });

  it('최대 10위까지만 표시된다', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('player10')).toBeInTheDocument();
      expect(screen.queryByText('player11')).not.toBeInTheDocument();
    });
  });

  it('API 호출 실패 시 에러 메시지를 표시한다', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'));

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('랭킹을 불러올 수 없습니다.')).toBeInTheDocument();
    });
  });
});

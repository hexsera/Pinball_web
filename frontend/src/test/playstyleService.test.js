import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendPlaystyleData, parsePlaystyleResponse, getRandomSkill } from '../pages/AIPinball/playstyleService';

vi.mock('axios');
import axios from 'axios';

describe('sendPlaystyleData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('axios를 올바른 URL로 POST 호출한다', async () => {
    const dataArray = [{ timestamp: '1s', ballX: 100 }];
    axios.post.mockResolvedValue({ data: { playstyle: 'attack' } });

    await sendPlaystyleData(dataArray);

    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/pinball_ai/playstyle',
      dataArray
    );
  });

  it('서버 응답 data를 반환한다', async () => {
    const dataArray = [];
    const mockData = { playstyle: 'defence' };
    axios.post.mockResolvedValue({ data: mockData });

    const result = await sendPlaystyleData(dataArray);

    expect(result).toEqual(mockData);
  });

  it('axios 실패 시 에러를 throw한다', async () => {
    const dataArray = [];
    const error = new Error('Network Error');
    axios.post.mockRejectedValue(error);

    await expect(sendPlaystyleData(dataArray)).rejects.toThrow('Network Error');
  });
});

describe('parsePlaystyleResponse', () => {
  it("'attack' 응답을 'small'로 변환한다", () => {
    const response = { playstyle: 'attack' };
    expect(parsePlaystyleResponse(response)).toBe('small');
  });

  it("'defence' 응답을 'big'으로 변환한다", () => {
    const response = { playstyle: 'defence' };
    expect(parsePlaystyleResponse(response)).toBe('big');
  });

  it('알 수 없는 값은 null을 반환한다', () => {
    const response = { playstyle: 'unknown' };
    expect(parsePlaystyleResponse(response)).toBeNull();
  });
});

describe('getRandomSkill', () => {
  it("반환값이 항상 'big' 또는 'small' 중 하나다", () => {
    const result = getRandomSkill();
    expect(['big', 'small']).toContain(result);
  });
});

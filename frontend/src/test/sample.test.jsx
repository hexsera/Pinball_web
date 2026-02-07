import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('TDD 구조 검증', () => {
  it('테스트 환경이 정상적으로 작동한다', () => {
    render(<div>테스트 성공</div>);
    expect(screen.getByText('테스트 성공')).toBeInTheDocument();
  });
});

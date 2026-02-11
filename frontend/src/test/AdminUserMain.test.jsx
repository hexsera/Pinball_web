import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// DataGrid CSS 문제 우회: @mui/x-data-grid 전체 mock
vi.mock('@mui/x-data-grid', () => ({
  DataGrid: ({ rows, columns }) => (
    <table data-testid="data-grid">
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((col) => (
              <td key={col.field}>
                {col.renderCell
                  ? col.renderCell({ row })
                  : row[col.field]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

// axios mock
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import axios from 'axios';
import AdminUserMain from '../pages/admin/AdminUserMain';

const mockUsers = [
  { id: 1, email: 'user1@test.com', nickname: '유저1', birth_date: '1990-01-01', role: 'user' },
  { id: 2, email: 'user2@test.com', nickname: '유저2', birth_date: '1995-05-15', role: 'admin' },
];

describe('AdminUserMain - 연필 아이콘 버튼', () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: mockUsers });
  });

  it('각 레코드마다 연필 아이콘 버튼이 렌더링된다', async () => {
    render(<AdminUserMain />);

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /수정/i });
      expect(editButtons).toHaveLength(mockUsers.length);
    });
  });

  it('연필 아이콘 버튼 클릭 시 Dialog가 열린다', async () => {
    const user = userEvent.setup();
    render(<AdminUserMain />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /수정/i })).toHaveLength(mockUsers.length);
    });

    const editButtons = screen.getAllByRole('button', { name: /수정/i });
    await user.click(editButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

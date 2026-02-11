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
    delete: vi.fn(),
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

describe('AdminUserMain - 수정 폼', () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: mockUsers });
  });

  async function openEditDialog() {
    const user = userEvent.setup();
    render(<AdminUserMain />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /수정/i })).toHaveLength(mockUsers.length);
    });
    const editButtons = screen.getAllByRole('button', { name: /수정/i });
    await user.click(editButtons[0]);
    return user;
  }

  it('Dialog 안에 닉네임 입력 필드가 렌더링된다', async () => {
    await openEditDialog();
    expect(screen.getByLabelText(/닉네임/i)).toBeInTheDocument();
  });

  it('Dialog 안에 생년월일 입력 필드가 렌더링된다', async () => {
    await openEditDialog();
    expect(screen.getByLabelText(/생년월일/i)).toBeInTheDocument();
  });

  it('Dialog 안에 비밀번호 입력 필드가 렌더링된다', async () => {
    await openEditDialog();
    expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument();
  });

  it('Dialog 안에 역할 선택 필드가 렌더링된다', async () => {
    await openEditDialog();
    expect(screen.getByLabelText(/역할/i)).toBeInTheDocument();
  });

  it('Dialog 안에 저장 버튼이 렌더링된다', async () => {
    await openEditDialog();
    expect(screen.getByRole('button', { name: /저장/i })).toBeInTheDocument();
  });

  it('취소 버튼 클릭 시 Dialog가 닫힌다', async () => {
    const user = await openEditDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /취소/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

describe('AdminUserMain - 수정 폼 자동 채움', () => {
  beforeEach(() => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/users') return Promise.resolve({ data: mockUsers });
      if (url === `/api/v1/users/${mockUsers[0].id}`) return Promise.resolve({ data: mockUsers[0] });
      if (url === `/api/v1/users/${mockUsers[1].id}`) return Promise.resolve({ data: mockUsers[1] });
      return Promise.resolve({ data: {} });
    });
  });

  async function openEditDialogForUser(userIndex = 0) {
    const user = userEvent.setup();
    render(<AdminUserMain />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /수정/i })).toHaveLength(mockUsers.length);
    });
    const editButtons = screen.getAllByRole('button', { name: /수정/i });
    await user.click(editButtons[userIndex]);
    return user;
  }

  it('Dialog를 열면 닉네임 필드에 선택한 유저의 닉네임이 채워진다', async () => {
    await openEditDialogForUser(0);
    const nicknameInput = screen.getByLabelText(/닉네임/i);
    expect(nicknameInput.value).toBe(mockUsers[0].nickname);
  });

  it('Dialog를 열면 생년월일 필드에 선택한 유저의 생년월일이 채워진다', async () => {
    await openEditDialogForUser(0);
    const birthDateInput = screen.getByLabelText(/생년월일/i);
    expect(birthDateInput.value).toBe(mockUsers[0].birth_date);
  });

  it('Dialog를 열면 역할 필드에 선택한 유저의 역할이 채워진다', async () => {
    await openEditDialogForUser(0);
    // MUI Select는 hidden input에 value를 저장
    const hiddenInput = document.querySelector('input[name="role"]') ||
      document.querySelector('.MuiSelect-nativeInput');
    if (hiddenInput) {
      expect(hiddenInput.value).toBe(mockUsers[0].role);
    } else {
      // MUI Select 표시 텍스트로 검증
      const dialog = screen.getByRole('dialog');
      expect(dialog.textContent).toContain(mockUsers[0].role);
    }
  });
});

describe('AdminUserMain - dialog 오픈 시 GET API 호출', () => {
  beforeEach(() => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/users') return Promise.resolve({ data: mockUsers });
      if (url === `/api/v1/users/${mockUsers[0].id}`) return Promise.resolve({ data: mockUsers[0] });
      return Promise.resolve({ data: {} });
    });
  });

  it('수정 버튼 클릭 시 GET /api/v1/users/{user_id}를 호출한다', async () => {
    const user = userEvent.setup();
    render(<AdminUserMain />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /수정/i })).toHaveLength(mockUsers.length);
    });

    const editButtons = screen.getAllByRole('button', { name: /수정/i });
    await user.click(editButtons[0]);

    expect(axios.get).toHaveBeenCalledWith(`/api/v1/users/${mockUsers[0].id}`);
  });
});

describe('AdminUserMain - 삭제 버튼', () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: mockUsers });
  });

  it('각 레코드마다 삭제 버튼이 렌더링된다', async () => {
    render(<AdminUserMain />);

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /삭제/i });
      expect(deleteButtons).toHaveLength(mockUsers.length);
    });
  });

  it('삭제 버튼 클릭 시 "정말로 삭제 합니까?" 확인 Dialog가 열린다', async () => {
    const user = userEvent.setup();
    render(<AdminUserMain />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /삭제/i })).toHaveLength(mockUsers.length);
    });

    const deleteButtons = screen.getAllByRole('button', { name: /삭제/i });
    await user.click(deleteButtons[0]);

    expect(screen.getByText(/정말로 삭제 합니까\?/i)).toBeInTheDocument();
  });
});

describe('AdminUserMain - 삭제 API 연동', () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: mockUsers });
    axios.delete.mockResolvedValue({});
  });

  async function openDeleteDialog() {
    const user = userEvent.setup();
    render(<AdminUserMain />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /삭제/i })).toHaveLength(mockUsers.length);
    });
    const deleteButtons = screen.getAllByRole('button', { name: /삭제/i });
    await user.click(deleteButtons[0]);
    return user;
  }

  it('삭제 확인 클릭 시 DELETE /api/v1/users/{user_id}를 호출한다', async () => {
    const user = await openDeleteDialog();

    await user.click(screen.getByRole('button', { name: /^삭제$/ }));

    expect(axios.delete).toHaveBeenCalledWith(
      `/api/v1/users/${mockUsers[0].id}`,
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  it('삭제 확인 후 DataGrid가 새로고침된다', async () => {
    const user = await openDeleteDialog();

    const callCountBefore = axios.get.mock.calls.length;

    await user.click(screen.getByRole('button', { name: /^삭제$/ }));

    await waitFor(() => {
      expect(axios.get.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });
});

describe('AdminUserMain - 저장 API 연동', () => {
  beforeEach(() => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/users') return Promise.resolve({ data: mockUsers });
      if (url === `/api/v1/users/${mockUsers[0].id}`) return Promise.resolve({ data: mockUsers[0] });
      return Promise.resolve({ data: {} });
    });
    axios.put.mockResolvedValue({ data: { ...mockUsers[0], nickname: '수정된닉네임' } });
  });

  it('저장 버튼 클릭 시 PUT /api/v1/users/{user_id}를 호출한다', async () => {
    const user = userEvent.setup();
    render(<AdminUserMain />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /수정/i })).toHaveLength(mockUsers.length);
    });

    const editButtons = screen.getAllByRole('button', { name: /수정/i });
    await user.click(editButtons[0]);

    await user.click(screen.getByRole('button', { name: /저장/i }));

    expect(axios.put).toHaveBeenCalledWith(
      `/api/v1/users/${mockUsers[0].id}`,
      expect.any(Object),
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });
});

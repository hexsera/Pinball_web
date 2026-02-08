# 친구 페이지 검색기능 TDD 계획서

## 목표
FriendPage 왼쪽 영역에 닉네임 검색 기능을 추가하고, 검색 결과를 리스트로 표시한다.

## 요구사항 요약
1. 검색바(TextField)와 "검색" 버튼이 존재한다
2. 검색바에 닉네임을 입력하고 "검색" 버튼을 클릭한다
3. 해당 닉네임을 가진 사용자 리스트를 표시한다

## 사전 조건
- **API 없이 Mock 데이터로 먼저 구현**
- 백엔드 API는 추후 구현 예정: `GET /api/v1/users/search?nickname={닉네임}`
- 현재는 컴포넌트 내부에 Mock 사용자 데이터를 하드코딩하여 검색 기능 구현

---

## 1단계: 테스트 작성 (RED)

### 테스트 파일
`frontend/src/test/FriendSearch.test.jsx`


### 테스트 케이스

#### TC-1. 검색바와 검색 버튼이 존재한다
```jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FriendPage from '../FriendPage';

describe('FriendPage 검색기능', () => {
  it('검색바가 존재한다', () => {
    render(<FriendPage />);
    const searchInput = screen.getByPlaceholderText('닉네임을 입력하세요');
    expect(searchInput).toBeInTheDocument();
  });

  it('검색 버튼이 존재한다', () => {
    render(<FriendPage />);
    const searchButton = screen.getByRole('button', { name: '검색' });
    expect(searchButton).toBeInTheDocument();
  });
});
```

#### TC-2. 검색바에 닉네임을 입력할 수 있다
```jsx
import userEvent from '@testing-library/user-event';

it('검색바에 닉네임을 입력할 수 있다', async () => {
  const user = userEvent.setup();
  render(<FriendPage />);

  const searchInput = screen.getByPlaceholderText('닉네임을 입력하세요');
  await user.type(searchInput, '테스트유저');

  expect(searchInput).toHaveValue('테스트유저');
});
```

#### TC-3. 검색 버튼 클릭 시 검색 결과가 표시된다
```jsx
it('검색 버튼 클릭 시 사용자 리스트가 표시된다', async () => {
  const user = userEvent.setup();
  render(<FriendPage />);

  const searchInput = screen.getByPlaceholderText('닉네임을 입력하세요');
  await user.type(searchInput, '테스트');

  const searchButton = screen.getByRole('button', { name: '검색' });
  await user.click(searchButton);

  // Mock 데이터에 '테스트' 포함된 닉네임이 있으면 표시됨
  const result = await screen.findByText(/테스트/);
  expect(result).toBeInTheDocument();
});
```

#### TC-4. 검색 결과가 없으면 안내 메시지를 표시한다
```jsx
it('검색 결과가 없으면 안내 메시지를 표시한다', async () => {
  const user = userEvent.setup();
  render(<FriendPage />);

  const searchInput = screen.getByPlaceholderText('닉네임을 입력하세요');
  await user.type(searchInput, 'zzz존재하지않는닉네임zzz');

  const searchButton = screen.getByRole('button', { name: '검색' });
  await user.click(searchButton);

  const message = await screen.findByText('검색 결과가 없습니다');
  expect(message).toBeInTheDocument();
});
```

#### TC-5. 검색 결과 각 항목에 "친구추가" 버튼이 존재한다
```jsx
it('검색 결과 각 항목에 "친구추가" 버튼이 존재한다', async () => {
  const user = userEvent.setup();
  render(<FriendPage />);

  const searchInput = screen.getByPlaceholderText('닉네임을 입력하세요');
  await user.type(searchInput, '테스트');

  const searchButton = screen.getByRole('button', { name: '검색' });
  await user.click(searchButton);

  // "친구추가" 버튼이 여러 개 존재 (검색 결과 개수만큼)
  const addButtons = await screen.findAllByRole('button', { name: '친구추가' });
  expect(addButtons.length).toBeGreaterThan(0);
});
```

---

## 2단계: 구현 (GREEN)

### 수정 파일: `frontend/src/FriendPage.jsx`

**Mock 데이터를 사용한 검색 기능 구현** (API 없이):

```jsx
import React, { useState } from 'react';
import { Box, Paper, TextField, Button, List, ListItem, ListItemText, Typography } from '@mui/material';

// Mock 사용자 데이터 (추후 API로 대체 예정)
const MOCK_USERS = [
  { id: 1, email: 'user1@test.com', nickname: '테스트유저1', birth_date: '2000-01-01', role: 'user' },
  { id: 2, email: 'user2@test.com', nickname: '테스트유저2', birth_date: '2000-01-02', role: 'user' },
  { id: 3, email: 'user3@test.com', nickname: '홍길동', birth_date: '2000-01-03', role: 'user' },
  { id: 4, email: 'user4@test.com', nickname: '김철수', birth_date: '2000-01-04', role: 'user' },
  { id: 5, email: 'user5@test.com', nickname: '박영희', birth_date: '2000-01-05', role: 'user' },
];

function FriendPage() {
  const [searchNickname, setSearchNickname] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    // Mock 데이터에서 닉네임으로 검색 (부분 일치)
    const results = MOCK_USERS.filter(user =>
      user.nickname.includes(searchNickname)
    );
    setSearchResults(results);
    setHasSearched(true);
  };

  const handleAddFriend = (user) => {
    // TODO: 친구 추가 기능 구현 예정
    console.log('친구 추가:', user.nickname);
  };

  return (
    <Box data-testid="friend-page" sx={{ display: 'flex', width: '100%', gap: 2 }}>
      <Box data-testid="friend-left-area" sx={{ width: '60%' }}>
        <Paper sx={{ p: 2, minHeight: '200px' }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              placeholder="닉네임을 입력하세요"
              value={searchNickname}
              onChange={(e) => setSearchNickname(e.target.value)}
              size="small"
              fullWidth
            />
            <Button variant="contained" onClick={handleSearch}>검색</Button>
          </Box>
          {hasSearched && searchResults.length === 0 && (
            <Typography>검색 결과가 없습니다</Typography>
          )}
          <List>
            {searchResults.map((user) => (
              <ListItem
                key={user.id}
                secondaryAction={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleAddFriend(user)}
                  >
                    친구추가
                  </Button>
                }
              >
                <ListItemText primary={user.nickname} secondary={user.email} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
      <Box data-testid="friend-right-area" sx={{ width: '40%' }}>
        <Paper sx={{ p: 2, minHeight: '200px' }}>
          {/* 오른쪽 영역 콘텐츠 */}
        </Paper>
      </Box>
    </Box>
  );
}

export default FriendPage;
```

**특징:**
- `MOCK_USERS` 배열에 하드코딩된 사용자 데이터
- `handleSearch()` 함수에서 `Array.filter()`와 `String.includes()`로 부분 일치 검색
- **검색 결과 각 항목에 "친구추가" 버튼 (ListItem secondaryAction 사용)**
- **`handleAddFriend()` 함수는 현재 console.log만 출력 (추후 구현 예정)**
- API 호출 없이 즉시 검색 가능
- 추후 API 구현 시 `handleSearch()`, `handleAddFriend()` 함수만 수정하면 됨

---

## 3단계: 리팩토링 (REFACTOR)

테스트 통과 확인 후 필요 시 코드 정리.

---

## TDD 실행 순서

| 순서 | 작업 | 명령어 |
|------|------|--------|
| 1 | 테스트 파일 생성 | `FriendSearch.test.jsx` 작성 |
| 2 | 테스트 실행 (RED 확인) | `npm run test:run` |
| 3 | FriendPage.jsx 수정 | Mock 데이터 + 검색 UI + 검색 로직 + 결과 리스트 |
| 4 | 테스트 실행 (GREEN 확인) | `npm run test:run` |
| 5 | 리팩토링 | 필요 시 코드 정리 |
| 6 | 테스트 재실행 (GREEN 유지 확인) | `npm run test:run` |
| 7 | (추후) 백엔드 API 구현 | `GET /api/v1/users/search?nickname=` |
| 8 | (추후) handleSearch() 함수를 API 호출로 변경 | axios.get 사용 |

---

## 테스트 실행 명령어

```bash
# 검색기능 테스트만 실행
cd frontend && npx vitest run src/test/FriendSearch.test.jsx

# 전체 FriendPage 테스트 실행
cd frontend && npx vitest run src/test/FriendPage.test.jsx src/test/FriendSearch.test.jsx
```

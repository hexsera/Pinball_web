# HeaderUserInfo 수정 실행계획

## 요구사항 요약

**요구사항**: HeaderUserInfo 컴포넌트에서 불필요한 버튼 제거 및 UI 개선

**목적**: 헤더의 사용자 정보 영역을 단순화하고, Avatar와 닉네임 사이 간격 추가, Avatar에 사용자 첫 글자 표시, xs 화면에서 닉네임 숨김 처리

## 현재상태 분석

- 파일 위치: `frontend/src/components/HeaderUserInfo.jsx`
- 로그인 상태에서 `<IconButton>` 2개(Notifications, Mail)가 렌더링됨
- `id="basic-button"` Button 내부에 Avatar와 Typography가 간격 없이 배치되어 있음
- Avatar 내부 텍스트가 하드코딩 `"U"`로 고정됨
- xs 화면에서도 Typography(닉네임)가 항상 표시됨
- MUI `sx` prop으로 스타일링되어 있으며, 반응형 처리는 MUI breakpoint를 활용 가능

## 구현 방법

- MUI의 `sx` prop과 `display` breakpoint(`{ xs: 'none', sm: 'block' }`)를 사용해 반응형 처리
- Avatar `children` prop에 `user.nickname[0]`(첫 글자)를 전달
- Avatar와 Typography 사이 간격은 MUI `gap` 또는 `ml` sx 속성으로 처리
- 삭제 대상 JSX 요소 제거

## 구현 단계

### 1. 메시지 버튼과 종 버튼 삭제

```jsx
// 삭제할 코드 (두 IconButton 제거)
<IconButton onClick={() => navigate('/admin')}>
  <Badge><Notifications /></Badge>
</IconButton>
<IconButton>
  <Badge><Mail /></Badge>
</IconButton>
```
- **무엇을 하는가**: 로그인 상태에서 렌더링되는 알림(종)·메시지(편지) 아이콘 버튼 두 개를 JSX에서 제거
- 해당 아이콘들의 import(`Notifications`, `Mail`, `Badge`)도 함께 제거

### 2. Avatar와 Typography 사이 간격 추가

```jsx
// 수정 후
<Button id="basic-button" onClick={AvatarButtonClick}>
  <Avatar sx={{ width: 40, height: 40 }}>
    {user.nickname ? user.nickname[0].toUpperCase() : 'U'}
  </Avatar>
  <Typography sx={{ ml: 1 }}>{user.nickname}</Typography>
</Button>
```
- **무엇을 하는가**: Avatar와 Typography 사이에 `ml: 1`(MUI spacing 8px)을 추가해 시각적 여백 생성
- 기존 Avatar의 `ml: 1`은 제거하고, Typography에 `ml: 1` 이동

### 3. Avatar 내부 글자를 닉네임 첫 글자로 변경

```jsx
<Avatar sx={{ width: 40, height: 40 }}>
  {user.nickname ? user.nickname[0].toUpperCase() : 'U'}
</Avatar>
```
- **무엇을 하는가**: 하드코딩된 `"U"` 대신 `user.nickname`의 첫 글자(대문자)를 Avatar에 표시
- `user.nickname`이 없을 경우 fallback으로 `'U'` 표시

### 4. xs 화면에서 Typography 숨김 처리

```jsx
<Typography sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
  {user.nickname}
</Typography>
```
- **무엇을 하는가**: MUI breakpoint를 활용해 xs(600px 미만) 화면에서 닉네임 텍스트를 숨김
- `sm` 이상에서는 기존처럼 닉네임 표시

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| `frontend/src/components/HeaderUserInfo.jsx` | 수정 | 종·메시지 버튼 삭제, Avatar 첫 글자 적용, 간격 추가, xs 닉네임 숨김 |

## 완료 체크리스트

- [ ] 헤더에서 알림(종) 버튼이 사라졌는지 확인
- [ ] 헤더에서 메시지(편지) 버튼이 사라졌는지 확인
- [ ] Avatar와 닉네임 텍스트 사이에 간격이 생겼는지 확인
- [ ] Avatar 내부에 닉네임 첫 글자(대문자)가 표시되는지 확인
- [ ] 브라우저 너비를 600px 미만으로 줄였을 때 닉네임 텍스트가 숨겨지는지 확인
- [ ] 브라우저 너비를 600px 이상으로 늘렸을 때 닉네임 텍스트가 보이는지 확인
- [ ] 콘솔에 에러가 없는지 확인

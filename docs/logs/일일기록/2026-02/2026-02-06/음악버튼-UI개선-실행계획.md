# 음악 버튼 UI 개선 실행계획

## 요구사항 요약

**요구사항**: 핀볼게임의 "음악 시작" 버튼을 게임영역 위 UI 영역(LIVES 표시 영역)에 배치하고, 이후 MUI 소리 아이콘으로 변경한다.

**목적**: 음악 시작 버튼이 게임 캔버스 바깥 상단에 따로 떨어져 있어 UX가 좋지 않으므로, 게임 UI 영역 안에 통합하여 일관된 게임 인터페이스를 제공한다.

## 현재상태 분석

- "음악 시작" `<Button>`이 최상위 Flexbox Box의 첫 번째 자식으로, 게임 컨테이너 **바깥 위쪽**에 위치
- `isPlaying === false`일 때만 표시되고, 한 번 누르면 영구적으로 숨겨짐 (정지 기능 없음)
- 게임 UI 영역(검은색 배경, 700×100px)에는 현재 `LIVES: {lives}`만 표시
- MUI `Button`, `Box`, `Typography`만 import되어 있고, MUI 아이콘은 미사용

## 구현 방법

- **Phase 1**: 기존 "음악 시작" `<Button>`을 현재 위치에서 제거하고, 게임 UI 영역(LIVES 표시 Box) 안으로 이동한다.
- **Phase 2**: `<Button>` 대신 MUI의 `VolumeUp`/`VolumeOff` 아이콘을 사용하는 `<IconButton>`으로 교체하고, 토글 기능을 추가한다.

## 구현 단계

### Phase 1: "음악 시작" 버튼을 UI 영역으로 이동

#### 1. 기존 버튼 제거
```javascript
// 삭제할 코드 (최상위 Box 바로 아래, 게임 컨테이너 위)
{!isPlaying && (
  <Button variant="contained" onClick={handlePlayMusic}>
    음악 시작
  </Button>
)}
```
- **무엇을 하는가**: 게임 컨테이너 바깥에 있는 기존 음악 시작 버튼을 제거한다.

#### 2. UI 영역(LIVES Box)에 버튼 추가
```javascript
{/* UI 영역 */}
<Box sx={{
  width: '700px',
  height: '100px',
  backgroundColor: '#000000',
  display: 'flex',
  flexDirection: 'row',          // column → row 변경
  justifyContent: 'space-between', // center → space-between 변경
  alignItems: 'center',
  padding: '0 20px',             // 좌우 여백 추가
}}>
  <Typography sx={{
    color: '#FFD700',
    fontSize: '24px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  }}>
    LIVES: {lives}
  </Typography>

  {!isPlaying && (
    <Button variant="contained" onClick={handlePlayMusic}>
      음악 시작
    </Button>
  )}
</Box>
```
- **무엇을 하는가**: LIVES가 표시되는 UI 영역에 음악 시작 버튼을 함께 배치한다.
- `flexDirection: 'row'`로 변경하여 LIVES와 버튼을 좌우로 배치
- `justifyContent: 'space-between'`으로 LIVES는 왼쪽, 버튼은 오른쪽에 위치
- 버튼은 기본 MUI 스타일 사용 (Phase 1에서는 꾸미지 않음)

### Phase 2: 소리 아이콘으로 변경

#### 3. MUI 아이콘 import 추가
```javascript
import { Button, Box, Typography, IconButton } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
```
- **무엇을 하는가**: MUI 아이콘 컴포넌트와 IconButton을 import한다.
- `VolumeUpIcon`: 음악 재생 중 아이콘
- `VolumeOffIcon`: 음악 정지 중 아이콘

#### 4. 음악 토글 핸들러 추가
```javascript
const handleToggleMusic = () => {
  if (bgmRef.current) {
    if (isPlaying) {
      bgmRef.current.pause();
      setIsPlaying(false);
    } else {
      bgmRef.current.play();
      setIsPlaying(true);
    }
  }
};
```
- **무엇을 하는가**: 기존 `handlePlayMusic`을 대체하여 재생/정지 토글 기능을 구현한다.
- `isPlaying`이 true이면 일시정지, false이면 재생

#### 5. Button을 IconButton으로 교체
```javascript
<IconButton
  onClick={handleToggleMusic}
  sx={{
    color: '#FFD700',
    '&:hover': { color: '#FFC107' },
  }}
>
  {isPlaying ? (
    <VolumeUpIcon sx={{ fontSize: '36px' }} />
  ) : (
    <VolumeOffIcon sx={{ fontSize: '36px' }} />
  )}
</IconButton>
```
- **무엇을 하는가**: 텍스트 버튼 대신 소리 아이콘으로 교체한다.
- 음악 재생 중: `VolumeUpIcon` 표시
- 음악 정지 중: `VolumeOffIcon` 표시
- 아이콘은 항상 표시되어 언제든 토글 가능 (기존처럼 숨겨지지 않음)

## 수정/생성할 파일 목록

| 파일 경로 | 작업 유형 | 변경 내용 |
|-----------|-----------|-----------|
| frontend/src/Pinball.jsx | 수정 | Phase 1: 버튼 위치 이동, UI 영역 레이아웃 변경 |
| frontend/src/Pinball.jsx | 수정 | Phase 2: MUI 아이콘 import 추가, 토글 핸들러 추가, IconButton 교체 |

## 완료 체크리스트

- [ ] Phase 1: 게임 캔버스 바깥 상단에 "음악 시작" 버튼이 더 이상 보이지 않는다
- [ ] Phase 1: UI 영역(검은색 배경)에 LIVES와 "음악 시작" 버튼이 좌우로 나란히 표시된다
- [ ] Phase 1: "음악 시작" 버튼 클릭 시 배경음악이 정상 재생된다
- [ ] Phase 2: "음악 시작" 텍스트 버튼 대신 소리 아이콘이 표시된다
- [ ] Phase 2: 아이콘 클릭 시 음악 재생/정지가 토글된다
- [ ] Phase 2: 음악 재생 중에는 VolumeUp 아이콘, 정지 중에는 VolumeOff 아이콘이 표시된다
- [ ] 에러 없이 `npm run start`로 실행된다

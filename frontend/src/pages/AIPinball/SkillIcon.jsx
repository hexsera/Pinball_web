import { Box, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

function SkillIcon({ skillState, cooldownProgress = 0 }) {
  return (
    <Box sx={{
      position: 'relative',
      width: '80px',
      height: '80px',
      borderRadius: '12px',
      backgroundColor: '#000000cc',
      border: '2px solid #ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      overflow: 'hidden',
    }}>
      {/* 충전 바: 아래에서 위로 차오르는 흰색 영역 */}
      {skillState === 'loading' && (
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: `${cooldownProgress * 100}%`,
          backgroundColor: '#ffffff33',
          transition: 'height 0.1s linear',
          pointerEvents: 'none',
        }} />
      )}
      {skillState === 'loading' && (
        <>
          <CircularProgress size={32} sx={{ color: '#ffffffaa' }} />
          <Typography sx={{ color: '#ffffff88', fontSize: '9px', letterSpacing: '0.5px' }}>
            LOADING
          </Typography>
        </>
      )}
      {skillState === 'big' && (
        <>
          <Box sx={{
            width: '38px', height: '38px', borderRadius: '50%',
            backgroundColor: '#2196f3',
            boxShadow: '0 0 10px #2196f3',
            border: '2px solid #64b5f6',
          }} />
          <Typography sx={{ color: '#64b5f6', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            BIG
          </Typography>
        </>
      )}
      {skillState === 'small' && (
        <>
          <Box sx={{
            width: '20px', height: '20px', borderRadius: '50%',
            backgroundColor: '#e94560',
            boxShadow: '0 0 10px #e94560',
            border: '2px solid #ff6b6b',
          }} />
          <Typography sx={{ color: '#ff6b6b', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            SMALL
          </Typography>
        </>
      )}
    </Box>
  );
}

export default SkillIcon;

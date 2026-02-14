import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, IconButton } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import Pinball from '../Pinball';
import HeaderUserInfo from '../../components/HeaderUserInfo';

function PinballPage() {
  const navigate = useNavigate();

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [gameScale, setGameScale] = useState(1);

  const calculateScale = useCallback(() => {
    const canvasWidth = 700;
    const canvasHeight = 1200;
    const padding = 120;
    const scaleByWidth = (windowSize.width - padding) / canvasWidth;
    const scaleByHeight = (windowSize.height - padding) / canvasHeight;
    setGameScale(Math.min(scaleByWidth, scaleByHeight, 1));
  }, [windowSize]);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    calculateScale();
  }, [windowSize, calculateScale]);

  const scaledHeight = 1200 * gameScale;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#0F172A' }}>
      {/* 상단 헤더 */}
      <AppBar position="static" sx={{ backgroundColor: '#1E293B', boxShadow: 'none', borderBottom: '1px solid #334155' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton onClick={() => navigate('/')} sx={{ color: '#F1F5F9' }}>
            <HomeIcon />
          </IconButton>
          <HeaderUserInfo />
        </Toolbar>
      </AppBar>

      {/* 게임 영역 */}
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'hidden', pt: 2 }}>
        <Box sx={{
          transform: `scale(${gameScale})`,
          transformOrigin: 'top center',
          width: 700,
          height: 1200,
          marginBottom: `${scaledHeight - 1200}px`,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          <Pinball />
        </Box>
      </Box>
    </Box>
  );
}

export default PinballPage;

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, IconButton, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import HomeIcon from '@mui/icons-material/Home';
import Pinball from '../Pinball';
import HeaderUserInfo from '../../components/HeaderUserInfo';
import ChatPanel from '../../components/ChatPanel/ChatPanel';

function PinballPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const appBarRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [gameScale, setGameScale] = useState(1);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (appBarRef.current) {
      setHeaderHeight(appBarRef.current.offsetHeight);
    }
  }, []);

  const calculateScale = useCallback(() => {
    const canvasWidth = 700;
    const canvasHeight = 1200;

    if (isMobile) {
      const scaleByWidth = windowSize.width / canvasWidth;
      const scaleByHeight = (windowSize.height - headerHeight) / canvasHeight;
      setGameScale(Math.min(scaleByWidth, scaleByHeight, 1));
    } else {
      const padding = 120;
      const scaleByWidth = (windowSize.width - padding) / canvasWidth;
      const scaleByHeight = (windowSize.height - padding) / canvasHeight;
      setGameScale(Math.min(scaleByWidth, scaleByHeight, 1));
    }
  }, [windowSize, isMobile, headerHeight]);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    calculateScale();
  }, [windowSize, calculateScale]);

  const scaledHeight = 1200 * gameScale;
//##0F172A
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#000000' }}>
      {/* 상단 헤더 */}
      <AppBar ref={appBarRef} position="static" sx={{ backgroundColor: '#1E293B', boxShadow: 'none', borderBottom: '1px solid #334155' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton onClick={() => navigate('/')} sx={{ color: '#F1F5F9' }}>
            <HomeIcon />
          </IconButton>
          <HeaderUserInfo />
        </Toolbar>
      </AppBar>

      {/* 게임 + 채팅 영역 */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'hidden', pt: isMobile ? 0 : 2 }}>
        <Box sx={{
          transform: `scale(${gameScale})`,
          transformOrigin: 'top center',
          width: 700,
          height: 1200,
          marginBottom: `${scaledHeight - 1200}px`,
          marginLeft: 'auto',
          marginRight: 'auto',
          position: 'relative',
        }}>
          <Box sx={{ visibility: isReady ? 'visible' : 'hidden' }}>
            <Pinball onReady={() => setIsReady(true)} />
          </Box>
          {!isReady && (
            <Box sx={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              backgroundColor: '#000000',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              zIndex: 50,
            }}>
              <CircularProgress size={64} sx={{ color: '#e94560' }} />
            </Box>
          )}
        </Box>
      </Box>
      <ChatPanel />
      </Box>
    </Box>
  );
}

export default PinballPage;

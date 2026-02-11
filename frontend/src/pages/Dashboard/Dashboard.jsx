import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  Grid,
  Paper,
  CardMedia,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Menu as MenuIcon,
  CalendarMonth,
  Person,
  Lock,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

import Pinball from '../Pinball';
import UserInfo from '../UserInfo';
import FriendPage from '../FriendPage';
import HeaderUserInfo from '../../components/HeaderUserInfo';

const drawerWidth = 260;


function Maindashboard() {
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuth();

  const [openMenus, setOpenMenus] = useState({});
  const [menuIndex, setMenuIndex] = useState(0);

  const [showPinball, setShowPinball] = useState(true);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showFriend, setShowFriend] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [monthlyRankingData, setMonthlyRankingData] = useState([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState(true);
  const [rankingError, setRankingError] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // 기기 유형 감지
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|Android|Mobile/i.test(userAgent);
    console.log(navigator);

    if (isMobile) {
      console.log('모바일 환경');

    } else {
      console.log('데스크탑 환경');

    }
  }, []);

  // 월간 랭킹 데이터 조회
  useEffect(() => {
    const fetchMonthlyRanking = async () => {
      try {
        setIsLoadingRanking(true);

        // 월간 점수 목록 조회
        const response = await axios.get('/api/v1/monthly-scores');
        const scores = response.data.scores;

        // 응답 데이터를 rank와 임시 nickname 추가하여 변환
        const rankingData = scores.slice(0, 10).map((score, index) => ({
          rank: index + 1,
          nickname: score.nickname,  // 임시 닉네임 (추후 API에서 제공 예정)
          score: score.score
        }));

        setMonthlyRankingData(rankingData);
        setRankingError(null);
      } catch (error) {
        console.error('월간 랭킹 조회 실패:', error);
        setRankingError('랭킹 데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoadingRanking(false);
      }
    };

    fetchMonthlyRanking();
  }, []);

  // 메뉴 항목 데이터
  const menuItems = [
    { text: '게임하기', icon: <CalendarMonth />, path: '/calendar' },
    { text: '친구', icon: <Person />, path: '/profile' },
    { text: '계정', icon: <Lock />, submenu: ['Sign In', 'Sign Up', 'Reset Password'] },
  ];
  
  function handleMenuClick (itemtext, index) {
    setMenuIndex(index);
    if (itemtext == '게임하기')
    {
      setShowPinball(true);
      setShowUserInfo(false);
      setShowFriend(false);
    }

    if (itemtext == '친구')
    {
      if (isLoggedIn == false)
      {
        navigate('/login')
      }
      else
      {
        setShowPinball(false);
        setShowUserInfo(false);
        setShowFriend(true);
      }
    }

    if (itemtext == '계정')
    {
      if (isLoggedIn == false)
      {
        navigate('/login')
      }
      else
      {
        setShowPinball(false);
        setShowUserInfo(true);
        setShowFriend(false);
      }
    }
  }


  // 통계 카드 데이터
  

  // 테이블 데이터
  

  // 사이드바 컨텐츠
  const drawer = (
    <Box>
      <Toolbar
        sx={{
          height: 80,
          display: 'flex',
          alignItems: 'center',
          px: 2,
        }}
      >
        
          <CardMedia
                component="img"
                height={70}
                image="/images/main_icon.png"
                alt="로고"
                onClick={()=>handleMenuClick("메인페이지", 0)}
                sx={{ marginBottom: 2, objectFit: 'contain' }} />

        
        
      </Toolbar>

      <List sx={{ px: 2 }}>
        {menuItems.map((item, index) => (
          <Box key={index}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleMenuClick(item.text, index)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  color: '#2f3135ff',
                  '&:hover': {
                    backgroundColor: '#eff3f8ff',
                  },
                  ...(index === menuIndex && {
                    backgroundColor: '#ECF3FF',
                    color: '#465FFF',
                    '&:hover': {
                    backgroundColor: '#ECF3FF',
                  },
                  }),
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
                
              </ListItemButton>
            </ListItem>
            
          </Box>
        ))}
      </List>
    </Box>
  );

  // const mainele = (
  //   <Grid container spacing={3} sx={{ mb: 3 }}>
  //       <Paper
  //           sx={{
  //               p: 3,
  //               height: 400,
  //               boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  //               border: '1px solid #e5e7eb',
  //           }}
  //           >
  //           {isLoggedIn?
  //           (
  //             <>
  //             <Typography variant="h6" fontWeight={600} gutterBottom>
  //               로그인 했으니깐 게임하러 가기!!!
  //             </Typography>
  //             <Button variant="contained"
  //               onClick={()=>navigate("/Pinball_test")}>
  //                 게 임 하 기
  //             </Button>
  //             </>
  //           ) :
  //           (
  //             <>
  //             <Typography variant="h6" fontWeight={600} gutterBottom>
  //               로그인 하고 세상에서 가장 재미있는 핀볼게임 하러가기!!!!!!
  //             </Typography>
  //             <Button variant="contained"
  //             onClick={()=>navigate("/login")}>
  //                 로 그 인 하 기
  //             </Button>
  //             </>
  //           )
  //         }
  //       </Paper>
  //       <Paper
  //           sx={{
  //               p: 3,
  //               boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  //               border: '1px solid #e5e7eb',
  //               maxHeight: 500,
  //           }}
  //           >
  //           <Typography variant="h6" fontWeight={600} gutterBottom>
  //               한달 랭킹 TOP 10
  //           </Typography>
  //           {isLoadingRanking ? (
  //               <Typography sx={{ py: 3, textAlign: 'center' }}>
  //                   로딩 중...
  //               </Typography>
  //           ) : rankingError ? (
  //               <Typography sx={{ py: 3, textAlign: 'center', color: 'error.main' }}>
  //                   {rankingError}
  //               </Typography>
  //           ) : (
  //               <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
  //                   <Table size="small" stickyHeader>
  //                       <TableHead>
  //                           <TableRow>
  //                               <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB' }}>순위</TableCell>
  //                               <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB' }}>닉네임</TableCell>
  //                               <TableCell sx={{ fontWeight: 600, backgroundColor: '#F9FAFB' }} align="right">점수</TableCell>
  //                           </TableRow>
  //                       </TableHead>
  //                       <TableBody>
  //                           {monthlyRankingData.map((row) => (
  //                               <TableRow key={row.rank}>
  //                                   <TableCell>{row.rank}</TableCell>
  //                                   <TableCell>{row.nickname}</TableCell>
  //                                   <TableCell align="right">{row.score.toLocaleString()}</TableCell>
  //                               </TableRow>
  //                           ))}
  //                       </TableBody>
  //                   </Table>
  //               </TableContainer>
  //           )}
  //       </Paper>
  //       <Paper sx={{ p: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)', border: '1px solid #e5e7eb' }}>
  //           <Typography variant="h6" fontWeight={600} gutterBottom>이번주 방문자 수</Typography>
  //           <CardMedia component="img" image="/images/graph.png" alt="로고" sx={{ marginBottom: 2, objectFit: 'contain' }} />
  //       </Paper>
  //       <Paper sx={{ p: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)', border: '1px solid #e5e7eb' }}>
  //           <Typography variant="h6" fontWeight={600} gutterBottom>월간 최고 기록</Typography>
  //           <CardMedia component="img" image="/images/graph2.png" alt="로고" sx={{ marginBottom: 2, objectFit: 'contain' }} />
  //       </Paper>
  //   </Grid>
  // );

  return (
    <Box sx={{ display: 'flex'}}>
        {/*상단*/}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: '#ffffffff',
          color: '#1f2937',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
          <HeaderUserInfo />
        </Toolbar>

      </AppBar>
      {/*사이드바*/}
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* 모바일 Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // 모바일 성능 향상
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: '#ffffffff',
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* 데스크탑 Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: '#ffffffff',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/*메인*/}
      <Box
        component="main"
        sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            backgroundColor: '#F9FAFB',
            minHeight: '100vh',
        }}
      >
      <Toolbar />
      <Container maxWidth="xl">
        {showPinball ? <Pinball /> : showUserInfo ? <UserInfo /> : showFriend ? <FriendPage /> : null}
      </Container>
      </Box>
    </Box>
  );
}


export default Maindashboard;
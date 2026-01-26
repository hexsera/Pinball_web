import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TextField,
  InputAdornment,
  Avatar,
  Badge,
  Paper,
  CardMedia,
  Button,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  CalendarMonth,
  Person,
  Description,
  BarChart,
  Lock,
  Search,
  Notifications,
  Mail,
} from '@mui/icons-material';
import { useAuth } from './AuthContext';

import Pinball from './Pinball';
import UserInfo from './UserInfo';

const drawerWidth = 260;


function Maindashboard() {
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuth();

  const [openMenus, setOpenMenus] = useState({});
  const [menuIndex, setMenuIndex] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [avatarMenu, setAvatarMenu] = useState(false);

  const [showPinball, setShowPinball] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);

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

  // 메뉴 항목 데이터
  const menuItems = [
    { text: '메인페이지', icon: <Dashboard />, path: '/' },
    { text: '게임하기', icon: <CalendarMonth />, path: '/calendar' },
    { text: '친구', icon: <Person />, path: '/profile' },
    {
      text: '소식',
      icon: <Description />,
      submenu: ['Form Elements', 'Form Layout'],
    },

    {
      text: '통계',
      icon: <BarChart />,
      submenu: ['Basic Chart', 'Advanced Chart'],
    },

    {
      text: '계정',
      icon: <Lock />,
      submenu: ['Sign In', 'Sign Up', 'Reset Password'],
    },
  ];
  
  function handleMenuClick (itemtext, index) {
    setMenuIndex(index);
    if (itemtext == '메인페이지')
    {
        setShowPinball(false);
        setShowUserInfo(false);
    }

    if (itemtext == '게임하기')
    {
      setShowPinball(true);
      setShowUserInfo(false);
    }

    if (itemtext == '친구')
    {
      if (isLoggedIn == false)
      {
        navigate('/login')
      }
    }
    if (itemtext == '소식')
    {

    }
    if (itemtext == '통계')
    {
      if (isLoggedIn == false)
      {
        navigate('/login')
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
      }
    }
  }

  function AvatarButtonClick (event)
  {
    setAnchorEl(event.currentTarget);
    setAvatarMenu(!avatarMenu);
  }

  function handleAvatarMenuClose ()
  {
    setAnchorEl(null);
    setAvatarMenu(false);
  }

  function AvatarLogoutButton()
  {
    logout();
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
  
  const mainele = (
    <Grid container spacing={3} sx={{ mb: 3 }}>
        <Paper
            sx={{
                p: 3,
                height: 400,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb',
            }}
            >
            {isLoggedIn?
            (
              <>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                로그인 했으니깐 게임하러 가기!!!
              </Typography>
              <Button variant="contained"
                /* onClick={()=>handleMenuClick('게임하기', 1)}> */
                onClick={()=>navigate("/Pinball_test")}>
                  게 임 하 기
              </Button>
              </>
              
            ) :
            (
              <>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                로그인 하고 세상에서 가장 재미있는 핀볼게임 하러가기!!!!!!
                
              </Typography>
              <Button variant="contained"
              onClick={()=>navigate("/login")}>
                  로 그 인 하 기
              </Button>
              </>
            )
          }
        
        </Paper>
        <Paper
            sx={{
                p: 3,

                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb',
            }}
            >
            <Typography variant="h6" fontWeight={600} gutterBottom>
                이번주 방문자 수
            </Typography>
            <CardMedia
                component="img"
                
                image="/images/graph.png"
                alt="로고"
                sx={{ marginBottom: 2, objectFit: 'contain' }}
            />
            
        </Paper>
        <Paper
            sx={{
                p: 3,

                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e5e7eb',
            }}
            >
            <Typography variant="h6" fontWeight={600} gutterBottom>
                월간 최고 기록
            </Typography>
            <CardMedia
                component="img"
                
                image="/images/graph2.png"
                alt="로고"
                sx={{ marginBottom: 2, objectFit: 'contain' }}
            />
        </Paper>
    </Grid>
  );

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            
            <TextField
              placeholder="Type to search..."
              size="small"
              sx={{ width: 300, display: { xs: 'none', md: 'block' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isLoggedIn ? (
                <>
                <IconButton onClick={() => navigate('/admin')}>
              <Badge >
                <Notifications />
              </Badge>
            </IconButton>
            <IconButton>
              <Badge >
                <Mail />
              </Badge>
            </IconButton>
            <Button
              id="basic-button"
              onClick={AvatarButtonClick}
              >
              <Avatar sx={{ width: 40, height: 40, ml: 1 }}>U</Avatar>
              <Typography>
                {user.name}
              </Typography>
            </Button>
            <Menu
            anchorEl={anchorEl}
            onClose={handleAvatarMenuClose}
            id="user-menu"
            open={avatarMenu}
            >
              <MenuItem>
              프로필
              </MenuItem>
              <MenuItem
              onClick={()=>AvatarLogoutButton()}>
              로그아웃
              </MenuItem>
            </Menu>
                </>
                
            ) : (
                <>
                <Button
                 variant="contained"
                 onClick={()=>navigate('/login')}>
                    로그인
                </Button>
                <Button
                  variant="outlined"
                  onClick={()=>navigate('/Register')}>
                    회원가입
                </Button>
                </>
            )}
            
          </Box>
        </Toolbar>

      </AppBar>
      {/*사이드바*/}
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >

        <Drawer
          variant="permanent"

          sx={{
            display: { xs: 'block', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth+10, 
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
        {showPinball ? <Pinball /> : showUserInfo ? <UserInfo /> : mainele}
      </Container>
      </Box>
    </Box>
  );
}


export default Maindashboard;
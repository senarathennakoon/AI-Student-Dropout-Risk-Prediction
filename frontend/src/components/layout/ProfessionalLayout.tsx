import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  IconButton,
  Button,
  useTheme,
  Avatar,
  alpha
} from '@mui/material';
import {
  School as SchoolIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProfessionalLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const ProfessionalLayout: React.FC<ProfessionalLayoutProps> = ({ 
  children, 
  title = "Student Risk Assessment" 
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'staff') return '/staff';
    if (user.role === 'admin') return '/admin';
    return `/profile/${user.username}`;
  };

  const goToAbout = () => {
    if (window.location.pathname === '/') {
      const aboutSection = document.getElementById('about');
      if (aboutSection) {
        aboutSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    navigate('/#about');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.dark, 0.2)} 0%, ${theme.palette.background.default} 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '200px',
          background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 100%)`,
          pointerEvents: 'none',
        },
      }}
    >
      {/* Animated background elements */}
      <Box
        sx={{
          position: 'fixed',
          top: '10%',
          left: '5%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
          filter: 'blur(40px)',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          bottom: '10%',
          right: '5%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 70%)`,
          filter: 'blur(50px)',
          zIndex: 0,
        }}
      />

      {/* App Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          mb: 4,
          zIndex: 10,
        }}
      >
        <Toolbar>
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              mr: 2,
              width: 40,
              height: 40,
            }}
          >
            <SchoolIcon />
          </Avatar>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.secondary.light} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {title}
          </Typography>
          {user ? (
            <>
              <Button color="inherit" variant="text" onClick={() => navigate(getDashboardPath())} sx={{ ml: 1 }}>
                Dashboard
              </Button>
              {user.role === 'student' && (
                <IconButton color="inherit" sx={{ ml: 1 }} onClick={() => navigate('/account')}>
                  <AccountCircleIcon />
                </IconButton>
              )}
              <Button color="inherit" variant="text" onClick={handleLogout} sx={{ ml: 1 }}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" variant="text" onClick={() => navigate('/')} sx={{ ml: 1 }}>
                Home
              </Button>
              <Button color="inherit" variant="text" onClick={goToAbout} sx={{ ml: 1 }}>
                About
              </Button>
              <Button color="inherit" variant="text" onClick={() => navigate('/login?role=student')} sx={{ ml: 1 }}>
                Login
              </Button>
              <Button color="inherit" variant="outlined" onClick={() => navigate('/signup')} sx={{ ml: 1 }}>
                Register
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container 
        maxWidth="lg" 
        sx={{ 
          position: 'relative', 
          zIndex: 1,
          py: 4,
        }}
      >
        {children}
      </Container>
    </Box>
  );
};
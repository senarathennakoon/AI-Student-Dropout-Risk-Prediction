import React from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Insights as InsightsIcon,
  Psychology as PsychologyIcon,
  Security as SecurityIcon,
  Groups as GroupsIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  React.useEffect(() => {
    if (location.hash === '#about') {
      const section = document.getElementById('about');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [location.hash]);

  const goToDashboard = () => {
    if (!user) {
      navigate('/login?role=student');
      return;
    }

    if (user.role === 'staff') {
      navigate('/staff');
      return;
    }

    if (user.role === 'admin') {
      navigate('/admin');
      return;
    }

    navigate(`/profile/${user.username}`);
  };

  const featureCards = [
    {
      title: 'AI-Powered Prediction',
      description: 'Machine learning models identify students who may need support before challenges become critical.',
      icon: <PsychologyIcon sx={{ fontSize: 28 }} />,
    },
    {
      title: 'Clear Risk Explanations',
      description: 'Each prediction includes transparent factor-level explanations so staff can act with confidence.',
      icon: <InsightsIcon sx={{ fontSize: 28 }} />,
    },
    {
      title: 'Intervention Tracking',
      description: 'Monitor intervention progress and close the loop between prediction, action, and outcomes.',
      icon: <AssessmentIcon sx={{ fontSize: 28 }} />,
    },
    {
      title: 'Role-Based Security',
      description: 'Students, staff, and admins access only the workflows and data relevant to their responsibilities.',
      icon: <SecurityIcon sx={{ fontSize: 28 }} />,
    },
    {
      title: 'Operational Insights',
      description: 'Dashboards and reports help teams prioritize high-impact support and make faster decisions.',
      icon: <SpeedIcon sx={{ fontSize: 28 }} />,
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <Box
        sx={{
          borderRadius: 4,
          p: { xs: 3, md: 6 },
          mb: { xs: 6, md: 9 },
          background: `linear-gradient(140deg, ${alpha(theme.palette.primary.dark, 0.45)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 65%, ${alpha(theme.palette.secondary.dark, 0.35)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.light, 0.2)}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -90,
            right: -90,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.light, 0.25)} 0%, transparent 70%)`,
          }}
        />
        <Typography variant="overline" sx={{ letterSpacing: 2.6, color: 'secondary.light' }}>
          Student Success Intelligence
        </Typography>
        <Typography variant="h2" sx={{ fontWeight: 900, mt: 1.5, mb: 2, lineHeight: 1.1 }}>
          Student Dropout Prediction System
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 850, mb: 4 }}>
          Predict dropout risk early, understand the strongest drivers, and coordinate targeted interventions that keep students on track.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button variant="contained" size="large" onClick={goToDashboard}>
            {user ? 'Go to Dashboard' : 'Get Started'}
          </Button>
          {!user && (
            <Button variant="outlined" size="large" onClick={() => navigate('/signup')}>
              Register Now
            </Button>
          )}
        </Stack>
      </Box>

      <Box sx={{ mb: { xs: 6, md: 9 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          How It Works
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3.5 }}>
          A practical three-step workflow for early detection and support delivery.
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 3,
                background: alpha(theme.palette.background.paper, 0.8),
                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <TimelineIcon color="primary" sx={{ mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  1. Data Collection
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Students provide profile and academic signals that form the foundation for risk assessment.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 3,
                background: alpha(theme.palette.background.paper, 0.8),
                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <PsychologyIcon color="primary" sx={{ mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  2. Risk Prediction
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The model estimates dropout risk and produces confidence-aware explanations for each student.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 3,
                background: alpha(theme.palette.background.paper, 0.8),
                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <GroupsIcon color="primary" sx={{ mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  3. Targeted Intervention
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Staff teams prioritize high-risk students and track support actions to improve retention outcomes.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: { xs: 6, md: 9 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Key Features
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3.5 }}>
          Built for academic teams that need both predictive power and operational clarity.
        </Typography>
        <Grid container spacing={3}>
          {featureCards.map((feature) => (
            <Grid item xs={12} md={6} lg={4} key={feature.title}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  background: `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.85)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ color: 'secondary.main', mb: 1.5 }}>{feature.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box
        id="about"
        sx={{
          mb: { xs: 6, md: 9 },
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
          background: `linear-gradient(180deg, ${alpha(theme.palette.secondary.dark, 0.18)} 0%, ${alpha(theme.palette.background.paper, 0.75)} 100%)`,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5 }}>
          Why Choose This System
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 980 }}>
          Institutions need more than dashboards: they need an evidence-driven workflow that combines prediction, explanation, and timely action. This platform brings those capabilities together so teams can identify at-risk students early, understand the factors behind risk, and coordinate measurable support strategies.
        </Typography>
      </Box>

      <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.2), mb: 3 }} />
      <Box
        component="footer"
        sx={{
          pb: 2,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Developed by Group 12 AIML Project 
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Faculty of Computing, SLIIT
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Copyright 2026. All rights reserved.
        </Typography>
      </Box>
    </Container>
  );
};

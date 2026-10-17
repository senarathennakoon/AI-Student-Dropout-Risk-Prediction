import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

import { authApi, studentApi, getApiErrorMessage } from '../services/api.service';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await authApi.login({ username, password });
      login(result.access_token, result.user);

      if (result.user.role === 'staff') {
        navigate('/staff');
        return;
      }

      if (result.user.role === 'admin') {
        navigate('/admin');
        return;
      }

      try {
        await studentApi.getStudentProfile(result.user.username);
        navigate(`/profile/${result.user.username}`);
      } catch (profileError) {
        if (axios.isAxiosError(profileError) && profileError.response?.status === 404) {
          navigate('/register');
        } else {
          navigate('/register');
        }
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${theme.palette.background.paper} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Student Login
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter your Student ID and password.
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Student ID (STU####)"
              value={username}
              onChange={(e) => setUsername(e.target.value.toUpperCase())}
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Signing in…' : 'Login'}
            </Button>
            <Button variant="text" onClick={() => navigate('/signup')}>Create account</Button>
            <Button variant="text" onClick={() => navigate('/staff/login')}>Staff login</Button>
            <Button variant="text" onClick={() => navigate('/admin/login')}>Admin login</Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

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

import { authApi, getApiErrorMessage } from '../services/api.service';
import { useAuth } from '../context/AuthContext';

export const AdminLoginPage: React.FC = () => {
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

      if (result.user.role !== 'admin') {
        toast.error('This login page is for admin accounts only.');
        return;
      }

      login(result.access_token, result.user);
      navigate('/admin');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Admin login failed'));
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
            Admin Login
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in with your admin username and password.
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Admin Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              {loading ? 'Signing in…' : 'Login as Admin'}
            </Button>
            <Button variant="text" onClick={() => navigate('/login')}>Student login</Button>
            <Button variant="text" onClick={() => navigate('/staff/login')}>Staff login</Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};
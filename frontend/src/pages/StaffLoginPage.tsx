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

export const StaffLoginPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const idPattern = new RegExp('^STA\\d{4,}$');
    if (!idPattern.test(username)) {
      toast.error('Invalid Staff ID. Use STA0001 (4+ digits)');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.login({ username, password });

      if (result.user.role !== 'staff') {
        toast.error('This login page is for staff accounts only.');
        return;
      }

      login(result.access_token, result.user);
      navigate('/staff');
    } catch (error) {
      const message = getApiErrorMessage(error, 'Staff login failed');
      if (message.toLowerCase().includes('pending')) {
        toast.error('Your staff account is pending admin approval. Please try again later.');
      } else {
        toast.error(message);
      }
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
            Staff Login
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter your Staff ID and password.
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Staff ID (STA####)"
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
              {loading ? 'Signing in…' : 'Login as Staff'}
            </Button>
            <Button variant="text" onClick={() => navigate('/staff/signup')}>Create staff account</Button>
            <Button variant="text" onClick={() => navigate('/login')}>Student login</Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

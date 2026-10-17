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

export const SignupPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const idPattern = new RegExp('^STU\\d{4,}$');
    if (!idPattern.test(username)) {
      toast.error('Invalid Student ID. Use STU0001 (4+ digits)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username,
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      };

      await authApi.registerStudent(payload);
      toast.success('Student registered successfully. Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Registration failed'));
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
            Student Registration
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your account using Student ID format STU####.
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
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              {loading ? 'Submitting…' : 'Register'}
            </Button>
            <Button variant="text" onClick={() => navigate('/login')}>Back to Login</Button>
            <Button variant="text" onClick={() => navigate('/staff/signup')}>Staff registration</Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

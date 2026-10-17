import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { useAuth } from '../context/AuthContext';
import { authApi, getApiErrorMessage } from '../services/api.service';

export const StudentAccountPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      setProfileLoading(true);
      try {
        const me = await authApi.getCurrentUser();
        updateUser(me);
        setFirstName(me.first_name);
        setLastName(me.last_name);
        setEmail(me.email);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to load account details'));
      } finally {
        setProfileLoading(false);
      }
    };

    loadCurrentUser();
  }, [updateUser]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSubmitting(true);

    try {
      const updated = await authApi.updateCurrentUser({
        first_name: firstName,
        last_name: lastName,
      });
      updateUser(updated);
      toast.success('Account details updated successfully');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update account details'));
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setPasswordSubmitting(true);
    try {
      const result = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success(result.message || 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update password'));
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${theme.palette.background.paper} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(user ? `/profile/${user.username}` : '/login')}
          >
            Back
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            My Account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Update your first name and last name, and manage your password.
          </Typography>
        </Box>

        <form onSubmit={handleProfileUpdate}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Student ID" value={user?.username || ''} fullWidth disabled />
            <TextField
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              fullWidth
              required
              disabled={profileLoading}
            />
            <TextField
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              fullWidth
              required
              disabled={profileLoading}
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              fullWidth
              disabled
            />
            <Button type="submit" variant="contained" disabled={profileSubmitting || profileLoading}>
              {profileSubmitting ? 'Saving…' : 'Save Profile'}
            </Button>
          </Box>
        </form>

        <Divider sx={{ my: 4 }} />

        <form onSubmit={handlePasswordChange}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Reset Password
            </Typography>
            <TextField
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              fullWidth
              required
            />
            <Button type="submit" variant="contained" disabled={passwordSubmitting}>
              {passwordSubmitting ? 'Updating…' : 'Update Password'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

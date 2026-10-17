import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';

import { adminApi } from '../services/api.service';
import { AuthUser, UserRole, UserStatus } from '../types/auth.types';
import { useAuth } from '../context/AuthContext';

export const AdminDashboard: React.FC = () => {
  const theme = useTheme();
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listUsers();
      setUsers(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateUser = async (username: string, role: UserRole, status: UserStatus) => {
    setSaving(username);
    try {
      await adminApi.updateUserRole(username, { role, status });
      toast.success('User updated');
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setSaving(null);
    }
  };

  const pendingStaff = users.filter((user) => user.role === 'staff' && user.status === 'pending');

  const approveStaff = async (username: string) => {
    await updateUser(username, 'staff', 'active');
  };

  const rejectStaff = async (username: string) => {
    await updateUser(username, 'staff', 'disabled');
  };

  const deleteUser = async (username: string) => {
    const isSelfDelete = authUser?.username === username;
    const confirmMessage = isSelfDelete
      ? `Delete your own admin account (${username})? This will remove your account and cannot be undone.`
      : `Delete user ${username}? This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setDeleting(username);
    try {
      await adminApi.deleteUser(username);
      toast.success('User deleted');
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${theme.palette.background.paper} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
          Admin Dashboard
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
          <Button component={RouterLink} to="/admin/students" variant="outlined" size="small">
            Student Monitoring
          </Button>
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          Pending Staff Registration Requests
        </Typography>

        {pendingStaff.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            No pending staff registration requests.
          </Alert>
        ) : (
          <Table size="small" sx={{ mb: 3 }}>
            <TableHead>
              <TableRow>
                <TableCell>Staff ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingStaff.map((user) => (
                <TableRow key={`pending-${user.username}`}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.first_name} {user.last_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'inline-flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        disabled={saving === user.username}
                        onClick={() => approveStaff(user.username)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        disabled={saving === user.username}
                        onClick={() => rejectStaff(user.username)}
                      >
                        Reject
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          All Users
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading users…</Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 560, overflowY: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                  <TableCell align="right">Delete User</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((listedUser) => (
                  <TableRow key={listedUser.username}>
                    <TableCell>{listedUser.username}</TableCell>
                    <TableCell>{listedUser.first_name} {listedUser.last_name}</TableCell>
                    <TableCell>{listedUser.email}</TableCell>
                    <TableCell>
                      <Select
                        value={listedUser.role}
                        onChange={(e) => {
                          const role = e.target.value as UserRole;
                          setUsers((prev) => prev.map((u) => u.username === listedUser.username ? { ...u, role } : u));
                        }}
                        size="small"
                      >
                        <MenuItem value="student">student</MenuItem>
                        <MenuItem value="staff">staff</MenuItem>
                        <MenuItem value="admin">admin</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={listedUser.status}
                        onChange={(e) => {
                          const status = e.target.value as UserStatus;
                          setUsers((prev) => prev.map((u) => u.username === listedUser.username ? { ...u, status } : u));
                        }}
                        size="small"
                      >
                        <MenuItem value="active">active</MenuItem>
                        <MenuItem value="pending">pending</MenuItem>
                        <MenuItem value="disabled">disabled</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        disabled={saving === listedUser.username || deleting === listedUser.username}
                        onClick={() => updateUser(listedUser.username, listedUser.role, listedUser.status)}
                      >
                        {saving === listedUser.username ? 'Saving…' : 'Save'}
                      </Button>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        disabled={saving === listedUser.username || deleting === listedUser.username}
                        onClick={() => deleteUser(listedUser.username)}
                      >
                        {deleting === listedUser.username ? 'Deleting…' : 'Delete'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

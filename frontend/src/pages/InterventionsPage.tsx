import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage, interventionApi } from '../services/api.service';
import { InterventionCreatePayload, InterventionItem, InterventionUpdatePayload } from '../types/monitoring.types';

const interventionTypeOptions: InterventionItem['intervention_type'][] = [
  'academic',
  'financial',
  'counseling',
  'attendance',
  'other',
];

const interventionStatusOptions: InterventionItem['status'][] = [
  'planned',
  'in_progress',
  'completed',
  'cancelled',
];

type FilterState = {
  studentId: string;
};

const statusColor = (status: InterventionItem['status']) => {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'error';
  if (status === 'in_progress') return 'warning';
  return 'info';
};

const toLabel = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const todayDateString = () => new Date().toISOString().slice(0, 10);

const riskColor = (value?: string): 'error' | 'warning' | 'success' | 'default' => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('high') || normalized.includes('dropout')) return 'error';
  if (normalized.includes('medium') || normalized.includes('enrolled')) return 'warning';
  if (normalized.includes('low') || normalized.includes('graduate')) return 'success';
  return 'default';
};

export const InterventionsPage: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const { user } = useAuth();
  const backPath = user?.role === 'admin' ? '/admin' : '/staff';
  const showStaffTabs = location.pathname.startsWith('/staff');

  const navItems = [
    { label: 'Dashboard', value: '/staff' },
    { label: 'Prediction History', value: '/staff/prediction-history' },
    { label: 'Risk Explanations', value: '/staff/explain' },
    { label: 'Interventions', value: '/staff/interventions' },
    { label: 'Reports', value: '/staff/reports' },
  ];

  const getActiveTab = (pathname: string) => {
    if (pathname.startsWith('/staff/prediction-history') || pathname.startsWith('/staff/students')) {
      return '/staff/prediction-history';
    }
    if (pathname.startsWith('/staff/explain')) return '/staff/explain';
    if (pathname.startsWith('/staff/interventions')) return '/staff/interventions';
    if (pathname.startsWith('/staff/reports')) return '/staff/reports';
    return '/staff';
  };

  const activeTab = getActiveTab(location.pathname);

  const [loading, setLoading] = useState(true);
  const [createSaving, setCreateSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [items, setItems] = useState<InterventionItem[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [interventionType, setInterventionType] = useState<InterventionItem['intervention_type']>('academic');
  const [notes, setNotes] = useState('');
  const [statusValue, setStatusValue] = useState<InterventionItem['status']>('planned');
  const [date, setDate] = useState(todayDateString);

  const [filters, setFilters] = useState<FilterState>({
    studentId: '',
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<InterventionItem | null>(null);
  const [editStaffId, setEditStaffId] = useState('');
  const [editType, setEditType] = useState<InterventionItem['intervention_type']>('academic');
  const [editStatus, setEditStatus] = useState<InterventionItem['status']>('planned');
  const [editDate, setEditDate] = useState(todayDateString);
  const [editNotes, setEditNotes] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<InterventionItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const resetForm = () => {
    setStudentId('');
    setStaffId('');
    setInterventionType('academic');
    setNotes('');
    setStatusValue('planned');
    setDate(todayDateString());
  };

  const loadInterventions = useCallback(async (overrideFilters?: Partial<FilterState>) => {
    const resolved = {
      ...filters,
      ...(overrideFilters || {}),
    };

    if (!loading) {
      setRefreshing(true);
    }

    setLoading(true);
    try {
      const result = await interventionApi.list({
        student_id: resolved.studentId.trim() || undefined,
        skip: 0,
        limit: 100,
      });
      setItems(result.items || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load interventions'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadInterventions();
  }, [loadInterventions]);

  const handleSubmit = async () => {
    if (!studentId.trim()) {
      toast.error('Student ID is required');
      return;
    }
    if (!notes.trim()) {
      toast.error('Notes are required');
      return;
    }

    setCreateSaving(true);
    try {
      const createPayload: InterventionCreatePayload = {
        student_id: studentId,
        staff_id: staffId || undefined,
        intervention_type: interventionType,
        notes,
        status: statusValue,
        date: new Date(date).toISOString(),
      };
      await interventionApi.create(createPayload);
      toast.success('Intervention created');

      resetForm();
      setCreateOpen(false);
      await loadInterventions();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save intervention'));
    } finally {
      setCreateSaving(false);
    }
  };

  const openEditDialog = (item: InterventionItem) => {
    setEditingItem(item);
    setEditStaffId(item.staff_id || '');
    setEditType(item.intervention_type);
    setEditStatus(item.status);
    setEditDate(new Date(item.date).toISOString().slice(0, 10));
    setEditNotes(item.notes);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    if (!editNotes.trim()) {
      toast.error('Notes are required');
      return;
    }

    setEditSaving(true);
    try {
      const updatePayload: InterventionUpdatePayload = {
        staff_id: editStaffId || undefined,
        intervention_type: editType,
        notes: editNotes,
        status: editStatus,
        date: new Date(editDate).toISOString(),
      };
      await interventionApi.update(editingItem.intervention_id, updatePayload);
      toast.success('Intervention updated');
      setEditOpen(false);
      setEditingItem(null);
      await loadInterventions();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update intervention'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleteSaving(true);
    try {
      await interventionApi.delete(deleteTarget.intervention_id);
      toast.success('Intervention deleted');
      setDeleteOpen(false);
      setDeleteTarget(null);
      await loadInterventions();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete intervention'));
    } finally {
      setDeleteSaving(false);
    }
  };

  const summary = useMemo(() => {
    const uniqueStudents = new Set(items.map((item) => item.student_id)).size;
    const counts = {
      totalStudents: uniqueStudents,
      total: items.length,
      open: 0,
      completed: 0,
    };

    items.forEach((item) => {
      if (item.status === 'completed') {
        counts.completed += 1;
      }
      if (item.status !== 'completed' && item.status !== 'cancelled') {
        counts.open += 1;
      }
    });

    return counts;
  }, [items]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {showStaffTabs && (
        <Box
          sx={{
            position: 'sticky',
            top: { xs: 64, md: 72 },
            zIndex: (t) => t.zIndex.appBar - 1,
            mb: 3,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.18)}`,
              background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 70%)`,
              backdropFilter: 'blur(8px)',
              overflow: 'hidden',
            }}
          >
            <Tabs
              value={activeTab}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 52,
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: 999,
                },
                '& .MuiTab-root': {
                  minHeight: 52,
                  fontWeight: 700,
                  textTransform: 'none',
                },
              }}
            >
              {navItems.map((item) => (
                <Tab key={item.value} value={item.value} label={item.label} component={RouterLink} to={item.value} />
              ))}
            </Tabs>
          </Paper>
        </Box>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${theme.palette.background.paper} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              Student Interventions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Interventions staff can record for high-risk students with complete CRUD controls.
            </Typography>
          </Box>
          <Button component={RouterLink} to={backPath} variant="outlined">
            Back to Dashboard
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' }, gap: 1.5, mb: 2 }}>
          <Card sx={{ border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}` }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Total Students</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>{summary.totalStudents}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ border: `1px solid ${alpha(theme.palette.secondary.main, 0.25)}` }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Interventions</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.secondary.main }}>{summary.total}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}` }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Open</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.warning.main }}>{summary.open}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ border: `1px solid ${alpha(theme.palette.success.main, 0.25)}` }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Completed</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.success.main }}>{summary.completed}</Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New Intervention
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadInterventions()} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh from DB'}
          </Button>
          <TextField
            size="small"
            label="Student ID"
            value={filters.studentId}
            onChange={(e) => setFilters((prev) => ({ ...prev, studentId: e.target.value }))}
            sx={{ minWidth: { xs: '100%', sm: 220 }, ml: { xs: 0, md: 'auto' } }}
          />
          <Button size="small" variant="outlined" onClick={() => loadInterventions()} disabled={loading}>
            Apply
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={20} />
            <Typography>Loading interventions...</Typography>
          </Box>
        ) : items.length === 0 ? (
          <Alert severity="info">No interventions available.</Alert>
        ) : (
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              maxHeight: 540,
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Risk Score</TableCell>
                  <TableCell>Risk Level</TableCell>
                  <TableCell>Risk Factors</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.intervention_id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{item.student_id}</TableCell>
                    <TableCell>{item.course ?? '-'}</TableCell>
                    <TableCell>{typeof item.risk_score === 'number' ? item.risk_score.toFixed(2) : '-'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={toLabel(item.risk_level || 'unknown')} color={riskColor(item.risk_level)} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 340 }}>
                        {(item.risk_factors || ['No factors']).map((factor, index) => (
                          <Chip key={`${item.intervention_id}-${factor}-${index}`} size="small" label={factor} variant="outlined" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'inline-flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openEditDialog(item)}
                          startIcon={<EditIcon />}
                          disabled={deleteSaving}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => {
                            setDeleteTarget(item);
                            setDeleteOpen(true);
                          }}
                          disabled={deleteSaving}
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={createOpen} onClose={() => (!createSaving ? setCreateOpen(false) : undefined)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Intervention</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5, mt: 1 }}>
            <TextField
              label="Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              size="small"
              disabled={createSaving}
              required
            />
            <TextField
              label="Staff ID (optional for admin)"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              size="small"
              disabled={createSaving || user?.role !== 'admin'}
              helperText={user?.role === 'admin' ? 'Leave empty to assign to your account' : 'Assigned automatically from your account'}
            />
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              disabled={createSaving}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">Intervention Type</Typography>
              <Select
                fullWidth
                size="small"
                value={interventionType}
                onChange={(e) => setInterventionType(e.target.value as InterventionItem['intervention_type'])}
                disabled={createSaving}
              >
                {interventionTypeOptions.map((option) => (
                  <MenuItem key={option} value={option}>{toLabel(option)}</MenuItem>
                ))}
              </Select>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Select
                fullWidth
                size="small"
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value as InterventionItem['status'])}
                disabled={createSaving}
              >
                {interventionStatusOptions.map((option) => (
                  <MenuItem key={option} value={option}>{toLabel(option)}</MenuItem>
                ))}
              </Select>
            </Box>
            <TextField
              label="Description"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              size="small"
              multiline
              minRows={3}
              disabled={createSaving}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={createSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createSaving}>
            {createSaving ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => (!editSaving ? setEditOpen(false) : undefined)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Intervention</DialogTitle>
        <DialogContent>
          {!editingItem ? null : (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.5, mt: 1 }}>
              <TextField label="Intervention ID" size="small" value={editingItem.intervention_id} disabled />
              <TextField label="Student ID" size="small" value={editingItem.student_id} disabled />
              <TextField label="Current Course" size="small" value={String(editingItem.course ?? '-')} disabled />
              <TextField label="Current Risk Level" size="small" value={toLabel(editingItem.risk_level || 'unknown')} disabled />
              <TextField
                label="Staff ID"
                size="small"
                value={editStaffId}
                onChange={(e) => setEditStaffId(e.target.value)}
                disabled={editSaving || user?.role !== 'admin'}
                helperText={user?.role === 'admin' ? 'Optional for admin' : 'Staff assignment is locked for non-admin users'}
              />
              <Box>
                <Typography variant="caption" color="text.secondary">Intervention Type</Typography>
                <Select
                  fullWidth
                  size="small"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as InterventionItem['intervention_type'])}
                  disabled={editSaving}
                >
                  {interventionTypeOptions.map((option) => (
                    <MenuItem key={option} value={option}>{toLabel(option)}</MenuItem>
                  ))}
                </Select>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Select
                  fullWidth
                  size="small"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as InterventionItem['status'])}
                  disabled={editSaving}
                >
                  {interventionStatusOptions.map((option) => (
                    <MenuItem key={option} value={option}>{toLabel(option)}</MenuItem>
                  ))}
                </Select>
              </Box>
              <TextField
                label="Date"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                disabled={editSaving}
              />
              <TextField
                label="Notes"
                size="small"
                multiline
                minRows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={editSaving}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={editSaving || !editingItem}>
            {editSaving ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => (!deleteSaving ? setDeleteOpen(false) : undefined)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Intervention</DialogTitle>
        <DialogContent>
          {!deleteTarget ? null : (
            <Typography variant="body2" color="text.secondary">
              Remove intervention <strong>{deleteTarget.intervention_id}</strong> for student <strong>{deleteTarget.student_id}</strong>? This action cannot be undone.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleteSaving}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleteSaving || !deleteTarget}>
            {deleteSaving ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

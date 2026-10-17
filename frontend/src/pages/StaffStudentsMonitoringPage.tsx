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
  Divider,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';

import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage, staffApi } from '../services/api.service';
import { StaffStudentRow } from '../types/monitoring.types';

const normalizeRiskLevel = (value: string): 'high' | 'medium' | 'low' => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('high')) return 'high';
  if (normalized.includes('medium')) return 'medium';
  return 'low';
};

const riskColorByLevel = (value: string): 'error' | 'warning' | 'success' => {
  const level = normalizeRiskLevel(value);
  if (level === 'high') return 'error';
  if (level === 'medium') return 'warning';
  return 'success';
};

export const StaffStudentsMonitoringPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const backPath = user?.role === 'admin' ? '/admin' : '/staff';

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<StaffStudentRow[]>([]);
  const [total, setTotal] = useState(0);

  const [riskLevel, setRiskLevel] = useState('');
  const [course, setCourse] = useState('');
  const [search, setSearch] = useState('');

  const summary = useMemo(() => {
    const high = rows.filter((row) => normalizeRiskLevel(row.risk_level) === 'high').length;
    const medium = rows.filter((row) => normalizeRiskLevel(row.risk_level) === 'medium').length;
    const low = rows.filter((row) => normalizeRiskLevel(row.risk_level) === 'low').length;

    return {
      high,
      medium,
      low,
      avgHighRisk: rows.length
        ? (rows.reduce((acc, row) => acc + (row.high_risk_probability || 0), 0) / rows.length) * 100
        : 0,
    };
  }, [rows]);

  const activeFilterCount = [riskLevel, course, search].filter((value) => Boolean(value)).length;

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await staffApi.getStudents({
        risk_level: riskLevel || undefined,
        course: course ? Number(course) : undefined,
        search: search || undefined,
        skip: 0,
        limit: 100,
      });
      setRows(response.items || []);
      setTotal(response.total || 0);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load students'));
    } finally {
      setLoading(false);
    }
  }, [course, riskLevel, search]);

  const resetFilters = () => {
    setRiskLevel('');
    setCourse('');
    setSearch('');
  };

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
              Student Monitoring
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track cohort risk signals with filters, quick counts, and probability trends.
            </Typography>
          </Box>
          <Button component={RouterLink} to={backPath} variant="outlined">
            Back to Dashboard
          </Button>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            borderColor: alpha(theme.palette.primary.main, 0.25),
            backgroundColor: alpha(theme.palette.background.default, 0.45),
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Filters
            </Typography>
            <Chip
              size="small"
              label={activeFilterCount > 0 ? `${activeFilterCount} active` : 'No active filters'}
              color={activeFilterCount > 0 ? 'primary' : 'default'}
              variant="outlined"
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.4fr auto auto' }, gap: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Risk Level
              </Typography>
              <Select fullWidth value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} size="small">
                <MenuItem value="">All levels</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </Box>
            <TextField
              label="Course"
              type="number"
              size="small"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. 171"
            />
            <TextField
              label="Student ID"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID"
            />
            <Button variant="contained" onClick={loadStudents} sx={{ minWidth: 130 }}>
              Apply
            </Button>
            <Button variant="outlined" onClick={resetFilters} sx={{ minWidth: 110 }}>
              Reset
            </Button>
          </Box>

          {activeFilterCount > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
              {riskLevel && <Chip size="small" label={`Risk: ${riskLevel}`} color="primary" />}
              {course && <Chip size="small" label={`Course: ${course}`} color="primary" />}
              {search && <Chip size="small" label={`Student: ${search}`} color="primary" />}
            </Box>
          )}
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' },
            gap: 1.5,
            mb: 3,
          }}
        >
          <Card sx={{ border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}` }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Matched</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{total}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ border: `1px solid ${alpha(theme.palette.error.main, 0.25)}` }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">High Risk</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.error.main }}>{summary.high}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}` }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Medium Risk</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.warning.main }}>{summary.medium}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ border: `1px solid ${alpha(theme.palette.success.main, 0.25)}` }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Low Risk</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.success.main }}>{summary.low}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ border: `1px solid ${alpha(theme.palette.info.main, 0.25)}` }}>
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Avg High-Risk %</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{summary.avgHighRisk.toFixed(1)}%</Typography>
            </CardContent>
          </Card>
        </Box>

        <Divider sx={{ mb: 2, borderColor: alpha(theme.palette.divider, 0.15) }} />

        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={20} />
            <Typography>Loading students...</Typography>
          </Box>
        ) : rows.length === 0 ? (
          <Alert severity="info">No students found for selected filters.</Alert>
        ) : (
          <TableContainer
            sx={{
              maxHeight: 560,
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              borderRadius: 2,
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Risk Level</TableCell>
                  <TableCell>High Risk Probability</TableCell>
                  <TableCell>Last Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const probabilityPct = (row.high_risk_probability || 0) * 100;
                  return (
                    <TableRow
                      key={row.student_id}
                      hover
                      sx={{
                        '&:nth-of-type(odd)': {
                          backgroundColor: alpha(theme.palette.background.default, 0.2),
                        },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700 }}>{row.student_id}</TableCell>
                      <TableCell>{row.course ?? '-'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={riskColorByLevel(row.risk_level)}
                          label={normalizeRiskLevel(row.risk_level).toUpperCase()}
                          sx={{ minWidth: 78, fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 170 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: '100%' }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(Math.max(probabilityPct, 0), 100)}
                              color={riskColorByLevel(row.risk_level)}
                              sx={{ height: 8, borderRadius: 999 }}
                            />
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 52, textAlign: 'right' }}>
                            {probabilityPct.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

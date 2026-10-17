import React, { useEffect, useState } from 'react';
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
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
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
  Close as CloseIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

import { getApiErrorMessage, staffApi, studentApi } from '../services/api.service';
import { StaffHistoryRow } from '../types/monitoring.types';
import { RiskExplanation } from '../types/student.types';

const normalizeRisk = (value: string): 'high' | 'medium' | 'low' | 'unknown' => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'high' || normalized === 'dropout') return 'high';
  if (normalized === 'medium' || normalized === 'enrolled') return 'medium';
  if (normalized === 'low' || normalized === 'graduate') return 'low';
  return 'unknown';
};

const displayRisk = (value: string): string => {
  const normalized = normalizeRisk(value);
  if (normalized === 'high') return 'High';
  if (normalized === 'medium') return 'Medium';
  if (normalized === 'low') return 'Low';
  return value || 'Unknown';
};

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const PredictionHistoryDashboardPage: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();

  const [historyRows, setHistoryRows] = useState<StaffHistoryRow[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historySearch, setHistorySearch] = useState('');
  const [historyRiskLevel, setHistoryRiskLevel] = useState('');
  const [historyCourse, setHistoryCourse] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyCounts, setHistoryCounts] = useState({ low: 0, medium: 0, high: 0 });

  const [selectedHistory, setSelectedHistory] = useState<StaffHistoryRow | null>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<RiskExplanation | null>(null);

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

  const applyHistoryResponse = (historyData: {
    total: number;
    low_count: number;
    medium_count: number;
    high_count: number;
    items: StaffHistoryRow[];
  }) => {
    setHistoryRows(historyData.items || []);
    setHistoryTotal(historyData.total || 0);
    setHistoryCounts({
      low: historyData.low_count || 0,
      medium: historyData.medium_count || 0,
      high: historyData.high_count || 0,
    });
  };

  const loadHistory = async (filters?: { search?: string; riskLevel?: string; course?: string }) => {
    const resolvedSearch = (filters?.search ?? historySearch).trim();
    const resolvedRiskLevel = (filters?.riskLevel ?? historyRiskLevel).trim().toLowerCase();
    const resolvedCourse = (filters?.course ?? historyCourse).trim();

    setHistoryLoading(true);
    try {
      const historyData = await staffApi.getHistory({
        search: resolvedSearch || undefined,
        risk_level: resolvedRiskLevel || undefined,
        course: resolvedCourse ? Number(resolvedCourse) : undefined,
        limit: 100,
      });
      applyHistoryResponse(historyData);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load prediction history'));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory({});
  }, []);

  const activeHistoryFilterCount = [historySearch, historyRiskLevel, historyCourse].filter((value) => Boolean(value)).length;

  const historyCards = [
    { label: 'Low Risk', value: historyCounts.low, color: theme.palette.success.main },
    { label: 'Medium Risk', value: historyCounts.medium, color: theme.palette.warning.main },
    { label: 'High Risk', value: historyCounts.high, color: theme.palette.error.main },
  ];

  const handleOpenExplanation = async (row: StaffHistoryRow) => {
    setSelectedHistory(row);
    setExplanationOpen(true);
    setExplanationLoading(true);
    setExplanationError(null);
    setExplanation(null);

    try {
      const explanationData = await studentApi.getRiskExplanation(row.student_id);
      setExplanation(explanationData);
    } catch (error) {
      setExplanationError(getApiErrorMessage(error, 'Failed to load prediction explanation'));
    } finally {
      setExplanationLoading(false);
    }
  };

  const handleCloseExplanation = () => {
    setExplanationOpen(false);
    setSelectedHistory(null);
    setExplanation(null);
    setExplanationError(null);
  };

  const probabilityRows = selectedHistory
    ? Object.entries(selectedHistory.risk_probabilities || {})
        .filter(([, value]) => typeof value === 'number')
        .map(([key, value]) => ({ key, value }))
    : [];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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

      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.14)}`,
          background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Prediction History Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          View all students history with confidence and explanation details.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.3fr auto auto' },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          <Select
            fullWidth
            size="small"
            value={historyRiskLevel}
            onChange={(event) => setHistoryRiskLevel(event.target.value)}
            displayEmpty
          >
            <MenuItem value="">All risk levels</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
          <TextField
            size="small"
            type="number"
            label="Course"
            placeholder="e.g. 171"
            value={historyCourse}
            onChange={(event) => setHistoryCourse(event.target.value)}
          />
          <TextField
            size="small"
            label="Search Student History"
            placeholder="Student ID"
            value={historySearch}
            onChange={(event) => setHistorySearch(event.target.value)}
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={() => loadHistory()}
            disabled={historyLoading}
          >
            {historyLoading ? 'Loading...' : 'Load History'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setHistorySearch('');
              setHistoryRiskLevel('');
              setHistoryCourse('');
              loadHistory({ search: '', riskLevel: '', course: '' });
            }}
            disabled={historyLoading}
          >
            Reset
          </Button>
        </Box>

        {activeHistoryFilterCount > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {historyRiskLevel && <Chip size="small" color="primary" label={`Risk: ${historyRiskLevel}`} />}
            {historyCourse && <Chip size="small" color="primary" label={`Course: ${historyCourse}`} />}
            {historySearch && <Chip size="small" color="primary" label={`Student: ${historySearch}`} />}
            <Chip size="small" variant="outlined" label={`${activeHistoryFilterCount} active filters`} />
          </Box>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
            mb: 2,
          }}
        >
          {historyCards.map((card) => (
            <Card
              key={card.label}
              sx={{
                borderRadius: 2.5,
                border: `1px solid ${alpha(card.color, 0.25)}`,
                background: `linear-gradient(130deg, ${alpha(card.color, 0.22)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
              }}
            >
              <CardContent sx={{ py: 2.25 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.label}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2.5,
            border: `1px solid ${alpha(theme.palette.divider, 0.16)}`,
            maxHeight: 420,
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Student ID</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell>Risk Level</TableCell>
                <TableCell align="right">Confidence</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historyLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
                      <CircularProgress size={18} />
                      <Typography variant="body2">Loading prediction history...</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : historyRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                      No history records found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                historyRows.map((row) => {
                  const confidencePct = Math.max(0, Math.min(100, row.confidence * 100));
                  const normalized = normalizeRisk(row.risk_level);
                  const chipColor = normalized === 'high' ? 'error' : normalized === 'medium' ? 'warning' : 'success';
                  return (
                    <TableRow key={row.prediction_id} hover>
                      <TableCell>{row.student_id}</TableCell>
                      <TableCell>{row.course ?? '-'}</TableCell>
                      <TableCell>{formatDateTime(row.created_at)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={displayRisk(row.risk_level)} color={chipColor} variant="outlined" />
                      </TableCell>
                      <TableCell align="right">{confidencePct.toFixed(1)}%</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'inline-flex', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleOpenExplanation(row)}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            component={RouterLink}
                            to={`/staff/explain/${encodeURIComponent(row.student_id)}`}
                          >
                            Explanation
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>
          Showing {historyRows.length} of {historyTotal} history records.
        </Typography>
      </Paper>

      <Dialog open={explanationOpen} onClose={handleCloseExplanation} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
            background: `linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.26)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Prediction Explanation
          </Typography>
          <IconButton onClick={handleCloseExplanation} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {!selectedHistory ? null : explanationLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
              <CircularProgress size={20} />
              <Typography>Loading explanation...</Typography>
            </Box>
          ) : explanationError ? (
            <Alert severity="error">{explanationError}</Alert>
          ) : (
            <Box>
              <Box sx={{ mb: 2.25 }}>
                <Typography variant="body2" color="text.secondary">Student ID</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{selectedHistory.student_id}</Typography>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Date & Time</Typography>
                  <Typography variant="body1">{formatDateTime(selectedHistory.created_at)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Risk Level</Typography>
                  <Chip
                    size="small"
                    label={displayRisk(selectedHistory.risk_level)}
                    color={normalizeRisk(selectedHistory.risk_level) === 'high' ? 'error' : normalizeRisk(selectedHistory.risk_level) === 'medium' ? 'warning' : 'success'}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Confidence</Typography>
                  <Typography variant="body1">{(Math.max(0, Math.min(100, selectedHistory.confidence * 100))).toFixed(1)}%</Typography>
                </Box>
              </Box>

              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.25 }}>
                Probability Breakdown
              </Typography>
              <Box sx={{ mb: 2 }}>
                {probabilityRows.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No probability breakdown found.</Typography>
                ) : (
                  probabilityRows.map((entry) => {
                    const percent = Math.max(0, Math.min(100, entry.value * 100));
                    return (
                      <Box key={entry.key} sx={{ mb: 1.25 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{entry.key}</Typography>
                          <Typography variant="body2">{percent.toFixed(1)}%</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percent}
                          sx={{ height: 8, borderRadius: 999 }}
                          color={entry.key.toLowerCase().includes('dropout') || entry.key.toLowerCase().includes('high') ? 'error' : entry.key.toLowerCase().includes('enrolled') || entry.key.toLowerCase().includes('medium') ? 'warning' : 'success'}
                        />
                      </Box>
                    );
                  })
                )}
              </Box>

              {explanation ? (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Key Guidance
                  </Typography>
                  {explanation.top_risk_factors.slice(0, 3).map((factor, index) => (
                    <Typography key={`${factor.feature}-${index}`} variant="body2" sx={{ mb: 0.75 }}>
                      {factor.feature.replace(/_/g, ' ')}: {factor.advice}
                    </Typography>
                  ))}
                </>
              ) : null}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

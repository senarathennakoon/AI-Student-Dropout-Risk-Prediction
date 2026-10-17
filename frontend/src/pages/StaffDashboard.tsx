import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  LinearProgress,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Tabs,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  AutoGraph as AutoGraphIcon,
  Groups as GroupsIcon,
  Insights as InsightsIcon,
  TrendingUp as TrendingUpIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'react-toastify';

import { getApiErrorMessage, staffApi } from '../services/api.service';
import { MonthlyTrendRow, RiskDistributionRow } from '../types/monitoring.types';

interface StaffSummary {
  total_students: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  integrated_from?: string;
}

interface HighRiskStudent {
  student_id: string;
  course: number | string | null;
  risk_level: string;
  high_risk_probability: number;
}

interface CourseAnalytics {
  course_id: number | string;
  total_students: number;
  high_risk_count: number;
  avg_high_risk_probability: number;
}

const normalizeRiskLevel = (value: string): 'high' | 'medium' | 'low' => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('high') || normalized.includes('dropout')) return 'high';
  if (normalized.includes('medium') || normalized.includes('enrolled')) return 'medium';
  return 'low';
};

const riskChipColor = (value: string): 'error' | 'warning' | 'success' => {
  const normalized = normalizeRiskLevel(value);
  if (normalized === 'high') return 'error';
  if (normalized === 'medium') return 'warning';
  return 'success';
};

const toTitleCase = (value: string): string => {
  if (!value) return 'Unknown';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export const StaffDashboard: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();

  const riskSliceColor = (riskLevel: string): string => {
    const normalized = (riskLevel || '').toLowerCase();
    if (normalized.includes('high')) return theme.palette.error.main;
    if (normalized.includes('medium')) return theme.palette.warning.main;
    if (normalized.includes('low')) return theme.palette.success.main;
    return theme.palette.primary.main;
  };

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StaffSummary | null>(null);
  const [highRiskStudents, setHighRiskStudents] = useState<HighRiskStudent[]>([]);
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalytics[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<RiskDistributionRow[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrendRow[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [summaryData, highRiskData, courseData, riskData, trendData] = await Promise.all([
          staffApi.getDashboard(),
          staffApi.getHighRiskStudents(10),
          staffApi.getCourseAnalytics(10),
          staffApi.getRiskDistribution(),
          staffApi.getMonthlyTrends(6),
        ]);

        setSummary(summaryData);
        setHighRiskStudents(highRiskData || []);
        setCourseAnalytics(courseData || []);
        setRiskDistribution(riskData || []);
        setMonthlyTrends(trendData || []);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to load staff dashboard'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const totalRiskTracked = (summary?.high_risk ?? 0) + (summary?.medium_risk ?? 0) + (summary?.low_risk ?? 0);

  const cards = [
    {
      label: 'Total Students',
      value: summary?.total_students ?? 0,
      icon: <GroupsIcon fontSize="small" />,
      color: theme.palette.primary.main,
      progress: totalRiskTracked > 0 ? ((summary?.total_students ?? 0) / totalRiskTracked) * 100 : 0,
      note: 'Cohort size',
    },
    {
      label: 'High Risk',
      value: summary?.high_risk ?? 0,
      icon: <WarningAmberIcon fontSize="small" />,
      color: theme.palette.error.main,
      progress: totalRiskTracked > 0 ? ((summary?.high_risk ?? 0) / totalRiskTracked) * 100 : 0,
      note: 'Needs immediate follow-up',
    },
    {
      label: 'Medium Risk',
      value: summary?.medium_risk ?? 0,
      icon: <TrendingUpIcon fontSize="small" />,
      color: theme.palette.warning.main,
      progress: totalRiskTracked > 0 ? ((summary?.medium_risk ?? 0) / totalRiskTracked) * 100 : 0,
      note: 'Monitor with interventions',
    },
    {
      label: 'Low Risk',
      value: summary?.low_risk ?? 0,
      icon: <AutoGraphIcon fontSize="small" />,
      color: theme.palette.success.main,
      progress: totalRiskTracked > 0 ? ((summary?.low_risk ?? 0) / totalRiskTracked) * 100 : 0,
      note: 'Stable students',
    },
  ];

  const navItems = [
    { label: 'Dashboard', value: '/staff' },
    { label: 'Prediction History Dashboard', value: '/staff/prediction-history' },
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
          background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${theme.palette.background.paper} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box
          sx={{
            mb: 2,
            p: 2.5,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
            background: `linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.16)} 0%, ${alpha(theme.palette.background.default, 0.35)} 100%)`,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Staff Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time analytics for student risk, interventions, and course-level trends.
          </Typography>

          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip label="Live Risk Insights" color="secondary" variant="outlined" />
            <Chip label="Updated from model predictions" variant="outlined" />
            <Chip icon={<InsightsIcon />} label={`Tracked: ${totalRiskTracked}`} variant="outlined" />
          </Box>
        </Box>

        <Divider sx={{ mb: 3, borderColor: alpha(theme.palette.divider, 0.2) }} />

        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={20} />
            <Typography>Loading staff analytics...</Typography>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              {cards.map((card) => (
                <Card
                  key={card.label}
                  sx={{
                    borderRadius: 3,
                    border: `1px solid ${alpha(card.color, 0.28)}`,
                    background: `linear-gradient(155deg, ${alpha(card.color, 0.16)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {card.label}
                      </Typography>
                      <Chip
                        size="small"
                        icon={card.icon}
                        label={`${Math.max(0, Math.min(100, card.progress)).toFixed(0)}%`}
                        sx={{ borderColor: alpha(card.color, 0.45), color: card.color }}
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.75, color: card.color }}>
                      {card.value}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.max(0, Math.min(100, card.progress))}
                      sx={{
                        mb: 1,
                        height: 8,
                        borderRadius: 999,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: card.color,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {card.note}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              <Card sx={{ border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Risk Distribution
                    </Typography>
                    <Chip size="small" label="Current Snapshot" variant="outlined" />
                  </Box>
                  {riskDistribution.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No distribution data available.
                    </Typography>
                  ) : (
                    <Box sx={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={riskDistribution}
                            dataKey="count"
                            nameKey="risk_level"
                            cx="50%"
                            cy="50%"
                            outerRadius={85}
                            label
                          >
                            {riskDistribution.map((entry, index) => (
                              <Cell key={`risk-slice-${entry.risk_level}-${index}`} fill={riskSliceColor(entry.risk_level)} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Card sx={{ border: `1px solid ${alpha(theme.palette.secondary.main, 0.22)}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Monthly Trends
                    </Typography>
                    <Chip size="small" label="Last 6 Months" variant="outlined" />
                  </Box>
                  {monthlyTrends.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No monthly trend data available.
                    </Typography>
                  ) : (
                    <Box sx={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer>
                        <LineChart data={monthlyTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="high" stroke={theme.palette.error.main} strokeWidth={2} />
                          <Line type="monotone" dataKey="medium" stroke={theme.palette.warning.main} strokeWidth={2} />
                          <Line type="monotone" dataKey="low" stroke={theme.palette.success.main} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              High Risk Students
            </Typography>
            {highRiskStudents.length === 0 ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                No high risk students found.
              </Alert>
            ) : (
              <TableContainer
                component={Paper}
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.22)}`,
                  maxHeight: 360,
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student ID</TableCell>
                      <TableCell>Course</TableCell>
                      <TableCell>Risk Level</TableCell>
                      <TableCell align="right">High Risk Probability</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {highRiskStudents.map((student) => {
                      const probabilityPct = student.high_risk_probability * 100;
                      return (
                        <TableRow
                          key={student.student_id}
                          hover
                          sx={{
                            '&:nth-of-type(odd)': {
                              backgroundColor: alpha(theme.palette.background.default, 0.16),
                            },
                          }}
                        >
                          <TableCell>{student.student_id}</TableCell>
                          <TableCell>{student.course ?? '-'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={toTitleCase(student.risk_level)}
                              color={riskChipColor(student.risk_level)}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                              <Box sx={{ minWidth: 100 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.max(0, Math.min(100, probabilityPct))}
                                  color={probabilityPct >= 70 ? 'error' : 'warning'}
                                  sx={{ height: 8, borderRadius: 999 }}
                                />
                              </Box>
                              <Typography variant="body2" sx={{ minWidth: 44, textAlign: 'right' }}>
                                {probabilityPct.toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              Course Analytics
            </Typography>
            {courseAnalytics.length === 0 ? (
              <Alert severity="info">No course analytics available.</Alert>
            ) : (
              <>
                <Box sx={{ width: '100%', height: 260, mb: 2 }}>
                  <ResponsiveContainer>
                    <BarChart data={courseAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="course_id" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total_students" fill={theme.palette.primary.main} />
                      <Bar dataKey="high_risk_count" fill={theme.palette.error.main} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>

                <TableContainer
                  component={Paper}
                  sx={{
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.24)}`,
                    maxHeight: 360,
                  }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Course</TableCell>
                        <TableCell align="right">Students</TableCell>
                        <TableCell align="right">High Risk Count</TableCell>
                        <TableCell align="right">Avg High Risk Probability</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {courseAnalytics.map((course) => (
                        <TableRow
                          key={`${course.course_id}`}
                          hover
                          sx={{
                            '&:nth-of-type(odd)': {
                              backgroundColor: alpha(theme.palette.background.default, 0.16),
                            },
                          }}
                        >
                          <TableCell>{course.course_id}</TableCell>
                          <TableCell align="right">{course.total_students}</TableCell>
                          <TableCell align="right">{course.high_risk_count}</TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                              <Box sx={{ minWidth: 110 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.max(0, Math.min(100, (course.avg_high_risk_probability || 0) * 100))}
                                  color={(course.avg_high_risk_probability || 0) >= 0.5 ? 'error' : 'warning'}
                                  sx={{ height: 8, borderRadius: 999 }}
                                />
                              </Box>
                              <Typography variant="body2" sx={{ minWidth: 44, textAlign: 'right' }}>
                                {(course.avg_high_risk_probability * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        )}
      </Paper>

    </Container>
  );
};

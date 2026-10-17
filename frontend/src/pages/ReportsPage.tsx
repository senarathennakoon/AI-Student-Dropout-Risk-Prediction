import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Tabs,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage, reportApi } from '../services/api.service';
import { AnalyticsReportItem, StudentReportRow } from '../types/monitoring.types';

type ReportType = AnalyticsReportItem['report_type'];

const reportTypes: ReportType[] = ['risk_summary', 'course_breakdown', 'monthly_trends'];

export const ReportsPage: React.FC = () => {
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
  const [studentLoading, setStudentLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingAllCsv, setDownloadingAllCsv] = useState(false);
  const [downloadingStudentCsv, setDownloadingStudentCsv] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<ReportType>('risk_summary');
  const [studentIdSearch, setStudentIdSearch] = useState('');

  const [reports, setReports] = useState<AnalyticsReportItem[]>([]);
  const [studentReports, setStudentReports] = useState<StudentReportRow[]>([]);

  const hasStudentFilter = useMemo(() => studentIdSearch.trim().length > 0, [studentIdSearch]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const result = await reportApi.list({ skip: 0, limit: 100 });
      setReports(result.items || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load reports'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStudentReports = useCallback(async (studentId?: string) => {
    setStudentLoading(true);
    try {
      const result = await reportApi.listStudentReports({
        student_id: studentId && studentId.trim() ? studentId.trim() : undefined,
        skip: 0,
        limit: 200,
      });
      setStudentReports(result.items || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load student reports'));
    } finally {
      setStudentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    loadStudentReports();
  }, [loadReports, loadStudentReports]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const report = await reportApi.generate({ report_type: reportType });
      toast.success('Report generated successfully');
      setReports((current) => [report, ...current]);
      await loadReports();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to generate report'));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleAllReportsCsv = async () => {
    try {
      setDownloadingAllCsv(true);
      const csvBlob = await reportApi.downloadCsv();
      handleDownload(csvBlob, 'analytics_reports.csv');
      toast.success('All reports CSV downloaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to download all reports CSV'));
    } finally {
      setDownloadingAllCsv(false);
    }
  };

  const handleStudentReportsCsv = async () => {
    try {
      setDownloadingStudentCsv(true);
      const csvBlob = await reportApi.downloadStudentCsv({
        student_id: studentIdSearch.trim() || undefined,
      });
      handleDownload(csvBlob, hasStudentFilter ? `student_${studentIdSearch.trim()}_reports.csv` : 'student_reports.csv');
      toast.success('Student reports CSV downloaded');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to download student reports CSV'));
    } finally {
      setDownloadingStudentCsv(false);
    }
  };

  const handleSingleReportDownload = async (report: AnalyticsReportItem) => {
    try {
      setDownloadingReportId(report.report_id);
      const csvBlob = await reportApi.downloadByIdCsv(report.report_id);
      handleDownload(csvBlob, `${report.report_id}.csv`);
      toast.success(`Report ${report.report_id} downloaded`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to download report'));
    } finally {
      setDownloadingReportId(null);
    }
  };

  const handleStudentSearch = async () => {
    await loadStudentReports(studentIdSearch);
  };

  const handleClearSearch = async () => {
    setStudentIdSearch('');
    await loadStudentReports();
  };

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
              Analytics Reports
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generate and review persisted risk monitoring reports.
            </Typography>
          </Box>
          <Button component={RouterLink} to={backPath} variant="outlined">
            Back to Dashboard
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
          <Select
            value={reportType}
            size="small"
            onChange={(e) => setReportType(e.target.value as ReportType)}
          >
            {reportTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
          <Button variant="contained" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleAllReportsCsv}
            disabled={downloadingAllCsv}
          >
            {downloadingAllCsv ? 'Downloading...' : 'Download All Reports CSV'}
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          Student Reports
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Search by Student ID"
            size="small"
            value={studentIdSearch}
            onChange={(event) => setStudentIdSearch(event.target.value)}
            sx={{ minWidth: 260 }}
          />
          <Button variant="contained" onClick={handleStudentSearch}>
            Search
          </Button>
          <Button variant="text" onClick={handleClearSearch}>
            Clear
          </Button>
          <Button
            variant="outlined"
            onClick={handleStudentReportsCsv}
            disabled={downloadingStudentCsv}
          >
            {downloadingStudentCsv ? 'Downloading...' : 'Download Student CSV'}
          </Button>
        </Box>

        {studentLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={20} />
            <Typography>Loading student reports...</Typography>
          </Box>
        ) : studentReports.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            No student reports found for the current filter.
          </Alert>
        ) : (
          <TableContainer sx={{ mb: 3, maxHeight: 360 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Prediction ID</TableCell>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Risk Level</TableCell>
                  <TableCell>High Risk Probability</TableCell>
                  <TableCell>Risk Factors</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {studentReports.map((report) => (
                  <TableRow key={report.prediction_id} hover>
                    <TableCell>{report.prediction_id}</TableCell>
                    <TableCell>{report.student_id}</TableCell>
                    <TableCell>{report.course ?? '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={report.risk_level}
                        color={
                          report.risk_level === 'HIGH'
                            ? 'error'
                            : report.risk_level === 'MEDIUM'
                            ? 'warning'
                            : 'success'
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{(report.high_risk_probability * 100).toFixed(1)}%</TableCell>
                    <TableCell>{report.top_risk_factors.length ? report.top_risk_factors.join(', ') : '-'}</TableCell>
                    <TableCell>{new Date(report.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          All Generated Reports
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={20} />
            <Typography>Loading reports...</Typography>
          </Box>
        ) : reports.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No reports available yet.
          </Alert>
        ) : (
          <TableContainer sx={{ maxHeight: 320 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Generated By</TableCell>
                  <TableCell>Generated Date</TableCell>
                  <TableCell>Data Preview</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.report_id} hover>
                    <TableCell>{report.report_id}</TableCell>
                    <TableCell>{report.report_type}</TableCell>
                    <TableCell>{report.generated_by}</TableCell>
                    <TableCell>{new Date(report.generated_date).toLocaleString()}</TableCell>
                    <TableCell>{Object.keys(report.data || {}).join(', ') || '-'}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleSingleReportDownload(report)}
                        disabled={downloadingReportId === report.report_id}
                      >
                        {downloadingReportId === report.report_id ? 'Downloading...' : 'Download'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

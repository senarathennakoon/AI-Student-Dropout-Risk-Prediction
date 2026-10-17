import React, { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AutoGraph as AutoGraphIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { getApiErrorMessage, studentApi } from '../services/api.service';
import { RiskExplanation } from '../types/student.types';

const confidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'success';
  if (confidence >= 0.6) return 'warning';
  return 'error';
};

type ImpactCategory = 'High Impact' | 'Medium Impact' | 'Low Impact';

const getImpactCategory = (impact: number): ImpactCategory => {
  const absImpact = Math.abs(impact);
  if (absImpact >= 0.1) return 'High Impact';
  if (absImpact >= 0.05) return 'Medium Impact';
  return 'Low Impact';
};

const getFactorIcon = (feature: string): string => {
  const normalized = feature.toLowerCase();

  if (normalized.includes('tuition') || normalized.includes('debtor') || normalized.includes('financial')) return '💰';
  if (normalized.includes('academic') || normalized.includes('grade') || normalized.includes('approved')) return '⭐';
  if (normalized.includes('risk_score') || normalized.includes('risk')) return '⚠️';
  if (normalized.includes('age')) return '🎂';
  if (normalized.includes('success')) return '📈';
  if (normalized.includes('failure')) return '📉';
  return '📌';
};

const getDetailedExplanation = (feature: string): string => {
  const detailsMap: Record<string, string> = {
    academic_performance_score:
      'Academic performance combines your semester grades and pass rates. Strong performance usually lowers dropout risk, while repeated low performance increases pressure and disengagement.',
    age_at_enrollment:
      'Age can influence study-life balance. Students with additional work or family responsibilities may face time constraints that affect consistency and attendance.',
    tuition_fees_up_to_date:
      'Tuition payment consistency is linked to enrollment stability. Delays can create stress, administrative restrictions, and reduced focus on academics.',
    risk_score:
      'Risk score is a combined indicator derived from key academic and financial signals. A higher score means multiple warning signals are present at the same time.',
    failure_rate_sem1:
      'First-semester failure rate reflects early adjustment challenges. Early failures can compound in later semesters if not addressed with support.',
    failure_rate_sem2:
      'Second-semester failure rate indicates continuing academic difficulty. Sustained failures often increase dropout probability without intervention.',
    success_rate_sem1:
      'First-semester success rate shows foundational academic adaptation. Strong early success tends to improve confidence and continuation.',
    success_rate_sem2:
      'Second-semester success rate reflects ongoing academic stability. Higher success supports retention and progression.',
  };

  return (
    detailsMap[feature] ||
    'This factor contributes to the model prediction based on historical patterns. Improving this area can help lower overall dropout risk.'
  );
};

const toFriendlyRecommendation = (feature: string, advice: string, isRiskFactor: boolean): string => {
  const friendlyByFeature: Record<string, string> = {
    tuition_fees_up_to_date: 'Ensure tuition payments are completed on time to reduce financial risk.',
    academic_performance_score: 'Follow a weekly study plan and seek tutor support early to improve academic performance.',
    failure_rate_sem1: 'Review first-semester weak subjects with your advisor and create a focused recovery plan.',
    failure_rate_sem2: 'Prioritize struggling second-semester modules and attend extra support sessions consistently.',
    success_rate_sem1: 'Maintain strong first-semester momentum by continuing effective study habits.',
    success_rate_sem2: 'Protect your second-semester progress by keeping attendance and assignment submission consistent.',
    age_at_enrollment: 'Use time-management and advising support to balance academic and personal responsibilities.',
    risk_score: 'Address the highest-priority risk areas first to reduce your overall dropout risk gradually.',
  };

  if (friendlyByFeature[feature]) return friendlyByFeature[feature];
  if (advice && !advice.toLowerCase().startsWith('monitor and improve')) return advice;
  if (isRiskFactor) {
    return `Take targeted action to improve ${feature.replace(/_/g, ' ')} and reduce risk over time.`;
  }
  return `Continue maintaining strong ${feature.replace(/_/g, ' ')} to support long-term success.`;
};

export const StaffRiskExplanationPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId } = useParams<{ studentId?: string }>();

  const [searchInput, setSearchInput] = useState(studentId || '');
  const [loading, setLoading] = useState(false);
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

  const loadExplanation = async (targetStudentId: string) => {
    setLoading(true);
    try {
      const data = await studentApi.getRiskExplanation(targetStudentId);
      setExplanation(data);
    } catch (error) {
      setExplanation(null);
      toast.error(getApiErrorMessage(error, 'Failed to load risk explanation'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchInput(studentId || '');
    if (studentId) {
      loadExplanation(studentId);
    } else {
      setExplanation(null);
    }
  }, [studentId]);

  const confidencePct = useMemo(() => {
    if (!explanation) return 0;
    return Math.max(0, Math.min(100, explanation.confidence * 100));
  }, [explanation]);

  const riskFactors = explanation?.top_risk_factors || [];
  const protectiveFactors = explanation?.top_protective_factors || [];

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) {
      toast.error('Enter a student ID to search');
      return;
    }
    navigate(`/staff/explain/${encodeURIComponent(trimmed)}`);
  };

  const handleClear = () => {
    setSearchInput('');
    setExplanation(null);
    navigate('/staff/explain');
  };

  const renderFactorItem = (
    factor: { feature: string; impact: number; advice: string },
    isRiskFactor: boolean,
    index: number,
  ) => {
    const category = getImpactCategory(factor.impact);
    const isHighImpact = category === 'High Impact';
    const displayName = factor.feature.replace(/_/g, ' ');
    const recommendation = toFriendlyRecommendation(factor.feature, factor.advice, isRiskFactor);
    const icon = getFactorIcon(factor.feature);

    return (
      <Paper
        key={`${factor.feature}-${index}`}
        variant="outlined"
        sx={{
          mb: index === (isRiskFactor ? riskFactors.length - 1 : protectiveFactors.length - 1) ? 0 : 1.5,
          borderRadius: 2,
          borderColor: isRiskFactor
            ? alpha(theme.palette.error.main, 0.35)
            : alpha(theme.palette.success.main, 0.35),
          backgroundColor: isRiskFactor
            ? alpha(theme.palette.error.main, 0.08)
            : alpha(theme.palette.success.main, 0.08),
        }}
      >
        <Box sx={{ p: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {icon} {displayName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={category}
                color={isHighImpact ? (isRiskFactor ? 'error' : 'success') : 'default'}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                size="small"
                label={`Impact ${isRiskFactor ? '+' : ''}${factor.impact.toFixed(4)}`}
                variant="outlined"
              />
            </Box>
          </Box>

          <Typography variant="body2" sx={{ mt: 1 }}>
            {recommendation}
          </Typography>
        </Box>

        <Accordion
          disableGutters
          elevation={0}
          sx={{
            bgcolor: 'transparent',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Click for details
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
              Impact: {isRiskFactor ? '+' : ''}{factor.impact.toFixed(4)}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.75 }}>
              Recommendation: {recommendation}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getDetailedExplanation(factor.feature)}
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Paper>
    );
  };

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
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Staff Risk Explanation Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Search any student ID and inspect the complete risk explanation view.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.6fr auto auto' },
            gap: 1.5,
            alignItems: 'center',
            mb: 2,
          }}
        >
          <TextField
            size="small"
            label="Student ID"
            placeholder="STU0001"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value.toUpperCase())}
          />
          <Button variant="contained" startIcon={<SearchIcon />} onClick={handleSearch} disabled={loading}>
            {loading ? 'Loading...' : 'Search'}
          </Button>
          <Button variant="outlined" onClick={handleClear} disabled={loading}>
            Clear
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button variant="text" startIcon={<ArrowBackIcon />} component={RouterLink} to="/staff/prediction-history">
            Back to Prediction History
          </Button>
          <Button variant="text" component={RouterLink} to="/staff">
            Back to Staff Dashboard
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${theme.palette.background.paper} 100%)`,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading explanation...</Typography>
          </Box>
        </Paper>
      ) : !studentId ? (
        <Alert severity="info">Search by student ID to view the risk explanation dashboard.</Alert>
      ) : !explanation ? (
        <Alert severity="warning">No explanation found for student {studentId}.</Alert>
      ) : (
        <>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${theme.palette.background.paper} 100%)`,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Chip label={`Student: ${explanation.student_id}`} size="small" />
              <Chip label={`Risk: ${explanation.risk_level}`} color="primary" size="small" />
              {explanation.prediction_id && <Chip label={`Prediction: ${explanation.prediction_id}`} size="small" />}
            </Box>

            <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
              {explanation.summary}
            </Typography>

            <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Confidence
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {confidencePct.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={confidencePct}
              color={confidenceColor(explanation.confidence)}
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Paper>

          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <Card
              sx={{
                background: alpha(theme.palette.error.main, 0.08),
                border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <WarningAmberIcon sx={{ color: theme.palette.error.main }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Top Risk Factors
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {riskFactors.length === 0 ? (
                  <Typography color="text.secondary">No risk factors available.</Typography>
                ) : (
                  riskFactors.map((factor, index) => renderFactorItem(factor, true, index))
                )}
              </CardContent>
            </Card>

            <Card
              sx={{
                background: alpha(theme.palette.success.main, 0.08),
                border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <CheckCircleIcon sx={{ color: theme.palette.success.main }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Top Protective Factors
                  </Typography>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {protectiveFactors.length === 0 ? (
                  <Typography color="text.secondary">No protective factors available.</Typography>
                ) : (
                  protectiveFactors.map((factor, index) => renderFactorItem(factor, false, index))
                )}
              </CardContent>
            </Card>
          </Box>

          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 2.5,
              borderRadius: 3,
              background: alpha(theme.palette.primary.main, 0.06),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AutoGraphIcon sx={{ color: theme.palette.primary.light }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Transparency Note
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Positive SHAP impact indicates factors pushing toward higher risk, while protective impacts reduce risk tendency.
            </Typography>
          </Paper>
        </>
      )}
    </Container>
  );
};

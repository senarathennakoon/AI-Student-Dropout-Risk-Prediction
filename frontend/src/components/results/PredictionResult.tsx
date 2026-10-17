import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  GridLegacy,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Divider,
  Alert,
  alpha,
  useTheme,
  Fade,
  Grow
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  School as SchoolIcon,
} from '@mui/icons-material';

interface PredictionResultProps {
  result: {
    student_id: string;
    risk_level: string;
    risk_probabilities?: {
      low?: number;
      medium?: number;
      high?: number;
      dropout?: number;
      enrolled?: number;
      graduate?: number;
    };
    top_risk_factors?: Array<{
      feature: string;
      impact: number;
      importance?: number;
    }>;
    timestamp: string;
  };
  onReset?: () => void;
  loading?: boolean;
  showActions?: boolean;
}

export const PredictionResult: React.FC<PredictionResultProps> = ({ 
  result, 
  onReset,
  loading = false,
  showActions = true
}) => {
  const theme = useTheme();

  if (!result) return null;

  const getProbabilities = () => {
    const probs = result.risk_probabilities || {};
    
    if (probs.low !== undefined) {
      return {
        low: probs.low || 0,
        medium: probs.medium || 0,
        high: probs.high || 0
      };
    } else if (probs.dropout !== undefined) {
      return {
        low: probs.graduate || 0,
        medium: probs.enrolled || 0,
        high: probs.dropout || 0
      };
    }
    
    return { low: 0, medium: 0, high: 0 };
  };

  const probabilities = getProbabilities();
  
  const getRiskMessage = () => {
    const dropoutProb = probabilities.high;
    if (dropoutProb > 0.7) {
      return {
        message: "⚠️ CRITICAL: Very high risk of dropping out! Immediate intervention required.",
        severity: "error",
        icon: <ErrorIcon />
      };
    } else if (dropoutProb > 0.5) {
      return {
        message: "⚠️ WARNING: High dropout risk. Schedule advisor meeting soon.",
        severity: "warning",
        icon: <WarningIcon />
      };
    } else if (dropoutProb > 0.3) {
      return {
        message: "⚠️ CAUTION: Moderate dropout risk. Monitor closely.",
        severity: "warning",
        icon: <WarningIcon />
      };
    } else {
      return {
        message: "✅ GOOD: Low dropout risk. Keep up the good work!",
        severity: "success",
        icon: <SuccessIcon />
      };
    }
  };

  const riskMessage = getRiskMessage();

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'low': return <SuccessIcon sx={{ fontSize: 60, color: theme.palette.success.main }} />;
      case 'medium': return <WarningIcon sx={{ fontSize: 60, color: theme.palette.warning.main }} />;
      case 'high': return <ErrorIcon sx={{ fontSize: 60, color: theme.palette.error.main }} />;
      default: return <SchoolIcon sx={{ fontSize: 60, color: theme.palette.primary.main }} />;
    }
  };

  return (
    <Grow in={true}>
      <Paper 
        elevation={0}
        sx={{ 
          p: 4, 
          borderRadius: 3,
          background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${theme.palette.background.paper} 100%)`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          maxWidth: 900,
          mx: 'auto',
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{
              fontWeight: 800,
              background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.secondary.light} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Assessment Complete
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
            <Chip
              label={`ID: ${result.student_id || 'N/A'}`}
              size="small"
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.light,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            />
            <Chip
              label={result.timestamp ? new Date(result.timestamp).toLocaleString() : 'Just now'}
              size="small"
              sx={{ 
                bgcolor: alpha(theme.palette.text.secondary, 0.1),
                color: theme.palette.text.secondary,
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 4, borderColor: alpha(theme.palette.divider, 0.1) }} />

        {/* Risk Message */}
        <Fade in={true}>
          <Alert 
  icon={riskMessage.icon}
  severity={riskMessage.severity as any}
  sx={{ 
    mb: 4,
    backgroundColor: alpha(theme.palette[riskMessage.severity as 'success' | 'warning' | 'error'].main, 0.1),
    border: `1px solid ${alpha(theme.palette[riskMessage.severity as 'success' | 'warning' | 'error'].main, 0.2)}`,
    color: theme.palette[riskMessage.severity as 'success' | 'warning' | 'error'].light,
    '& .MuiAlert-icon': {
      color: theme.palette[riskMessage.severity as 'success' | 'warning' | 'error'].light,
    },
  }}
>
            <Typography variant="body1" fontWeight={500}>
              {riskMessage.message}
            </Typography>
          </Alert>
        </Fade>

        {/* Main Result */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Card 
              sx={{ 
                height: '100%',
                background: alpha(theme.palette.background.default, 0.6),
                backdropFilter: 'blur(5px)',
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ mb: 2 }}>
                  {getRiskIcon(result.risk_level)}
                </Box>
                <Typography variant="h3" gutterBottom fontWeight="bold" sx={{ color: theme.palette.primary.light }}>
                  {result.risk_level || 'Unknown'}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Predicted Outcome
                </Typography>
                <Chip
                  label={result.risk_level || 'Unknown'}
                  color={getRiskColor(result.risk_level)}
                  sx={{ 
                    mt: 2, 
                    fontSize: '1rem', 
                    px: 3,
                    py: 2,
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card 
              sx={{ 
                height: '100%',
                background: alpha(theme.palette.background.default, 0.6),
                backdropFilter: 'blur(5px)',
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.light }}>
                  Risk Analysis
                </Typography>
                
                {/* Dropout Risk */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={600}>Dropout Risk</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: theme.palette.error.light }}>
                      {(probabilities.high * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={probabilities.high * 100}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: alpha(theme.palette.error.main, 0.2),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.error.main,
                        borderRadius: 5,
                      },
                    }}
                  />
                </Box>

                {/* Enrolled Probability */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WarningIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={600}>Will Remain Enrolled</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: theme.palette.warning.light }}>
                      {(probabilities.medium * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={probabilities.medium * 100}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: alpha(theme.palette.warning.main, 0.2),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.warning.main,
                        borderRadius: 5,
                      },
                    }}
                  />
                </Box>

                {/* Graduate Probability */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SuccessIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={600}>Will Graduate</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: theme.palette.success.light }}>
                      {(probabilities.low * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={probabilities.low * 100}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: alpha(theme.palette.success.main, 0.2),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.success.main,
                        borderRadius: 5,
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Risk Factors */}
        {result.top_risk_factors && result.top_risk_factors.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Card 
              sx={{ 
                background: alpha(theme.palette.background.default, 0.6),
                backdropFilter: 'blur(5px)',
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.light }}>
                  Key Factors Influencing This Prediction
                </Typography>
                <Grid container spacing={2}>
                  {result.top_risk_factors.map((factor, index) => {
                    const impact = factor.impact || factor.importance || 0;
                    const isHighImpact = impact > 0.1;
                    
                    return (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            borderColor: isHighImpact ? alpha(theme.palette.error.main, 0.3) : alpha(theme.palette.warning.main, 0.3),
                            backgroundColor: isHighImpact ? alpha(theme.palette.error.main, 0.05) : alpha(theme.palette.warning.main, 0.05),
                            transition: 'transform 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                            },
                          }}
                        >
                          <Typography variant="subtitle2" gutterBottom fontWeight={600} sx={{ color: theme.palette.text.primary }}>
                            {factor.feature?.replace(/_/g, ' ') || 'Unknown Factor'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
  {isHighImpact && <ErrorIcon sx={{ color: theme.palette.error.main, fontSize: 16 }} />}
  <Typography variant="body2" sx={{ color: isHighImpact ? theme.palette.error.light : theme.palette.warning.light }}>
    Impact: {impact > 0 ? '+' : ''}{impact.toFixed(3)}
  </Typography>
</Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Action Buttons */}
        {showActions && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
            {onReset && (
              <Button
                variant="contained"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={onReset}
                sx={{
                  px: 4,
                  py: 1.5,
                }}
              >
                New Assessment
              </Button>
            )}
            <Button
              variant="outlined"
              size="large"
              startIcon={<DownloadIcon />}
              onClick={() => {
                const dataStr = JSON.stringify(result, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', `prediction_${result.student_id}.json`);
                linkElement.click();
              }}
              sx={{
                px: 4,
                py: 1.5,
                borderColor: alpha(theme.palette.primary.main, 0.3),
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                },
              }}
            >
              Download Report
            </Button>
          </Box>
        )}
      </Paper>
    </Grow>
  );
};
import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  LinearProgress,
  alpha,
  useTheme,
  Fade
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast } from 'react-toastify';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Send as SendIcon,
  RestartAlt as RestartIcon,
} from '@mui/icons-material';

import { FORM_STEPS, FIELD_DESCRIPTIONS } from '../../constants/formConstants';
import { studentSchema, StudentFormData } from '../../validations/studentValidation';
import { FormField } from './FormField';
import { studentApi } from '../../services/api.service';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const StudentRegistrationForm: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors, isValid },
    reset,
    watch
  } = useForm<StudentFormData>({
    resolver: yupResolver(studentSchema),
    mode: 'onChange',
    defaultValues: {}
  });

  const currentStep = FORM_STEPS[activeStep];
  const isLastStep = activeStep === FORM_STEPS.length - 1;
  const formValues = watch();

  // Calculate progress
  const totalFields = FORM_STEPS.reduce((acc, step) => acc + step.fields.length, 0);
  
  const isFieldFilled = (value: any): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  };

  const filledFields = (Object.keys(formValues) as Array<keyof StudentFormData>).filter(key => {
    const value = formValues[key];
    return isFieldFilled(value);
  }).length;

  const progress = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;

  const validateCurrentStep = async () => {
    const fieldsToValidate = currentStep.fields.map(f => f.name);
    const result = await trigger(fieldsToValidate as any);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      setActiveStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (data: StudentFormData) => {
    setLoading(true);
    try {
      const result = await studentApi.predictDropout({
        ...data,
        student_id: user?.username,
      });
      toast.success('✅ Assessment completed successfully!');

      if (result?.student_id) {
        navigate(`/profile/${result.student_id}`);
      } else {
        toast.error('Prediction succeeded but student ID is missing');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to get prediction');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    reset();
    toast.info('Form has been reset');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Fade in={true} timeout={800}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            borderRadius: 3,
            background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${theme.palette.background.paper} 100%)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Progress Bar */}
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 4,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                },
              }}
            />
          </Box>

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
                mb: 1,
              }}
            >
              Student Risk Assessment
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please answer all questions below
            </Typography>
            
            {/* Progress Indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2, gap: 2 }}>
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Typography variant="body2" sx={{ color: theme.palette.primary.light }}>
                  Step {activeStep + 1} of {FORM_STEPS.length}
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                }}
              >
                <Typography variant="body2" sx={{ color: theme.palette.success.light }}>
                  {filledFields}/{totalFields} completed
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 4, borderColor: alpha(theme.palette.divider, 0.1) }} />

          {/* Stepper */}
          <Stepper 
            activeStep={activeStep} 
            alternativeLabel 
            sx={{ 
              mb: 4,
              '& .MuiStepConnector-line': {
                borderColor: alpha(theme.palette.divider, 0.2),
              },
            }}
          >
            {FORM_STEPS.map((step) => (
              <Step key={step.title}>
                <StepLabel>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {step.icon} {step.title}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Form - Vertical Layout */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card 
              sx={{ 
                mb: 4,
                background: alpha(theme.palette.background.default, 0.6),
                backdropFilter: 'blur(5px)',
              }}
            >
              <CardContent>
                {/* Section Header */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h5" sx={{ color: theme.palette.primary.light }}>
                      {currentStep.icon}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {currentStep.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
                    {currentStep.description}
                  </Typography>
                </Box>

                {/* Vertical Form Fields - Each field in its own row */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {currentStep.fields.map((field) => (
                    <FormField
                      key={field.name}
                      field={field}
                      control={control}
                      error={errors[field.name]?.message}
                      description={FIELD_DESCRIPTIONS[field.name]}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={activeStep === 0}
                size="large"
                startIcon={<ArrowBackIcon />}
                sx={{
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                Back
              </Button>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleReset}
                  size="large"
                  startIcon={<RestartIcon />}
                  sx={{
                    borderColor: alpha(theme.palette.secondary.main, 0.3),
                    '&:hover': {
                      borderColor: theme.palette.secondary.main,
                      backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                    },
                  }}
                >
                  Reset
                </Button>

                {isLastStep ? (
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading || !isValid}
                    size="large"
                    endIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                  >
                    {loading ? 'Processing...' : 'Submit & Predict'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                  >
                    Next Step
                  </Button>
                )}
              </Box>
            </Box>

            {/* Error Summary */}
            {Object.keys(errors).length > 0 && (
              <Fade in={true}>
                <Alert 
                  severity="warning" 
                  sx={{ 
                    mt: 3,
                    backgroundColor: alpha(theme.palette.warning.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                  }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    Please fix the following errors:
                  </Typography>
                  <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                    {Object.entries(errors).slice(0, 3).map(([field, error]) => (
                      <li key={field}>
                        <Typography variant="body2">
                          {field.replace(/_/g, ' ')}: {error && 'message' in error ? error.message : 'Invalid value'}
                        </Typography>
                      </li>
                    ))}
                    {Object.keys(errors).length > 3 && (
                      <li>
                        <Typography variant="body2">
                          ...and {Object.keys(errors).length - 3} more errors
                        </Typography>
                      </li>
                    )}
                  </Box>
                </Alert>
              </Fade>
            )}
          </form>
        </Paper>
      </Fade>
    </Container>
  );
};
import React, { useEffect, useMemo, useState } from 'react';
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
	CircularProgress,
	LinearProgress,
	List,
	ListItem,
	ListItemText,
	Chip,
	alpha,
	useTheme,
	Alert,
} from '@mui/material';
import {
	ArrowBack as ArrowBackIcon,
	ArrowForward as ArrowForwardIcon,
	Send as SendIcon,
	SmartToy as SmartToyIcon,
	History as HistoryIcon,
	Insights as InsightsIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { toast } from 'react-toastify';

import { FORM_STEPS } from '../constants/formConstants';
import { studentSchema, StudentFormData } from '../validations/studentValidation';
import { FormField } from '../components/forms/FormField';
import { PredictionResult } from '../components/results/PredictionResult';
import { studentApi } from '../services/api.service';
import { PredictionRecord, StudentProfile } from '../types/student.types';
import Chatbot from '../components/chatbot/Chatbot';
import { useAuth } from '../context/AuthContext';

export const StudentProfilePage: React.FC = () => {
	const { studentId } = useParams<{ studentId: string }>();
	const navigate = useNavigate();
	const { user } = useAuth();
	const theme = useTheme();

	const [activeStep, setActiveStep] = useState(0);
	const [loadingProfile, setLoadingProfile] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [profile, setProfile] = useState<StudentProfile | null>(null);
	const [chatOpen, setChatOpen] = useState(false);

	const {
		control,
		handleSubmit,
		trigger,
		reset,
		watch,
	} = useForm<StudentFormData>({
		resolver: yupResolver(studentSchema),
		mode: 'onChange',
		defaultValues: {},
	});

	const currentStep = FORM_STEPS[activeStep];
	const isLastStep = activeStep === FORM_STEPS.length - 1;
	const formValues = watch();

	const totalFields = useMemo(
		() => FORM_STEPS.reduce((acc, step) => acc + step.fields.length, 0),
		[]
	);

	const isFieldFilled = (value: any): boolean => {
		if (value === undefined || value === null) return false;
		if (typeof value === 'string' && value.trim() === '') return false;
		return true;
	};

	const filledFields = (Object.keys(formValues) as Array<keyof StudentFormData>).filter((key) =>
		isFieldFilled((formValues as any)[key])
	).length;

	const progress = totalFields > 0 ? (filledFields / totalFields) * 100 : 0;

	const loadProfile = async () => {
		if (!studentId) return;
		setLoadingProfile(true);
		try {
			const data = await studentApi.getStudentProfile(studentId);
			setProfile(data);

			if (data?.student) {
				reset(data.student as any);
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to load student profile');
		} finally {
			setLoadingProfile(false);
		}
	};

	useEffect(() => {
		loadProfile();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [studentId]);

	const validateCurrentStep = async () => {
		const fieldsToValidate = currentStep.fields.map((f) => f.name);
		return trigger(fieldsToValidate as any);
	};

	const handleNext = async () => {
		const ok = await validateCurrentStep();
		if (ok) {
			setActiveStep((prev) => prev + 1);
		}
	};

	const handleBack = () => {
		setActiveStep((prev) => prev - 1);
	};

	const onSubmitAgain = async (data: StudentFormData) => {
		if (!studentId) return;
		setSubmitting(true);
		try {
			await studentApi.repredictStudent(studentId, data);
			toast.success('✅ Prediction updated and saved to history');
			await loadProfile();
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to re-predict');
		} finally {
			setSubmitting(false);
		}
	};

	const latest = profile?.latest_prediction as any;
	const history = (profile?.history || []) as PredictionRecord[];

	const getHistoryProb = (record: PredictionRecord) => {
		const probs = record.risk_probabilities || {};
		if (probs.dropout !== undefined) return probs.dropout;
		if (probs.high !== undefined) return probs.high;
		return undefined;
	};

	if (!studentId) {
		return (
			<Container maxWidth="md" sx={{ py: 4 }}>
				<Alert severity="error">Missing student ID in URL.</Alert>
			</Container>
		);
	}

	return (
		<Container maxWidth="lg" sx={{ py: 4 }}>
			<Box sx={{ mb: 3 }}>
				<Typography variant="h4" sx={{ fontWeight: 800 }}>
					Student Profile
				</Typography>
				<Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
					<Chip
						label={`ID: ${studentId}`}
						size="small"
						sx={{
							bgcolor: alpha(theme.palette.primary.main, 0.1),
							color: theme.palette.primary.light,
							border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
						}}
					/>
					{profile?.student?.updated_at && (
						<Chip
							label={`Updated: ${new Date(profile.student.updated_at).toLocaleString()}`}
							size="small"
							sx={{ bgcolor: alpha(theme.palette.text.secondary, 0.1), color: theme.palette.text.secondary }}
						/>
					)}
				</Box>
			</Box>

			{loadingProfile ? (
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
						<Typography>Loading profile…</Typography>
					</Box>
				</Paper>
			) : (
				<>
					{latest ? (
						<Box sx={{ mb: 3 }}>
							<PredictionResult
								result={{
									student_id: studentId,
									risk_level: latest.risk_level,
									risk_probabilities: latest.risk_probabilities,
									top_risk_factors: latest.top_risk_factors || [],
									timestamp: latest.timestamp || latest.created_at || new Date().toISOString(),
								}}
								showActions={false}
							/>
						</Box>
					) : (
						<Alert severity="info" sx={{ mb: 3 }}>
							No predictions found yet.
						</Alert>
					)}

					<Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
						<Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
							<Button
								variant="contained"
								size="large"
								startIcon={<SmartToyIcon />}
								onClick={() => setChatOpen((prev) => !prev)}
								sx={{ px: 4, py: 1.5 }}
							>
								{chatOpen ? 'Close Chatbot' : 'Open Chatbot'}
							</Button>

							{latest && (
								<Button
									variant="outlined"
									size="large"
									startIcon={<InsightsIcon />}
									onClick={() => navigate(`/explain/${studentId}`)}
									sx={{ px: 4, py: 1.5 }}
								>
									View Risk Explanation
								</Button>
							)}
						</Box>
					</Box>

					{chatOpen && (
						<Box sx={{ mb: 4 }}>
							<Chatbot
								userId={user?.username || studentId}
								initialRiskLevel="MEDIUM"
								autoOpen={true}
								layoutMode="docked-right"
								onClose={() => setChatOpen(false)}
							/>
						</Box>
					)}

					<Paper
						elevation={0}
						sx={{
							p: 3,
							borderRadius: 3,
							mb: 4,
							background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${theme.palette.background.paper} 100%)`,
							border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
						}}
					>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
							<HistoryIcon sx={{ color: theme.palette.primary.light }} />
							<Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.primary.light }}>
								Prediction History (Last 10)
							</Typography>
						</Box>

						{history.length === 0 ? (
							<Typography color="text.secondary">No history records.</Typography>
						) : (
							<List dense>
								{history.map((h, idx) => {
									const when = h.timestamp || h.created_at;
									const prob = getHistoryProb(h);
									return (
										<ListItem key={idx} divider={idx !== history.length - 1}>
											<ListItemText
												primary={`${h.risk_level}${prob !== undefined ? ` • Dropout ${(prob * 100).toFixed(1)}%` : ''}`}
												secondary={when ? new Date(when).toLocaleString() : ''}
											/>
										</ListItem>
									);
								})}
							</List>
						)}
					</Paper>

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

						<Box sx={{ textAlign: 'center', mb: 4 }}>
							<Typography
								variant="h5"
								gutterBottom
								sx={{
									fontWeight: 800,
									background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.secondary.light} 100%)`,
									WebkitBackgroundClip: 'text',
									WebkitTextFillColor: 'transparent',
									mb: 1,
								}}
							>
								Update Details (Re-predict)
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Edit any values and submit again to generate a new prediction record.
							</Typography>
						</Box>

						<Divider sx={{ mb: 4, borderColor: alpha(theme.palette.divider, 0.1) }} />

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

						<form onSubmit={handleSubmit(onSubmitAgain)}>
							<Card
								sx={{
									mb: 4,
									background: alpha(theme.palette.background.default, 0.6),
									backdropFilter: 'blur(5px)',
								}}
							>
								<CardContent>
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

									<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
										{currentStep.fields.map((field) => (
											<FormField
												key={String(field.name)}
												field={field as any}
												control={control}
											/>
										))}
									</Box>
								</CardContent>
							</Card>

							<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
								<Button
									variant="outlined"
									startIcon={<ArrowBackIcon />}
									onClick={handleBack}
									disabled={activeStep === 0 || submitting}
								>
									Back
								</Button>

								{isLastStep ? (
									<Button
										type="submit"
										variant="contained"
										startIcon={submitting ? <CircularProgress size={18} /> : <SendIcon />}
										disabled={submitting}
										sx={{ px: 4 }}
									>
										{submitting ? 'Submitting…' : 'Submit Again'}
									</Button>
								) : (
									<Button
										variant="contained"
										endIcon={<ArrowForwardIcon />}
										onClick={handleNext}
										disabled={submitting}
									>
										Next
									</Button>
								)}
							</Box>
						</form>
					</Paper>
				</>
			)}
		</Container>
	);
};


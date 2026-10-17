import axios from 'axios';
import { StudentRawData, StudentProfile, RiskExplanation } from '../types/student.types';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RoleUpdateRequest,
  AuthUser,
  ProfileUpdateRequest,
  PasswordChangeRequest,
} from '../types/auth.types';
import {
  StaffStudentsListResponse,
  RiskDistributionRow,
  MonthlyTrendRow,
  InterventionCreatePayload,
  InterventionListResponse,
  InterventionItem,
  InterventionUpdatePayload,
  AnalyticsReportItem,
  AnalyticsReportListResponse,
  StaffHistoryResponse,
  StudentReportListResponse,
} from '../types/monitoring.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const getAuthToken = () => localStorage.getItem('auth_token');

export const getApiErrorMessage = (error: unknown, fallback = 'Request failed'): string => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as any;

    if (typeof responseData === 'string' && responseData.trim()) {
      return responseData;
    }

    if (typeof responseData?.detail === 'string' && responseData.detail.trim()) {
      return responseData.detail;
    }

    if (Array.isArray(responseData?.detail)) {
      const joined = responseData.detail
        .map((entry: any) => entry?.msg)
        .filter(Boolean)
        .join(', ');
      if (joined) return joined;
    }

    if (typeof responseData?.message === 'string' && responseData.message.trim()) {
      return responseData.message;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    if (config.headers && typeof (config.headers as any).set === 'function') {
      (config.headers as any).set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      } as any;
    }
  }
  return config;
});

export const studentApi = {
  // Submit student data for prediction
  predictDropout: async (studentData: StudentRawData & { student_id?: string }) => {
    const response = await api.post('/predict', studentData);
    return response.data;
  },

  // Load student profile (student + latest prediction + history)
  getStudentProfile: async (studentId: string): Promise<StudentProfile> => {
    const response = await api.get(`/students/${studentId}/profile`);
    return response.data;
  },

  // Update details and re-run prediction (creates new history record)
  repredictStudent: async (studentId: string, studentData: StudentRawData) => {
    const response = await api.post(`/students/${studentId}/repredict`, studentData);
    return response.data;
  },

  getRiskExplanation: async (studentId: string): Promise<RiskExplanation> => {
    const response = await api.get(`/students/${studentId}/risk-explanation`);
    return response.data;
  },

  // Check API health
  checkHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

export const authApi = {
  registerStudent: async (payload: RegisterRequest) => {
    const response = await api.post('/auth/register-student', payload);
    return response.data;
  },
  registerStaff: async (payload: RegisterRequest) => {
    const response = await api.post('/auth/register-staff', payload);
    return response.data;
  },
  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', payload);
    return response.data;
  },
  getCurrentUser: async (): Promise<AuthUser> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  updateCurrentUser: async (payload: ProfileUpdateRequest): Promise<AuthUser> => {
    const response = await api.put('/auth/me', payload);
    return response.data;
  },
  changePassword: async (payload: PasswordChangeRequest): Promise<{ message: string }> => {
    const response = await api.put('/auth/me/password', payload);
    return response.data;
  },
};

export const adminApi = {
  listUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  updateUserRole: async (username: string, payload: RoleUpdateRequest) => {
    const response = await api.patch(`/admin/users/${username}/role`, payload);
    return response.data;
  },
  deleteUser: async (username: string) => {
    const response = await api.delete(`/admin/users/${username}`);
    return response.data;
  }
};

export const staffApi = {
  getDashboard: async () => {
    const response = await api.get('/staff/dashboard');
    return response.data;
  },
  getHighRiskStudents: async (limit = 10) => {
    const response = await api.get('/staff/high-risk', { params: { limit } });
    return response.data;
  },
  getCourseAnalytics: async (limit = 10) => {
    const response = await api.get('/staff/courses', { params: { limit } });
    return response.data;
  },
  getRiskDistribution: async (): Promise<RiskDistributionRow[]> => {
    const response = await api.get('/staff/risk-distribution');
    return response.data;
  },
  getMonthlyTrends: async (months = 6): Promise<MonthlyTrendRow[]> => {
    const response = await api.get('/staff/monthly-trends', { params: { months } });
    return response.data;
  },
  getStudents: async (params?: {
    risk_level?: string;
    course?: number;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<StaffStudentsListResponse> => {
    const response = await api.get('/staff/students', { params });
    return response.data;
  },
  getHistory: async (params?: {
    search?: string;
    risk_level?: string;
    course?: number;
    skip?: number;
    limit?: number;
  }): Promise<StaffHistoryResponse> => {
    const response = await api.get('/staff/history', { params });
    return response.data;
  },
};

export const interventionApi = {
  create: async (payload: InterventionCreatePayload): Promise<InterventionItem> => {
    const response = await api.post('/interventions', payload);
    return response.data;
  },
  list: async (params?: {
    student_id?: string;
    staff_id?: string;
    intervention_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }): Promise<InterventionListResponse> => {
    const response = await api.get('/interventions', { params });
    return response.data;
  },
  getById: async (interventionId: string): Promise<InterventionItem> => {
    const response = await api.get(`/interventions/${interventionId}`);
    return response.data;
  },
  update: async (interventionId: string, payload: InterventionUpdatePayload): Promise<InterventionItem> => {
    const response = await api.patch(`/interventions/${interventionId}`, payload);
    return response.data;
  },
  delete: async (interventionId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/interventions/${interventionId}`);
    return response.data;
  },
};

export const reportApi = {
  generate: async (payload: {
    report_type: 'risk_summary' | 'course_breakdown' | 'monthly_trends';
    start_date?: string;
    end_date?: string;
  }): Promise<AnalyticsReportItem> => {
    const response = await api.post('/reports/generate', payload);
    return response.data;
  },
  list: async (params?: {
    report_type?: string;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }): Promise<AnalyticsReportListResponse> => {
    const response = await api.get('/reports', { params });
    return response.data;
  },
  downloadCsv: async (params?: {
    report_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Blob> => {
    const response = await api.get('/reports/csv', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
  downloadByIdCsv: async (reportId: string): Promise<Blob> => {
    const response = await api.get(`/reports/${reportId}/csv`, {
      responseType: 'blob',
    });
    return response.data;
  },
  listStudentReports: async (params?: {
    student_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<StudentReportListResponse> => {
    const response = await api.get('/reports/students', { params });
    return response.data;
  },
  downloadStudentCsv: async (params?: {
    student_id?: string;
  }): Promise<Blob> => {
    const response = await api.get('/reports/students/csv', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
  getById: async (reportId: string): Promise<AnalyticsReportItem> => {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
  },
};

export const chatbotApi = {
  sendMessage: async (payload: {
    user_id: string;
    message: string;
    risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
    session_id?: string;
  }) => {
    const response = await api.post('/api/chat', payload);
    return response.data;
  },
  getHistory: async (userId: string, limit = 50) => {
    const response = await api.get(`/api/chat/history/${userId}`, { params: { limit } });
    return response.data;
  },
  getSuggestions: async (intent?: string) => {
    const response = await api.get('/api/suggestions', { params: { intent } });
    return response.data;
  },
  health: async () => {
    const response = await api.get('/api/chat/health');
    return response.data;
  },
};
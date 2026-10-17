export interface StaffStudentRow {
  student_id: string;
  course: number | string | null;
  risk_level: string;
  high_risk_probability: number;
  created_at?: string;
}

export interface StaffStudentsListResponse {
  total: number;
  items: StaffStudentRow[];
}

export interface RiskDistributionRow {
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
  count: number;
}

export interface MonthlyTrendRow {
  month: string;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface StaffHistoryRow {
  prediction_id: string;
  student_id: string;
  course: number | string | null;
  created_at?: string;
  risk_level: string;
  confidence: number;
  risk_probabilities: Record<string, number>;
}

export interface StaffHistoryResponse {
  total: number;
  low_count: number;
  medium_count: number;
  high_count: number;
  items: StaffHistoryRow[];
}

export interface InterventionItem {
  intervention_id: string;
  student_id: string;
  staff_id: string;
  course?: number | string | null;
  risk_level?: string;
  risk_score?: number;
  risk_factors?: string[];
  intervention_type: 'academic' | 'financial' | 'counseling' | 'attendance' | 'other';
  notes: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  date: string;
  created_at: string;
  updated_at?: string;
}

export interface InterventionListResponse {
  total: number;
  items: InterventionItem[];
}

export interface InterventionCreatePayload {
  student_id: string;
  staff_id?: string;
  intervention_type: InterventionItem['intervention_type'];
  notes: string;
  status?: InterventionItem['status'];
  date: string;
}

export interface InterventionUpdatePayload {
  staff_id?: string;
  intervention_type?: InterventionItem['intervention_type'];
  notes?: string;
  status?: InterventionItem['status'];
  date?: string;
}

export interface AnalyticsReportItem {
  report_id: string;
  report_type: 'risk_summary' | 'course_breakdown' | 'monthly_trends';
  generated_by: string;
  generated_date: string;
  start_date?: string;
  end_date?: string;
  data: Record<string, any>;
}

export interface AnalyticsReportListResponse {
  total: number;
  items: AnalyticsReportItem[];
}

export interface StudentReportRow {
  prediction_id: string;
  student_id: string;
  course: number | string | null;
  risk_level: string;
  high_risk_probability: number;
  top_risk_factors: string[];
  created_at: string;
}

export interface StudentReportListResponse {
  total: number;
  items: StudentReportRow[];
}

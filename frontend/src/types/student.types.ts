export interface StudentRawData {
  // Demographics
  age_at_enrollment: number;
  displaced: number;

  // Family Background
  mothers_qualification: number;
  fathers_qualification: number;
  mothers_occupation: number;
  fathers_occupation: number;

  // Financial Status
  scholarship_holder: number;
  tuition_fees_up_to_date: number;
  debtor: number;

  // Course
  course: number;

  // First Semester Academic Performance
  curricular_units_1st_sem_enrolled: number;
  curricular_units_1st_sem_approved: number;
  curricular_units_1st_sem_grade: number;

  // Second Semester Academic Performance
  curricular_units_2nd_sem_enrolled: number;
  curricular_units_2nd_sem_approved: number;
  curricular_units_2nd_sem_grade: number;

  // Economic Indicators
  unemployment_rate: number;
  inflation_rate: number;
}

export interface FieldConfig {
  name: keyof StudentRawData;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: Array<{ value: number; label: string }>;
  min?: number;
  max?: number;
  step?: number;
}

export interface FormStep {
  title: string;
  description: string;
  fields: FieldConfig[];
  icon: string;
}

export interface RiskFactor {
  feature: string;
  impact?: number;
  importance?: number;
}

export interface ExplainFactor {
  feature: string;
  impact: number;
  advice: string;
}

export interface RiskExplanation {
  student_id: string;
  risk_level: string;
  confidence: number;
  summary: string;
  top_risk_factors: ExplainFactor[];
  top_protective_factors: ExplainFactor[];
  prediction_id?: string;
}

export interface PredictionRecord {
  student_id: string;
  risk_level: string;
  risk_probabilities: Record<string, number>;
  top_risk_factors?: RiskFactor[];
  timestamp?: string;
  created_at?: string;
}

export interface StudentProfile {
  student: StudentRawData & {
    student_id: string;
    created_at?: string;
    updated_at?: string;
  };
  latest_prediction?: PredictionRecord | null;
  history: PredictionRecord[];
}
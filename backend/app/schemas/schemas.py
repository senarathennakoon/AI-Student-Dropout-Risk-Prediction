from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any, Literal


class StudentData(BaseModel):
    age_at_enrollment: int
    displaced: int
    mothers_qualification: int
    fathers_qualification: int
    mothers_occupation: int
    fathers_occupation: int
    scholarship_holder: int
    tuition_fees_up_to_date: int
    debtor: int
    course: int
    curricular_units_1st_sem_enrolled: int
    curricular_units_1st_sem_approved: int
    curricular_units_1st_sem_grade: float
    curricular_units_2nd_sem_enrolled: int
    curricular_units_2nd_sem_approved: int
    curricular_units_2nd_sem_grade: float
    unemployment_rate: float
    inflation_rate: float
    student_id: Optional[str] = None


class PredictionResponse(BaseModel):
    student_id: str
    risk_level: str
    risk_probabilities: Dict[str, float]
    top_risk_factors: Optional[List[Dict[str, Any]]] = None
    timestamp: datetime


class ExplainRequest(BaseModel):
    student_id: str


class ExplainFactor(BaseModel):
    feature: str
    impact: float
    advice: str


class RiskExplanationResponse(BaseModel):
    student_id: str
    risk_level: str
    confidence: float
    summary: str
    top_risk_factors: List[ExplainFactor]
    top_protective_factors: List[ExplainFactor]
    prediction_id: Optional[str] = None


class StudentProfileResponse(BaseModel):
    student: Dict[str, Any]
    latest_prediction: Optional[Dict[str, Any]] = None
    history: List[Dict[str, Any]]


class UserRegisterRequest(BaseModel):
    username: str
    first_name: str
    last_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    username: str
    first_name: str
    last_name: str
    email: str
    role: str
    status: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class RoleUpdateRequest(BaseModel):
    role: str
    status: str


class UserProfileUpdateRequest(BaseModel):
    first_name: str
    last_name: str


class UserPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


InterventionStatus = Literal["planned", "in_progress", "completed", "cancelled"]
InterventionType = Literal["academic", "financial", "counseling", "attendance", "other"]
ReportType = Literal["risk_summary", "course_breakdown", "monthly_trends"]


class InterventionCreateRequest(BaseModel):
    student_id: str
    intervention_type: InterventionType
    notes: str
    status: InterventionStatus = "planned"
    date: datetime
    staff_id: Optional[str] = None


class InterventionUpdateRequest(BaseModel):
    intervention_type: Optional[InterventionType] = None
    notes: Optional[str] = None
    status: Optional[InterventionStatus] = None
    date: Optional[datetime] = None
    staff_id: Optional[str] = None


class InterventionResponse(BaseModel):
    intervention_id: str
    student_id: str
    staff_id: str
    course: Optional[Any] = None
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    risk_factors: Optional[List[str]] = None
    intervention_type: InterventionType
    notes: str
    status: InterventionStatus
    date: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None


class InterventionListResponse(BaseModel):
    total: int
    items: List[InterventionResponse]


class AnalyticsReportGenerateRequest(BaseModel):
    report_type: ReportType
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class AnalyticsReportResponse(BaseModel):
    report_id: str
    report_type: ReportType
    generated_by: str
    generated_date: datetime
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    data: Dict[str, Any]


class AnalyticsReportListResponse(BaseModel):
    total: int
    items: List[AnalyticsReportResponse]


class StudentReportItem(BaseModel):
    prediction_id: str
    student_id: str
    course: Optional[Any] = None
    risk_level: str
    high_risk_probability: float
    top_risk_factors: List[str] = Field(default_factory=list)
    created_at: datetime


class StudentReportListResponse(BaseModel):
    total: int
    items: List[StudentReportItem]

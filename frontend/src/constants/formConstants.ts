import { FormStep } from '../types/student.types';

// Gender options
export const GENDER_OPTIONS = [
  { value: 1, label: 'Male' },
  { value: 0, label: 'Female' }
];

// Yes/No options
export const BOOLEAN_OPTIONS = [
  { value: 1, label: 'Yes' },
  { value: 0, label: 'No' }
];

// Course options
export const COURSE_OPTIONS = [
  { value: 1, label: 'Biofuel Production Technologies' },
  { value: 2, label: 'Animation and Multimedia Design' },
  { value: 3, label: 'Social Service (evening attendance)' },
  { value: 4, label: 'Agronomy' },
  { value: 5, label: 'Communication Design' },
  { value: 6, label: 'Veterinary Nursing' },
  { value: 7, label: 'Engineering' },
  { value: 8, label: 'Journalism and Communication' },
  { value: 9, label: 'Management' },
  { value: 10, label: 'Economics' },
  { value: 11, label: 'Farm' },
  { value: 12, label: 'Nursing' },
  { value: 13, label: 'Nutrition' },
  { value: 14, label: 'Sociology' },
  { value: 15, label: 'Management' },
  { value: 16, label: 'IT' },
  { value: 17, label: 'Management' }
];

// Mother's qualification options
export const MOTHER_QUALIFICATION_OPTIONS = [
  { value: 1, label: 'None' },
  { value: 2, label: 'Primary Education' },
  { value: 3, label: 'Secondary Education' },
  { value: 4, label: 'Higher Education - Bachelor\'s' },
  { value: 5, label: 'Higher Education - Master\'s' },
  { value: 6, label: 'Higher Education - Doctorate' },
  { value: 7, label: 'Professional Course' },
  { value: 8, label: 'Other' }
];

// Father's qualification options
export const FATHER_QUALIFICATION_OPTIONS = [
  { value: 1, label: 'None' },
  { value: 2, label: 'Primary Education' },
  { value: 3, label: 'Secondary Education' },
  { value: 4, label: 'Higher Education - Bachelor\'s' },
  { value: 5, label: 'Higher Education - Master\'s' },
  { value: 6, label: 'Higher Education - Doctorate' },
  { value: 7, label: 'Professional Course' },
  { value: 8, label: 'Other' }
];

// Occupation options
export const OCCUPATION_OPTIONS = [
  { value: 1, label: 'Student' },
  { value: 2, label: 'Unemployed' },
  { value: 3, label: 'Employed - Part Time' },
  { value: 4, label: 'Employed - Full Time' },
  { value: 5, label: 'Self-Employed' },
  { value: 6, label: 'Retired' },
  { value: 7, label: 'Other' }
];

// Form steps configuration - 18 required fields only
export const FORM_STEPS: FormStep[] = [
  {
    title: 'Personal & Family Information',
    description: 'Demographic and family background details',
    fields: [
      { name: 'age_at_enrollment', label: 'Age at Enrollment', type: 'number', min: 17, max: 70 },
      { name: 'displaced', label: 'Displaced from Usual Residence?', type: 'select', options: BOOLEAN_OPTIONS },
      { name: 'mothers_qualification', label: "Mother's Qualification", type: 'select', options: MOTHER_QUALIFICATION_OPTIONS },
      { name: 'fathers_qualification', label: "Father's Qualification", type: 'select', options: FATHER_QUALIFICATION_OPTIONS },
      { name: 'mothers_occupation', label: "Mother's Occupation", type: 'select', options: OCCUPATION_OPTIONS },
      { name: 'fathers_occupation', label: "Father's Occupation", type: 'select', options: OCCUPATION_OPTIONS },
      { name: 'course', label: 'Course', type: 'select', options: COURSE_OPTIONS }
    ],
    icon: '👥'
  },
  {
    title: 'Financial Status',
    description: 'Tuition, scholarships, and debt information',
    fields: [
      { name: 'tuition_fees_up_to_date', label: 'Tuition Fees Up to Date?', type: 'select', options: BOOLEAN_OPTIONS },
      { name: 'scholarship_holder', label: 'Scholarship Holder?', type: 'select', options: BOOLEAN_OPTIONS },
      { name: 'debtor', label: 'Is the student a debtor?', type: 'select', options: BOOLEAN_OPTIONS }
    ],
    icon: '💰'
  },
  {
    title: 'First Semester Performance',
    description: 'Curricular units and grades from first semester',
    fields: [
      { name: 'curricular_units_1st_sem_enrolled', label: 'Units Enrolled', type: 'number', min: 0, max: 20 },
      { name: 'curricular_units_1st_sem_approved', label: 'Units Approved', type: 'number', min: 0, max: 20 },
      { name: 'curricular_units_1st_sem_grade', label: 'Average Grade (0-20)', type: 'number', min: 0, max: 20, step: 0.1 }
    ],
    icon: '📊'
  },
  {
    title: 'Second Semester & Economic Context',
    description: 'Curricular units, grades, and economic indicators',
    fields: [
      { name: 'curricular_units_2nd_sem_enrolled', label: 'Units Enrolled', type: 'number', min: 0, max: 20 },
      { name: 'curricular_units_2nd_sem_approved', label: 'Units Approved', type: 'number', min: 0, max: 20 },
      { name: 'curricular_units_2nd_sem_grade', label: 'Average Grade (0-20)', type: 'number', min: 0, max: 20, step: 0.1 },
      { name: 'unemployment_rate', label: 'Unemployment Rate (%)', type: 'number', min: 0, max: 30, step: 0.1 },
      { name: 'inflation_rate', label: 'Inflation Rate (%)', type: 'number', min: -5, max: 15, step: 0.1 }
    ],
    icon: '📈'
  }
];

// Field descriptions for tooltips
export const FIELD_DESCRIPTIONS: Record<string, string> = {
  age_at_enrollment: 'Your age when you enrolled at the institution',
  displaced: 'Are you displaced from your usual residence?',
  mothers_qualification: "Select your mother's highest qualification level",
  fathers_qualification: "Select your father's highest qualification level",
  mothers_occupation: "Select your mother's occupation",
  fathers_occupation: "Select your father's occupation",
  course: 'Select your course of study',
  tuition_fees_up_to_date: 'Are your tuition fees paid and up to date?',
  scholarship_holder: 'Do you currently hold a scholarship?',
  debtor: 'Do you have any outstanding financial debts with the institution?',
  curricular_units_1st_sem_enrolled: 'Total number of units you enrolled in during first semester',
  curricular_units_1st_sem_approved: 'Number of units you successfully completed in first semester',
  curricular_units_1st_sem_grade: 'Your average grade in first semester (on a scale of 0-20)',
  curricular_units_2nd_sem_enrolled: 'Total number of units you enrolled in during second semester',
  curricular_units_2nd_sem_approved: 'Number of units you successfully completed in second semester',
  curricular_units_2nd_sem_grade: 'Your average grade in second semester (on a scale of 0-20)',
  unemployment_rate: 'Unemployment rate at the time of enrollment (%)',
  inflation_rate: 'Inflation rate at the time of enrollment (%)'
};

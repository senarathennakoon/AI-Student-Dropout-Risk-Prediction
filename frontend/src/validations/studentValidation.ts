import * as yup from 'yup';

export const studentSchema = yup.object().shape({
  // Demographics
  age_at_enrollment: yup.number()
    .required('Age is required')
    .min(17, 'Age must be at least 17')
    .max(70, 'Age must be less than 70'),
  
  displaced: yup.number()
    .required('Displaced status is required')
    .min(0, 'Invalid value')
    .max(1, 'Invalid value'),

  // Family Background
  mothers_qualification: yup.number()
    .required("Mother's qualification is required")
    .min(1, 'Invalid qualification'),
  
  fathers_qualification: yup.number()
    .required("Father's qualification is required")
    .min(1, 'Invalid qualification'),
  
  mothers_occupation: yup.number()
    .required("Mother's occupation is required")
    .min(1, 'Invalid occupation'),
  
  fathers_occupation: yup.number()
    .required("Father's occupation is required")
    .min(1, 'Invalid occupation'),

  // Financial Status
  debtor: yup.number()
    .required('Debtor status is required')
    .min(0, 'Invalid value')
    .max(1, 'Invalid value'),
  
  tuition_fees_up_to_date: yup.number()
    .required('Tuition fees status is required')
    .min(0, 'Invalid value')
    .max(1, 'Invalid value'),
  
  scholarship_holder: yup.number()
    .required('Scholarship status is required')
    .min(0, 'Invalid value')
    .max(1, 'Invalid value'),

  // Course
  course: yup.number()
    .required('Course is required')
    .min(1, 'Invalid course')
    .max(17, 'Invalid course'),

  // First Semester
  curricular_units_1st_sem_enrolled: yup.number()
    .required('Enrolled units required')
    .min(0, 'Cannot be negative')
    .max(20, 'Too many units'),
  
  curricular_units_1st_sem_approved: yup.number()
    .required('Approved units required')
    .min(0, 'Cannot be negative')
    .max(20, 'Too many units'),
  
  curricular_units_1st_sem_grade: yup.number()
    .required('Grade required')
    .min(0, 'Grade must be between 0-20')
    .max(20, 'Grade must be between 0-20'),

  // Second Semester
  curricular_units_2nd_sem_enrolled: yup.number()
    .required('Enrolled units required')
    .min(0, 'Cannot be negative')
    .max(20, 'Too many units'),
  
  curricular_units_2nd_sem_approved: yup.number()
    .required('Approved units required')
    .min(0, 'Cannot be negative')
    .max(20, 'Too many units'),
  
  curricular_units_2nd_sem_grade: yup.number()
    .required('Grade required')
    .min(0, 'Grade must be between 0-20')
    .max(20, 'Grade must be between 0-20'),

  // Economic Indicators
  unemployment_rate: yup.number()
    .required('Unemployment rate required')
    .min(0, 'Cannot be negative')
    .max(30, 'Rate seems too high'),
  
  inflation_rate: yup.number()
    .required('Inflation rate required')
    .min(-5, 'Too low')
    .max(15, 'Too high')
});

export type StudentFormData = yup.InferType<typeof studentSchema>;

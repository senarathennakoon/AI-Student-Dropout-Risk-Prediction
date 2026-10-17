def calculate_engineered_features(student_data):
    """
    Calculate the 24 features needed for the ML model
    """
    
    def safe_div(a, b):
        return a / b if b > 0 else 0
    
    # Success Rates
    success_rate_sem1 = safe_div(
        student_data.curricular_units_1st_sem_approved,
        student_data.curricular_units_1st_sem_enrolled
    )
    success_rate_sem2 = safe_div(
        student_data.curricular_units_2nd_sem_approved,
        student_data.curricular_units_2nd_sem_enrolled
    )
    
    # Failure Rates
    failure_rate_sem1 = 1 - success_rate_sem1
    failure_rate_sem2 = 1 - success_rate_sem2
    
    # Grade Improvement
    grade_improvement = (
        student_data.curricular_units_2nd_sem_grade - 
        student_data.curricular_units_1st_sem_grade
    )
    
    # Family Support
    family_support = (
        (student_data.scholarship_holder * 2) +
        student_data.tuition_fees_up_to_date +
        (1 - student_data.debtor) +
        (student_data.displaced * 0.5)
    )
    
    # Parents Education
    parents_education = (
        student_data.mothers_qualification +
        student_data.fathers_qualification
    ) / 2
    
    # Academic Performance
    academic_performance = (
        student_data.curricular_units_1st_sem_grade * success_rate_sem1 +
        student_data.curricular_units_2nd_sem_grade * success_rate_sem2
    ) / 2
    
    # Risk Score
    risk_score = (
        (1 - success_rate_sem2) * 3 +
        (1 - student_data.tuition_fees_up_to_date) * 2 +
        student_data.debtor * 2 +
        (1 if student_data.age_at_enrollment > 25 else 0)
    )
    
    return {
        'risk_score': risk_score,
        'success_rate_sem2': success_rate_sem2,
        'failure_rate_sem2': failure_rate_sem2,
        'academic_performance_score': academic_performance,
        'curricular_units_2nd_sem_approved': student_data.curricular_units_2nd_sem_approved,
        'failure_rate_sem1': failure_rate_sem1,
        'success_rate_sem1': success_rate_sem1,
        'curricular_units_1st_sem_approved': student_data.curricular_units_1st_sem_approved,
        'curricular_units_2nd_sem_grade': student_data.curricular_units_2nd_sem_grade,
        'family_support': family_support,
        'curricular_units_1st_sem_grade': student_data.curricular_units_1st_sem_grade,
        'age_at_enrollment': student_data.age_at_enrollment,
        'mothers_occupation': student_data.mothers_occupation,
        'course': student_data.course,
        'grade_improvement': grade_improvement,
        'unemployment_rate': student_data.unemployment_rate,
        'parents_education': parents_education,
        'inflation_rate': student_data.inflation_rate,
        'tuition_fees_up_to_date': student_data.tuition_fees_up_to_date,
        'fathers_occupation': student_data.fathers_occupation,
        'curricular_units_2nd_sem_enrolled': student_data.curricular_units_2nd_sem_enrolled,
        'curricular_units_1st_sem_enrolled': student_data.curricular_units_1st_sem_enrolled,
        'displaced': student_data.displaced,
        'debtor': student_data.debtor
    }
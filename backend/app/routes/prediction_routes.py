from datetime import datetime
from typing import Optional
import re

from fastapi import APIRouter, Header, HTTPException, status

from app.database.mongodb import mongodb
from app.core.helpers import run_prediction
from app.core.security import get_current_user_optional
from app.schemas.schemas import StudentData, PredictionResponse

router = APIRouter(tags=["prediction"])


@router.post("/predict", response_model=PredictionResponse)
async def predict_dropout(student_data: StudentData, authorization: Optional[str] = Header(None)):
    try:
        user = await get_current_user_optional(authorization)

        if authorization and not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

        if user and user.get("role") == "student":
            student_id = user.get("username")
            if not student_id:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authenticated user")
        elif student_data.student_id:
            if not re.match(r"^STU\d{4,}$", student_data.student_id):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid student ID format")
            student_id = student_data.student_id
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student ID is required for prediction")

        risk_level, probs, top_risk_factors, engineered_features = run_prediction(student_data)

        try:
            student_document = {
                "student_id": student_id,
                "age_at_enrollment": student_data.age_at_enrollment,
                "displaced": student_data.displaced,
                "mothers_qualification": student_data.mothers_qualification,
                "fathers_qualification": student_data.fathers_qualification,
                "mothers_occupation": student_data.mothers_occupation,
                "fathers_occupation": student_data.fathers_occupation,
                "scholarship_holder": student_data.scholarship_holder,
                "tuition_fees_up_to_date": student_data.tuition_fees_up_to_date,
                "debtor": student_data.debtor,
                "course": student_data.course,
                "curricular_units_1st_sem_enrolled": student_data.curricular_units_1st_sem_enrolled,
                "curricular_units_1st_sem_approved": student_data.curricular_units_1st_sem_approved,
                "curricular_units_1st_sem_grade": student_data.curricular_units_1st_sem_grade,
                "curricular_units_2nd_sem_enrolled": student_data.curricular_units_2nd_sem_enrolled,
                "curricular_units_2nd_sem_approved": student_data.curricular_units_2nd_sem_approved,
                "curricular_units_2nd_sem_grade": student_data.curricular_units_2nd_sem_grade,
                "unemployment_rate": student_data.unemployment_rate,
                "inflation_rate": student_data.inflation_rate,
                "created_at": datetime.utcnow(),
            }
            existing_student = await mongodb.get_student(student_id)
            if existing_student:
                await mongodb.update_student(student_id, student_document)
            else:
                await mongodb.create_student(student_document)

            prediction_data = {
                "student_id": student_id,
                "risk_level": risk_level,
                "risk_probabilities": probs,
                "top_risk_factors": top_risk_factors,
                "engineered_features": engineered_features,
                "created_at": datetime.utcnow(),
            }
            await mongodb.save_prediction(prediction_data)
            print(f"✅ Student {student_id} data saved to students collection")
            print(f"✅ Prediction for {student_id} saved to predictions collection")
        except Exception as e:
            print(f"⚠️ Error saving to MongoDB: {e}")

        return PredictionResponse(
            student_id=student_id,
            risk_level=risk_level,
            risk_probabilities=probs,
            top_risk_factors=top_risk_factors,
            timestamp=datetime.utcnow(),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

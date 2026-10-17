from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status

from app.database.mongodb import mongodb
from app.core.helpers import mongo_to_json, run_prediction
from app.core.security import get_current_user_optional
from app.schemas.schemas import (
    StudentData,
    PredictionResponse,
    StudentProfileResponse,
    ExplainRequest,
    RiskExplanationResponse,
)
from app.services.risk_explanation_service import risk_explanation_service

router = APIRouter(tags=["student"])


async def _authorize_student_access(student_id: str, authorization: Optional[str]) -> None:
    user = await get_current_user_optional(authorization)
    if not user:
        return

    if user.get("role") == "student" and user.get("username") != student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if user.get("role") not in ["student", "staff", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


@router.get("/students/{student_id}/profile", response_model=StudentProfileResponse)
async def get_student_profile(student_id: str, authorization: Optional[str] = Header(None)):
    try:
        await _authorize_student_access(student_id, authorization)

        student = await mongodb.get_student(student_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        history = await mongodb.get_student_predictions(student_id, limit=10)
        history_json = mongo_to_json(history)

        latest_prediction = history_json[0] if history_json else None
        if latest_prediction and "timestamp" not in latest_prediction and "created_at" in latest_prediction:
            latest_prediction["timestamp"] = latest_prediction["created_at"]

        student_json = mongo_to_json(student)

        for entry in history_json:
            if "timestamp" not in entry and "created_at" in entry:
                entry["timestamp"] = entry["created_at"]
            entry.setdefault("top_risk_factors", [])

        return StudentProfileResponse(student=student_json, latest_prediction=latest_prediction, history=history_json)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/students/{student_id}/repredict", response_model=PredictionResponse)
async def repredict_student(student_id: str, student_data: StudentData, authorization: Optional[str] = Header(None)):
    try:
        await _authorize_student_access(student_id, authorization)

        existing = await mongodb.get_student(student_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Student not found")

        update_data = student_data.model_dump()
        await mongodb.update_student(student_id, update_data)

        risk_level, probs, top_risk_factors, engineered_features = run_prediction(student_data)

        prediction_data = {
            "student_id": student_id,
            "risk_level": risk_level,
            "risk_probabilities": probs,
            "top_risk_factors": top_risk_factors,
            "engineered_features": engineered_features,
            "created_at": datetime.utcnow(),
        }
        await mongodb.save_prediction(prediction_data)

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


@router.get("/students/{student_id}/risk-explanation", response_model=RiskExplanationResponse)
async def get_student_risk_explanation(student_id: str, authorization: Optional[str] = Header(None)):
    try:
        await _authorize_student_access(student_id, authorization)

        latest_predictions = await mongodb.get_student_predictions(student_id, limit=1)
        if not latest_predictions:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No prediction found for this student")

        latest_prediction = latest_predictions[0]
        explanation = risk_explanation_service.explain_from_prediction(student_id, latest_prediction)

        explanation_doc = {
            "student_id": student_id,
            "prediction_id": latest_prediction.get("_id"),
            "risk_level": explanation["risk_level"],
            "confidence": explanation["confidence"],
            "summary": explanation["summary"],
            "top_risk_factors": explanation["top_risk_factors"],
            "top_protective_factors": explanation["top_protective_factors"],
            "timestamp": datetime.utcnow(),
        }
        await mongodb.save_explanation(explanation_doc)

        return RiskExplanationResponse(
            student_id=explanation["student_id"],
            risk_level=explanation["risk_level"],
            confidence=explanation["confidence"],
            summary=explanation["summary"],
            top_risk_factors=explanation["top_risk_factors"],
            top_protective_factors=explanation["top_protective_factors"],
            prediction_id=explanation.get("prediction_id"),
        )
    except HTTPException:
        raise
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain", response_model=RiskExplanationResponse)
async def explain_student_risk(request: ExplainRequest, authorization: Optional[str] = Header(None)):
    return await get_student_risk_explanation(request.student_id, authorization)

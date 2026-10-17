from datetime import datetime
from typing import Dict, List, Any
import os

import numpy as np
from bson import ObjectId

from app.core import ml_models
from app.schemas.schemas import StudentData, UserResponse


def calculate_engineered_features(student_data: StudentData):
    from app.services.feature_engineering import calculate_engineered_features
    return calculate_engineered_features(student_data)


def mongo_to_json(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: mongo_to_json(v) for k, v in value.items() if k != "_id"}
    if isinstance(value, list):
        return [mongo_to_json(v) for v in value]
    return value


def build_user_response(user: Dict[str, Any]) -> UserResponse:
    return UserResponse(
        username=user.get("username", ""),
        first_name=user.get("first_name", ""),
        last_name=user.get("last_name", ""),
        email=user.get("email", ""),
        role=user.get("role", "student"),
        status=user.get("status", "active"),
    )


def _float_env(name: str, default: float) -> float:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        return float(raw_value)
    except (TypeError, ValueError):
        return default


def _apply_outcome_policy(default_label: str, probs: Dict[str, float], engineered_features: Dict[str, Any]) -> str:
    graduate_prob = float(probs.get("graduate", 0.0))
    dropout_prob = float(probs.get("dropout", 0.0))

    success_rate_sem1 = float(engineered_features.get("success_rate_sem1", 0.0))
    success_rate_sem2 = float(engineered_features.get("success_rate_sem2", 0.0))
    grade_sem1 = float(engineered_features.get("curricular_units_1st_sem_grade", 0.0))
    grade_sem2 = float(engineered_features.get("curricular_units_2nd_sem_grade", 0.0))

    graduate_prob_min = _float_env("GRADUATE_PROB_MIN", 0.10)
    graduate_dropout_max = _float_env("GRADUATE_DROPOUT_MAX", 0.35)
    graduate_success_min = _float_env("GRADUATE_SUCCESS_MIN", 0.90)
    graduate_grade_min = _float_env("GRADUATE_GRADE_MIN", 15.0)

    qualifies_for_graduate = (
        graduate_prob >= graduate_prob_min
        and dropout_prob <= graduate_dropout_max
        and success_rate_sem1 >= graduate_success_min
        and success_rate_sem2 >= graduate_success_min
        and grade_sem1 >= graduate_grade_min
        and grade_sem2 >= graduate_grade_min
    )

    if qualifies_for_graduate:
        return "Graduate"

    return default_label


def run_prediction(student_data: StudentData):
    engineered_features = calculate_engineered_features(student_data)

    if ml_models.model is None:
        risk_score = engineered_features["risk_score"]
        if risk_score < 2:
            risk_level = "Low"
            probs = {"low": 0.8, "medium": 0.15, "high": 0.05}
        elif risk_score < 4:
            risk_level = "Medium"
            probs = {"low": 0.2, "medium": 0.6, "high": 0.2}
        else:
            risk_level = "High"
            probs = {"low": 0.1, "medium": 0.2, "high": 0.7}
    else:
        feature_vector = []
        for feat in ml_models.feature_names:
            feature_vector.append(engineered_features.get(feat, 0))

        features_array = np.array([feature_vector])
        features_scaled = ml_models.scaler.transform(features_array)

        prediction = ml_models.model.predict(features_scaled)[0]
        probabilities = ml_models.model.predict_proba(features_scaled)[0]

        if ml_models.label_encoder:
            risk_level = ml_models.label_encoder.inverse_transform([prediction])[0]
            classes = ml_models.label_encoder.classes_
        else:
            risk_level = ["Graduate", "Enrolled", "Dropout"][prediction]
            classes = ["Graduate", "Enrolled", "Dropout"]

        probs = {class_name.lower(): float(probabilities[i]) for i, class_name in enumerate(classes)}
        risk_level = _apply_outcome_policy(str(risk_level), probs, engineered_features)

    top_risk_factors: List[Dict[str, Any]] = []
    if ml_models.model is not None and hasattr(ml_models.model, "feature_importances_") and ml_models.feature_names is not None:
        importances = ml_models.model.feature_importances_
        top_indices = np.argsort(importances)[-5:][::-1]
        for idx in top_indices:
            if idx < len(ml_models.feature_names):
                top_risk_factors.append(
                    {
                        "feature": ml_models.feature_names[idx],
                        "importance": float(importances[idx]),
                    }
                )

    return risk_level, probs, top_risk_factors[:3], engineered_features

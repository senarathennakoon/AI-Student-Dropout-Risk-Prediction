from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np


_REQUIRED_MODEL_FILES = {
    "model": "my_model.pkl",
    "scaler": "scaler.pkl",
    "label_encoder": "label_encoder.pkl",
    "selected_features": "selected_features.pkl",
    "feature_names": "feature_names.pkl",
    "explainer": "shap_explainer.pkl",
}


class RiskExplanationService:
    def __init__(self) -> None:
        self.model: Any = None
        self.scaler: Any = None
        self.label_encoder: Any = None
        self.selected_features: Optional[List[str]] = None
        self.feature_names: Optional[List[str]] = None
        self.explainer: Any = None
        self.model_dir: Optional[Path] = None
        self.initialized = False
        self.load_error: Optional[str] = None

    def _candidate_model_dirs(self) -> List[Path]:
        project_root = Path(__file__).resolve().parents[3]
        env_dir = os.getenv("EXPLAINABILITY_MODEL_DIR", "").strip()

        candidates: List[Path] = []
        if env_dir:
            candidates.append(Path(env_dir))

        candidates.append(project_root / "backend" / "app" / "models" / "ml_models" / "explainability")
        candidates.append(
            project_root
            / "explanability"
            / "risk-explanation-backend"
            / "risk-explanation-backend"
            / "models"
        )
        return candidates

    def _has_all_files(self, model_dir: Path) -> bool:
        return all((model_dir / filename).exists() for filename in _REQUIRED_MODEL_FILES.values())

    def initialize(self) -> None:
        if self.initialized:
            return

        for candidate in self._candidate_model_dirs():
            if not self._has_all_files(candidate):
                continue
            try:
                self.model = joblib.load(candidate / _REQUIRED_MODEL_FILES["model"])
                self.scaler = joblib.load(candidate / _REQUIRED_MODEL_FILES["scaler"])
                self.label_encoder = joblib.load(candidate / _REQUIRED_MODEL_FILES["label_encoder"])
                self.selected_features = list(joblib.load(candidate / _REQUIRED_MODEL_FILES["selected_features"]))
                self.feature_names = list(joblib.load(candidate / _REQUIRED_MODEL_FILES["feature_names"]))
                self.explainer = joblib.load(candidate / _REQUIRED_MODEL_FILES["explainer"])
                self.model_dir = candidate
                self.initialized = True
                self.load_error = None
                print(f"✅ Risk explanation artifacts loaded from: {candidate}")
                return
            except Exception as exc:
                self.load_error = str(exc)

        self.initialized = False
        if not self.load_error:
            self.load_error = "No valid explainability model directory found"
        print(f"⚠️ Risk explanation disabled: {self.load_error}")

    def status(self) -> Dict[str, Any]:
        return {
            "enabled": self.initialized,
            "model_dir": str(self.model_dir) if self.model_dir else None,
            "error": self.load_error,
        }

    def _normalize_shap_values(self, shap_values: Any, predicted_idx: int) -> np.ndarray:
        if isinstance(shap_values, list):
            return np.array(shap_values[predicted_idx][0], dtype=float)

        if isinstance(shap_values, np.ndarray):
            if shap_values.ndim == 3:
                if shap_values.shape[0] == 1:
                    return np.array(shap_values[0, :, predicted_idx], dtype=float)
                return np.array(shap_values[predicted_idx, 0, :], dtype=float)
            if shap_values.ndim == 2:
                return np.array(shap_values[0], dtype=float)

        raise ValueError("Unsupported SHAP output structure")

    def _get_advice(self, feature_name: str, is_risk_factor: bool) -> str:
        advice_map = {
            "curricular_units_2nd_sem_approved": "Increase second-semester approved units by attending support classes and completing assessments on schedule.",
            "curricular_units_1st_sem_approved": "Strengthen first-semester completion by using tutoring support and a structured weekly study plan.",
            "academic_performance_score": "Improve academic performance by tracking weekly progress and asking for help as soon as difficulties appear.",
            "success_rate_sem2": "Maintain second-semester success by keeping regular attendance and consistent assignment submission.",
            "success_rate_sem1": "Protect your first-semester momentum with steady study habits and early revision.",
            "failure_rate_sem2": "Reduce second-semester failures by prioritizing weak modules and joining remedial sessions.",
            "failure_rate_sem1": "Address first-semester failed subjects early through advisor guidance and targeted practice.",
            "tuition_fees_up_to_date": "Ensure tuition payments are completed on time to reduce financial risk.",
            "debtor": "Work with the finance office on a realistic payment plan to lower debt-related stress.",
            "grade_improvement": "Maintain grade improvement with a focused routine and regular feedback from instructors.",
            "family_support": "Increase support from family or mentors to strengthen motivation and accountability.",
            "age_at_enrollment": "Use time-management and advising support to balance academic and personal responsibilities.",
        }

        if feature_name in advice_map:
            return advice_map[feature_name]

        if is_risk_factor:
            return f"Take practical steps to improve {feature_name.replace('_', ' ')} and reduce overall risk."
        return f"Maintain strong {feature_name.replace('_', ' ')} to support consistent academic progress."

    def explain_from_prediction(
        self,
        student_id: str,
        prediction_doc: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not self.initialized:
            self.initialize()
        if not self.initialized:
            raise RuntimeError(self.load_error or "Risk explanation service unavailable")

        student_features = prediction_doc.get("engineered_features") or {}
        if not student_features:
            raise ValueError("No engineered features available for explanation")

        all_input_features = [student_features.get(feature, 0) for feature in self.feature_names or []]
        if not all_input_features:
            raise ValueError("Feature schema is empty")

        all_input_array = np.array(all_input_features, dtype=float).reshape(1, -1)
        all_input_scaled = self.scaler.transform(all_input_array)

        feature_index = {name: idx for idx, name in enumerate(self.feature_names or [])}
        selected_indices = [feature_index[name] for name in (self.selected_features or []) if name in feature_index]
        if not selected_indices:
            raise ValueError("No selected features matched feature schema")

        model_input = all_input_scaled[:, selected_indices]

        predicted_class_idx = int(self.model.predict(model_input)[0])
        probabilities = self.model.predict_proba(model_input)[0]

        predicted_label = (
            self.label_encoder.inverse_transform([predicted_class_idx])[0]
            if self.label_encoder is not None
            else str(predicted_class_idx)
        )

        shap_values = self.explainer.shap_values(model_input)
        shap_vector = self._normalize_shap_values(shap_values, predicted_class_idx)

        impacts: List[Tuple[str, float]] = list(zip(self.selected_features or [], shap_vector.tolist()))
        impacts.sort(key=lambda item: abs(item[1]), reverse=True)

        top_risk_factors = [
            {
                "feature": feature,
                "impact": round(float(impact), 4),
                "advice": self._get_advice(feature, is_risk_factor=True),
            }
            for feature, impact in impacts
            if impact > 0
        ][:5]

        top_protective_factors = [
            {
                "feature": feature,
                "impact": round(float(abs(impact)), 4),
                "advice": self._get_advice(feature, is_risk_factor=False),
            }
            for feature, impact in impacts
            if impact < 0
        ][:5]

        if not top_protective_factors:
            top_protective_factors = [
                {
                    "feature": item.get("feature", "unknown"),
                    "impact": round(float(item.get("importance", 0.0)), 4),
                    "advice": self._get_advice(item.get("feature", "unknown"), is_risk_factor=False),
                }
                for item in (prediction_doc.get("top_risk_factors") or [])[:3]
            ]

        prediction_risk_level = prediction_doc.get("risk_level") or predicted_label
        confidence = float(max(probabilities))

        return {
            "student_id": student_id,
            "risk_level": str(prediction_risk_level),
            "confidence": round(confidence, 3),
            "summary": f"{prediction_risk_level} risk prediction with explainable feature impacts",
            "top_risk_factors": top_risk_factors,
            "top_protective_factors": top_protective_factors,
            "prediction_id": str(prediction_doc.get("_id")) if prediction_doc.get("_id") else None,
            "model_risk_level": str(predicted_label),
        }


risk_explanation_service = RiskExplanationService()

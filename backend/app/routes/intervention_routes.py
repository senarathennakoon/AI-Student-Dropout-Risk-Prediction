from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Header, HTTPException, Query, status

from app.core.helpers import mongo_to_json
from app.core.security import get_current_user
from app.database.mongodb import mongodb
from app.schemas.schemas import (
    InterventionCreateRequest,
    InterventionUpdateRequest,
    InterventionResponse,
    InterventionListResponse,
)

router = APIRouter(tags=["interventions"])


def _build_intervention_id() -> str:
    return f"INT-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"


async def _ensure_staff_or_admin(authorization: Optional[str]) -> Dict[str, Any]:
    user = await get_current_user(authorization)
    if user.get("role") not in {"staff", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff or admin access required")
    return user


def _map_intervention_doc(doc: Dict[str, Any]) -> InterventionResponse:
    json_doc = mongo_to_json(doc)
    return InterventionResponse(
        intervention_id=json_doc["intervention_id"],
        student_id=json_doc["student_id"],
        staff_id=json_doc["staff_id"],
        course=json_doc.get("course"),
        risk_level=json_doc.get("risk_level"),
        risk_score=json_doc.get("risk_score"),
        risk_factors=json_doc.get("risk_factors"),
        intervention_type=json_doc["intervention_type"],
        notes=json_doc["notes"],
        status=json_doc["status"],
        date=datetime.fromisoformat(json_doc["date"]),
        created_at=datetime.fromisoformat(json_doc["created_at"]),
        updated_at=datetime.fromisoformat(json_doc["updated_at"]) if json_doc.get("updated_at") else None,
    )


def _normalize_risk_level(value: Optional[str]) -> str:
    normalized = (value or "").strip().lower()
    if normalized in {"dropout", "high"}:
        return "high"
    if normalized in {"enrolled", "medium"}:
        return "medium"
    if normalized in {"graduate", "low"}:
        return "low"
    return normalized or "unknown"


def _extract_high_probability(prediction: Dict[str, Any]) -> float:
    probs = prediction.get("risk_probabilities") or {}
    if isinstance(probs, dict):
        if isinstance(probs.get("high"), (int, float)):
            return float(probs["high"])
        if isinstance(probs.get("dropout"), (int, float)):
            return float(probs["dropout"])

    risk_level = _normalize_risk_level(prediction.get("risk_level"))
    if risk_level == "high":
        return 0.8
    if risk_level == "medium":
        return 0.5
    if risk_level == "low":
        return 0.2
    return 0.0


def _humanize_feature_name(feature: str) -> str:
    return feature.replace("_", " ").strip().capitalize()


async def _enrich_intervention_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not rows:
        return rows

    student_ids = list({str(row.get("student_id")) for row in rows if row.get("student_id")})
    if not student_ids:
        return rows

    student_docs = await mongodb.db.students.find(
        {"student_id": {"$in": student_ids}},
        {"student_id": 1, "course": 1},
    ).to_list(length=5000)
    student_by_id = {str(doc.get("student_id")): doc for doc in student_docs}

    prediction_pipeline = [
        {"$match": {"student_id": {"$in": student_ids}}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$student_id", "latest": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$latest"}},
        {
            "$project": {
                "student_id": 1,
                "risk_level": 1,
                "risk_probabilities": 1,
                "engineered_features": 1,
                "top_risk_factors": 1,
            }
        },
    ]
    prediction_docs = await mongodb.db.predictions.aggregate(prediction_pipeline).to_list(length=5000)
    prediction_by_student_id = {str(doc.get("student_id")): doc for doc in prediction_docs}

    enriched_rows: List[Dict[str, Any]] = []
    for row in rows:
        student_id = str(row.get("student_id") or "")
        student = student_by_id.get(student_id, {})
        prediction = prediction_by_student_id.get(student_id, {})

        engineered = prediction.get("engineered_features") or {}
        risk_score_raw = engineered.get("risk_score") if isinstance(engineered, dict) else None
        if isinstance(risk_score_raw, (int, float)):
            risk_score = round(float(risk_score_raw), 2)
        else:
            risk_score = round(_extract_high_probability(prediction) * 10.0, 2)

        raw_factors = prediction.get("top_risk_factors") or []
        factors: List[str] = []
        if isinstance(raw_factors, list):
            for factor in raw_factors[:3]:
                if isinstance(factor, dict) and factor.get("feature"):
                    factors.append(_humanize_feature_name(str(factor.get("feature"))))

        if not factors:
            factors = ["No factors"]

        enriched = dict(row)
        enriched["course"] = student.get("course")
        enriched["risk_level"] = prediction.get("risk_level")
        enriched["risk_score"] = risk_score
        enriched["risk_factors"] = factors
        enriched_rows.append(enriched)

    return enriched_rows


@router.post("/interventions", response_model=InterventionResponse)
async def create_intervention(request: InterventionCreateRequest, authorization: Optional[str] = Header(None)):
    user = await _ensure_staff_or_admin(authorization)

    student = await mongodb.get_student(request.student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    staff_id = request.staff_id if user.get("role") == "admin" and request.staff_id else user.get("username")
    if not staff_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid staff identity")

    intervention = {
        "intervention_id": _build_intervention_id(),
        "student_id": request.student_id,
        "staff_id": staff_id,
        "intervention_type": request.intervention_type,
        "notes": request.notes,
        "status": request.status,
        "date": request.date,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    await mongodb.create_intervention(intervention)
    enriched_items = await _enrich_intervention_rows([intervention])
    return _map_intervention_doc(enriched_items[0])


@router.get("/interventions", response_model=InterventionListResponse)
async def list_interventions(
    student_id: Optional[str] = Query(None),
    staff_id: Optional[str] = Query(None),
    intervention_type: Optional[str] = Query(None),
    status_value: Optional[str] = Query(None, alias="status"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    authorization: Optional[str] = Header(None),
):
    user = await _ensure_staff_or_admin(authorization)

    filters: Dict[str, Any] = {}
    if student_id:
        filters["student_id"] = student_id
    if intervention_type:
        filters["intervention_type"] = intervention_type
    if status_value:
        filters["status"] = status_value

    if start_date or end_date:
        date_filter: Dict[str, Any] = {}
        if start_date:
            date_filter["$gte"] = start_date
        if end_date:
            date_filter["$lte"] = end_date
        filters["date"] = date_filter

    if user.get("role") == "staff":
        filters["staff_id"] = user.get("username")
    elif staff_id:
        filters["staff_id"] = staff_id

    total = await mongodb.count_interventions(filters)
    rows = await mongodb.list_interventions(filters=filters, skip=skip, limit=limit)
    enriched_rows = await _enrich_intervention_rows(rows)
    return InterventionListResponse(total=total, items=[_map_intervention_doc(row) for row in enriched_rows])


@router.get("/interventions/{intervention_id}", response_model=InterventionResponse)
async def get_intervention(intervention_id: str, authorization: Optional[str] = Header(None)):
    user = await _ensure_staff_or_admin(authorization)

    doc = await mongodb.get_intervention_by_intervention_id(intervention_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intervention not found")

    if user.get("role") == "staff" and doc.get("staff_id") != user.get("username"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    enriched_items = await _enrich_intervention_rows([doc])
    return _map_intervention_doc(enriched_items[0])


@router.patch("/interventions/{intervention_id}", response_model=InterventionResponse)
async def update_intervention(
    intervention_id: str,
    request: InterventionUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    user = await _ensure_staff_or_admin(authorization)

    existing = await mongodb.get_intervention_by_intervention_id(intervention_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intervention not found")

    if user.get("role") == "staff" and existing.get("staff_id") != user.get("username"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    update_data = request.model_dump(exclude_none=True)
    if user.get("role") == "staff":
        update_data.pop("staff_id", None)

    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    updated = await mongodb.update_intervention_by_intervention_id(intervention_id, update_data)
    if not updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Intervention update failed")

    saved = await mongodb.get_intervention_by_intervention_id(intervention_id)
    if not saved:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intervention not found")

    enriched_items = await _enrich_intervention_rows([saved])
    return _map_intervention_doc(enriched_items[0])


@router.delete("/interventions/{intervention_id}")
async def delete_intervention(intervention_id: str, authorization: Optional[str] = Header(None)):
    user = await _ensure_staff_or_admin(authorization)

    existing = await mongodb.get_intervention_by_intervention_id(intervention_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intervention not found")

    if user.get("role") == "staff" and existing.get("staff_id") != user.get("username"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    deleted = await mongodb.delete_intervention_by_intervention_id(intervention_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Intervention delete failed")

    return {"message": "Intervention deleted successfully"}

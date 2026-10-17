from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Header, HTTPException, status, Query

from app.database.mongodb import mongodb
from app.core.security import get_current_user

router = APIRouter(tags=["staff"])


def _normalize_risk_level(value: Optional[str]) -> str:
    if not value:
        return "unknown"

    normalized = value.strip().lower()
    if normalized in {"dropout", "high"}:
        return "high"
    if normalized in {"enrolled", "medium"}:
        return "medium"
    if normalized in {"graduate", "low"}:
        return "low"
    return normalized


def _extract_high_probability(prediction: Dict[str, Any]) -> float:
    probs = prediction.get("risk_probabilities") or {}

    if isinstance(probs, dict):
        if "high" in probs and isinstance(probs.get("high"), (int, float)):
            return float(probs["high"])
        if "dropout" in probs and isinstance(probs.get("dropout"), (int, float)):
            return float(probs["dropout"])

    engineered = prediction.get("engineered_features") or {}
    if isinstance(engineered, dict) and isinstance(engineered.get("risk_score"), (int, float)):
        return min(max(float(engineered["risk_score"]) / 6.0, 0.0), 1.0)

    risk_level = _normalize_risk_level(prediction.get("risk_level"))
    if risk_level == "high":
        return 0.8
    if risk_level == "medium":
        return 0.5
    if risk_level == "low":
        return 0.2
    return 0.0


def _extract_confidence(prediction: Dict[str, Any]) -> float:
    probs = prediction.get("risk_probabilities") or {}
    risk_level = _normalize_risk_level(prediction.get("risk_level"))

    if isinstance(probs, dict):
        if risk_level == "high":
            high_value = probs.get("high", probs.get("dropout"))
            if isinstance(high_value, (int, float)):
                return float(high_value)
        if risk_level == "medium":
            medium_value = probs.get("medium", probs.get("enrolled"))
            if isinstance(medium_value, (int, float)):
                return float(medium_value)
        if risk_level == "low":
            low_value = probs.get("low", probs.get("graduate"))
            if isinstance(low_value, (int, float)):
                return float(low_value)

        numeric_probs = [float(value) for value in probs.values() if isinstance(value, (int, float))]
        if numeric_probs:
            return max(numeric_probs)

    return 0.0


async def _ensure_staff_or_admin(authorization: Optional[str]) -> Dict[str, Any]:
    user = await get_current_user(authorization)
    if user.get("role") not in {"staff", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff or admin access required")
    return user


async def _latest_predictions_with_course() -> List[Dict[str, Any]]:
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$student_id", "latest_prediction": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$latest_prediction"}},
        {
            "$lookup": {
                "from": "students",
                "localField": "student_id",
                "foreignField": "student_id",
                "as": "student",
            }
        },
        {"$unwind": {"path": "$student", "preserveNullAndEmptyArrays": True}},
        {
            "$project": {
                "student_id": 1,
                "risk_level": 1,
                "risk_probabilities": 1,
                "engineered_features": 1,
                "created_at": 1,
                "course": "$student.course",
            }
        },
    ]

    cursor = mongodb.db.predictions.aggregate(pipeline)
    return await cursor.to_list(length=5000)


@router.get("/staff/dashboard")
async def get_staff_dashboard(authorization: Optional[str] = Header(None)):
    await _ensure_staff_or_admin(authorization)

    total_students = await mongodb.db.students.count_documents({})
    latest_predictions = await _latest_predictions_with_course()

    counts = {"high": 0, "medium": 0, "low": 0}
    for prediction in latest_predictions:
        risk_level = _normalize_risk_level(prediction.get("risk_level"))
        if risk_level in counts:
            counts[risk_level] += 1

    return {
        "total_students": total_students,
        "high_risk": counts["high"],
        "medium_risk": counts["medium"],
        "low_risk": counts["low"],
        "integrated_from": "team_member_staff_module",
    }


@router.get("/staff/high-risk")
async def get_high_risk_students(
    limit: int = Query(10, ge=1, le=100),
    authorization: Optional[str] = Header(None),
):
    await _ensure_staff_or_admin(authorization)

    latest_predictions = await _latest_predictions_with_course()

    high_risk_records: List[Dict[str, Any]] = []
    for prediction in latest_predictions:
        risk_level = _normalize_risk_level(prediction.get("risk_level"))
        high_prob = _extract_high_probability(prediction)
        if risk_level == "high" or high_prob >= 0.5:
            high_risk_records.append(
                {
                    "student_id": prediction.get("student_id"),
                    "course": prediction.get("course"),
                    "risk_level": prediction.get("risk_level"),
                    "high_risk_probability": round(high_prob, 4),
                }
            )

    high_risk_records.sort(key=lambda row: row.get("high_risk_probability", 0), reverse=True)
    return high_risk_records[:limit]


@router.get("/staff/courses")
async def get_course_analytics(
    limit: int = Query(20, ge=1, le=100),
    authorization: Optional[str] = Header(None),
):
    await _ensure_staff_or_admin(authorization)

    latest_predictions = await _latest_predictions_with_course()

    per_course: Dict[str, Dict[str, Any]] = {}
    for prediction in latest_predictions:
        course = prediction.get("course")
        if course is None:
            continue

        course_key = str(course)
        if course_key not in per_course:
            per_course[course_key] = {
                "course_id": course,
                "total_students": 0,
                "high_risk_count": 0,
                "high_risk_probability_sum": 0.0,
            }

        row = per_course[course_key]
        row["total_students"] += 1

        high_prob = _extract_high_probability(prediction)
        row["high_risk_probability_sum"] += high_prob

        risk_level = _normalize_risk_level(prediction.get("risk_level"))
        if risk_level == "high" or high_prob >= 0.5:
            row["high_risk_count"] += 1

    analytics: List[Dict[str, Any]] = []
    for row in per_course.values():
        total = row["total_students"]
        avg_prob = row["high_risk_probability_sum"] / total if total else 0.0
        analytics.append(
            {
                "course_id": row["course_id"],
                "total_students": total,
                "high_risk_count": row["high_risk_count"],
                "avg_high_risk_probability": round(avg_prob, 4),
            }
        )

    analytics.sort(key=lambda row: row["total_students"], reverse=True)
    return analytics[:limit]


@router.get("/staff/risk-distribution")
async def get_risk_distribution(authorization: Optional[str] = Header(None)):
    await _ensure_staff_or_admin(authorization)

    latest_predictions = await _latest_predictions_with_course()
    counts = {"high": 0, "medium": 0, "low": 0}
    for prediction in latest_predictions:
        risk_level = _normalize_risk_level(prediction.get("risk_level"))
        if risk_level in counts:
            counts[risk_level] += 1

    return [
        {"risk_level": "HIGH", "count": counts["high"]},
        {"risk_level": "MEDIUM", "count": counts["medium"]},
        {"risk_level": "LOW", "count": counts["low"]},
    ]


@router.get("/staff/monthly-trends")
async def get_monthly_trends(
    months: int = Query(6, ge=1, le=24),
    authorization: Optional[str] = Header(None),
):
    await _ensure_staff_or_admin(authorization)

    pipeline = [
        {
            "$project": {
                "month": {"$dateToString": {"format": "%Y-%m", "date": "$created_at"}},
                "risk_level": 1,
            }
        },
        {
            "$group": {
                "_id": {"month": "$month", "risk_level": "$risk_level"},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.month": -1}},
    ]

    rows = await mongodb.db.predictions.aggregate(pipeline).to_list(length=5000)
    monthly: Dict[str, Dict[str, int]] = {}
    for row in rows:
        month = row.get("_id", {}).get("month")
        raw_level = row.get("_id", {}).get("risk_level")
        if not month:
            continue
        if month not in monthly:
            monthly[month] = {"high": 0, "medium": 0, "low": 0}
        risk_level = _normalize_risk_level(raw_level)
        if risk_level in monthly[month]:
            monthly[month][risk_level] += int(row.get("count", 0))

    trend_rows = []
    for month in sorted(monthly.keys())[-months:]:
        values = monthly[month]
        trend_rows.append(
            {
                "month": month,
                "high": values["high"],
                "medium": values["medium"],
                "low": values["low"],
                "total": values["high"] + values["medium"] + values["low"],
            }
        )

    return trend_rows


@router.get("/staff/students")
async def get_staff_students(
    risk_level: Optional[str] = Query(None),
    course: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    authorization: Optional[str] = Header(None),
):
    await _ensure_staff_or_admin(authorization)

    latest_predictions = await _latest_predictions_with_course()

    if risk_level:
        normalized_requested = _normalize_risk_level(risk_level)
        latest_predictions = [
            row for row in latest_predictions if _normalize_risk_level(row.get("risk_level")) == normalized_requested
        ]

    if course is not None:
        latest_predictions = [row for row in latest_predictions if row.get("course") == course]

    if search:
        search_lower = search.lower()
        latest_predictions = [
            row
            for row in latest_predictions
            if search_lower in str(row.get("student_id", "")).lower()
        ]

    latest_predictions.sort(
        key=lambda row: row.get("high_risk_probability", _extract_high_probability(row)),
        reverse=True,
    )

    total = len(latest_predictions)
    page = latest_predictions[skip: skip + limit]

    return {
        "total": total,
        "items": [
            {
                "student_id": row.get("student_id"),
                "course": row.get("course"),
                "risk_level": row.get("risk_level"),
                "high_risk_probability": round(_extract_high_probability(row), 4),
                "created_at": row.get("created_at"),
            }
            for row in page
        ],
    }


@router.get("/staff/history")
async def get_staff_history(
    search: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    course: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    authorization: Optional[str] = Header(None),
):
    await _ensure_staff_or_admin(authorization)

    match_query: Dict[str, Any] = {}
    if search:
        match_query["student_id"] = {"$regex": search, "$options": "i"}

    normalized_requested_risk = _normalize_risk_level(risk_level) if risk_level else None

    base_pipeline: List[Dict[str, Any]] = [
        {"$match": match_query},
        {
            "$lookup": {
                "from": "students",
                "localField": "student_id",
                "foreignField": "student_id",
                "as": "student",
            }
        },
        {"$unwind": {"path": "$student", "preserveNullAndEmptyArrays": True}},
        {
            "$addFields": {
                "normalized_risk": {
                    "$switch": {
                        "branches": [
                            {
                                "case": {
                                    "$in": [
                                        {"$toLower": {"$ifNull": ["$risk_level", ""]}},
                                        ["dropout", "high"],
                                    ]
                                },
                                "then": "high",
                            },
                            {
                                "case": {
                                    "$in": [
                                        {"$toLower": {"$ifNull": ["$risk_level", ""]}},
                                        ["enrolled", "medium"],
                                    ]
                                },
                                "then": "medium",
                            },
                            {
                                "case": {
                                    "$in": [
                                        {"$toLower": {"$ifNull": ["$risk_level", ""]}},
                                        ["graduate", "low"],
                                    ]
                                },
                                "then": "low",
                            },
                        ],
                        "default": {"$toLower": {"$ifNull": ["$risk_level", "unknown"]}},
                    }
                }
            }
        },
    ]

    if normalized_requested_risk:
        base_pipeline.append({"$match": {"normalized_risk": normalized_requested_risk}})
    if course is not None:
        base_pipeline.append({"$match": {"student.course": course}})

    count_pipeline = base_pipeline + [{"$group": {"_id": "$normalized_risk", "count": {"$sum": 1}}}]
    count_rows = await mongodb.db.predictions.aggregate(count_pipeline).to_list(length=100)

    counts = {"high": 0, "medium": 0, "low": 0}
    for row in count_rows:
        normalized = str(row.get("_id") or "").lower()
        if normalized in counts:
            counts[normalized] += int(row.get("count", 0))

    total_rows = await mongodb.db.predictions.aggregate(base_pipeline + [{"$count": "total"}]).to_list(length=1)
    total = int(total_rows[0]["total"]) if total_rows else 0

    item_pipeline = base_pipeline + [
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {
            "$project": {
                "student_id": 1,
                "risk_level": 1,
                "risk_probabilities": 1,
                "created_at": 1,
                "course": "$student.course",
            }
        },
    ]
    rows = await mongodb.db.predictions.aggregate(item_pipeline).to_list(length=limit)

    items: List[Dict[str, Any]] = []
    for row in rows:
        confidence = _extract_confidence(row)
        items.append(
            {
                "prediction_id": str(row.get("_id")),
                "student_id": row.get("student_id"),
                "created_at": row.get("created_at"),
                "risk_level": row.get("risk_level"),
                "course": row.get("course"),
                "confidence": round(confidence, 4),
                "risk_probabilities": row.get("risk_probabilities") or {},
            }
        )

    return {
        "total": total,
        "low_count": counts["low"],
        "medium_count": counts["medium"],
        "high_count": counts["high"],
        "items": items,
    }
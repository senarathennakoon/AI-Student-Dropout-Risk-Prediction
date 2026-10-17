from datetime import datetime
from typing import Optional, Dict, Any, List
import csv
import io

from fastapi import APIRouter, Header, HTTPException, Query, Response, status

from app.core.helpers import mongo_to_json
from app.core.security import get_current_user
from app.database.mongodb import mongodb
from app.schemas.schemas import (
    AnalyticsReportGenerateRequest,
    AnalyticsReportResponse,
    AnalyticsReportListResponse,
    StudentReportItem,
    StudentReportListResponse,
)

router = APIRouter(tags=["reports"])


def _build_report_id(report_type: str) -> str:
    return f"RPT-{report_type}-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"


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


async def _ensure_staff_or_admin(authorization: Optional[str]) -> Dict[str, Any]:
    user = await get_current_user(authorization)
    if user.get("role") not in {"staff", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff or admin access required")
    return user


async def _latest_predictions() -> List[Dict[str, Any]]:
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$student_id", "latest_prediction": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$latest_prediction"}},
    ]
    cursor = mongodb.db.predictions.aggregate(pipeline)
    return await cursor.to_list(length=10000)


def _to_report_response(doc: Dict[str, Any]) -> AnalyticsReportResponse:
    item = mongo_to_json(doc)
    return AnalyticsReportResponse(
        report_id=item["report_id"],
        report_type=item["report_type"],
        generated_by=item["generated_by"],
        generated_date=datetime.fromisoformat(item["generated_date"]),
        start_date=datetime.fromisoformat(item["start_date"]) if item.get("start_date") else None,
        end_date=datetime.fromisoformat(item["end_date"]) if item.get("end_date") else None,
        data=item.get("data", {}),
    )


def _extract_high_risk_probability(risk_probabilities: Any) -> float:
    if not isinstance(risk_probabilities, dict):
        return 0.0

    high_raw = risk_probabilities.get("dropout")
    if high_raw is None:
        high_raw = risk_probabilities.get("high", 0)

    try:
        return float(high_raw)
    except (TypeError, ValueError):
        return 0.0


def _extract_risk_factors(row: Dict[str, Any]) -> List[str]:
    values = row.get("top_risk_factors")
    if not isinstance(values, list):
        return []

    factors: List[str] = []
    for value in values:
        if isinstance(value, dict):
            feature = value.get("feature")
            if isinstance(feature, str) and feature.strip():
                factors.append(feature.strip())
        elif isinstance(value, str) and value.strip():
            factors.append(value.strip())
    return factors[:5]


def _to_student_report_item(row: Dict[str, Any]) -> StudentReportItem:
    prediction_id = str(row.get("_id", ""))
    created_at = row.get("created_at") or datetime.utcnow()
    if not isinstance(created_at, datetime):
        try:
            created_at = datetime.fromisoformat(str(created_at))
        except ValueError:
            created_at = datetime.utcnow()

    return StudentReportItem(
        prediction_id=prediction_id,
        student_id=str(row.get("student_id", "")),
        course=row.get("course"),
        risk_level=_normalize_risk_level(row.get("risk_level")).upper(),
        high_risk_probability=round(_extract_high_risk_probability(row.get("risk_probabilities")), 6),
        top_risk_factors=_extract_risk_factors(row),
        created_at=created_at,
    )


async def _list_student_report_items(
    student_id: Optional[str],
    skip: int,
    limit: int,
) -> StudentReportListResponse:
    match_filter: Dict[str, Any] = {}
    if student_id:
        match_filter["student_id"] = {"$regex": student_id, "$options": "i"}

    count_pipeline: List[Dict[str, Any]] = []
    if match_filter:
        count_pipeline.append({"$match": match_filter})
    count_pipeline.extend([
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$student_id", "latest_prediction": {"$first": "$$ROOT"}}},
        {"$count": "total"},
    ])

    count_rows = await mongodb.db.predictions.aggregate(count_pipeline).to_list(length=1)
    total = int(count_rows[0]["total"]) if count_rows else 0

    data_pipeline: List[Dict[str, Any]] = []
    if match_filter:
        data_pipeline.append({"$match": match_filter})
    data_pipeline.extend([
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
        {
            "$addFields": {
                "course": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$student.course", 0]},
                        "$engineered_features.course",
                    ]
                }
            }
        },
        {"$skip": skip},
        {"$limit": limit},
    ])

    rows = await mongodb.db.predictions.aggregate(data_pipeline).to_list(length=limit)
    items = [_to_student_report_item(row) for row in rows]
    return StudentReportListResponse(total=total, items=items)


def _csv_response(filename: str, rows: List[Dict[str, Any]], headers: List[str]) -> Response:
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/reports/generate", response_model=AnalyticsReportResponse)
async def generate_report(request: AnalyticsReportGenerateRequest, authorization: Optional[str] = Header(None)):
    user = await _ensure_staff_or_admin(authorization)
    latest = await _latest_predictions()

    if request.report_type == "risk_summary":
        counts = {"high": 0, "medium": 0, "low": 0}
        for row in latest:
            risk_level = _normalize_risk_level(row.get("risk_level"))
            if risk_level in counts:
                counts[risk_level] += 1
        data: Dict[str, Any] = {
            "total_students": sum(counts.values()),
            "risk_distribution": counts,
        }
    elif request.report_type == "course_breakdown":
        per_course: Dict[str, Dict[str, Any]] = {}
        for row in latest:
            key = str(row.get("engineered_features", {}).get("course", "unknown"))
            if key not in per_course:
                per_course[key] = {"course": key, "high": 0, "medium": 0, "low": 0, "total": 0}
            risk_level = _normalize_risk_level(row.get("risk_level"))
            if risk_level in {"high", "medium", "low"}:
                per_course[key][risk_level] += 1
            per_course[key]["total"] += 1
        data = {"courses": list(per_course.values())}
    else:
        monthly: Dict[str, Dict[str, int]] = {}
        for row in latest:
            created_at = row.get("created_at")
            if not created_at:
                continue
            ym = created_at.strftime("%Y-%m") if hasattr(created_at, "strftime") else str(created_at)[:7]
            if ym not in monthly:
                monthly[ym] = {"high": 0, "medium": 0, "low": 0}
            risk_level = _normalize_risk_level(row.get("risk_level"))
            if risk_level in monthly[ym]:
                monthly[ym][risk_level] += 1
        data = {
            "monthly_trends": [
                {
                    "month": month,
                    "high": values["high"],
                    "medium": values["medium"],
                    "low": values["low"],
                    "total": values["high"] + values["medium"] + values["low"],
                }
                for month, values in sorted(monthly.items())
            ]
        }

    report = {
        "report_id": _build_report_id(request.report_type),
        "report_type": request.report_type,
        "generated_by": user.get("username", "system"),
        "generated_date": datetime.utcnow(),
        "start_date": request.start_date,
        "end_date": request.end_date,
        "data": data,
    }
    await mongodb.create_analytics_report(report)
    return _to_report_response(report)


@router.get("/reports", response_model=AnalyticsReportListResponse)
async def list_reports(
    report_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    authorization: Optional[str] = Header(None),
):
    await _ensure_staff_or_admin(authorization)

    filters: Dict[str, Any] = {}
    if report_type:
        filters["report_type"] = report_type

    if start_date or end_date:
        generated_filter: Dict[str, Any] = {}
        if start_date:
            generated_filter["$gte"] = start_date
        if end_date:
            generated_filter["$lte"] = end_date
        filters["generated_date"] = generated_filter

    total = await mongodb.count_analytics_reports(filters)
    rows = await mongodb.list_analytics_reports(filters=filters, skip=skip, limit=limit)
    return AnalyticsReportListResponse(total=total, items=[_to_report_response(row) for row in rows])


@router.get("/reports/csv")
async def download_reports_csv(
    report_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    authorization: Optional[str] = Header(None),
):
    await _ensure_staff_or_admin(authorization)

    filters: Dict[str, Any] = {}
    if report_type:
        filters["report_type"] = report_type

    if start_date or end_date:
        generated_filter: Dict[str, Any] = {}
        if start_date:
            generated_filter["$gte"] = start_date
        if end_date:
            generated_filter["$lte"] = end_date
        filters["generated_date"] = generated_filter

    rows = await mongodb.list_analytics_reports(filters=filters, skip=0, limit=5000)
    csv_rows: List[Dict[str, Any]] = []
    for row in rows:
        item = _to_report_response(row)
        csv_rows.append(
            {
                "report_id": item.report_id,
                "report_type": item.report_type,
                "generated_by": item.generated_by,
                "generated_date": item.generated_date.isoformat(),
                "start_date": item.start_date.isoformat() if item.start_date else "",
                "end_date": item.end_date.isoformat() if item.end_date else "",
                "data": str(item.data),
            }
        )

    return _csv_response(
        filename=f"analytics_reports_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv",
        rows=csv_rows,
        headers=["report_id", "report_type", "generated_by", "generated_date", "start_date", "end_date", "data"],
    )


@router.get("/reports/students", response_model=StudentReportListResponse)
async def list_student_reports(
    student_id: Optional[str] = Query(None, description="Student ID search"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    authorization: Optional[str] = Header(None),
):
    await _ensure_staff_or_admin(authorization)
    return await _list_student_report_items(student_id=student_id, skip=skip, limit=limit)


@router.get("/reports/students/csv")
async def download_student_reports_csv(
    student_id: Optional[str] = Query(None, description="Student ID search"),
    authorization: Optional[str] = Header(None),
):
    await _ensure_staff_or_admin(authorization)

    result = await _list_student_report_items(student_id=student_id, skip=0, limit=5000)
    csv_rows = [
        {
            "prediction_id": item.prediction_id,
            "student_id": item.student_id,
            "course": item.course,
            "risk_level": item.risk_level,
            "high_risk_probability": item.high_risk_probability,
            "top_risk_factors": "; ".join(item.top_risk_factors),
            "created_at": item.created_at.isoformat(),
        }
        for item in result.items
    ]

    return _csv_response(
        filename=f"student_reports_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv",
        rows=csv_rows,
        headers=[
            "prediction_id",
            "student_id",
            "course",
            "risk_level",
            "high_risk_probability",
            "top_risk_factors",
            "created_at",
        ],
    )


@router.get("/reports/{report_id}/csv")
async def download_single_report_csv(report_id: str, authorization: Optional[str] = Header(None)):
    await _ensure_staff_or_admin(authorization)

    row = await mongodb.get_analytics_report_by_report_id(report_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    item = _to_report_response(row)
    csv_rows = [
        {
            "report_id": item.report_id,
            "report_type": item.report_type,
            "generated_by": item.generated_by,
            "generated_date": item.generated_date.isoformat(),
            "start_date": item.start_date.isoformat() if item.start_date else "",
            "end_date": item.end_date.isoformat() if item.end_date else "",
            "data": str(item.data),
        }
    ]

    return _csv_response(
        filename=f"{item.report_id}.csv",
        rows=csv_rows,
        headers=["report_id", "report_type", "generated_by", "generated_date", "start_date", "end_date", "data"],
    )


@router.get("/reports/{report_id}", response_model=AnalyticsReportResponse)
async def get_report(report_id: str, authorization: Optional[str] = Header(None)):
    await _ensure_staff_or_admin(authorization)

    row = await mongodb.get_analytics_report_by_report_id(report_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    return _to_report_response(row)

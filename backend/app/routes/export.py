"""
Data Export Routes for Telemetry and Diagnostics.
Streams CSV files for academic analysis, external research, and maintenance reports.
"""

import io
import csv
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import TelemetryRecord

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("/telemetry.csv")
def export_telemetry_csv(
    machine_id: Optional[str] = None,
    limit: int = Query(2000, ge=1, le=10000),
    db: Session = Depends(get_db)
):
    """Generate and stream a CSV file containing historical telemetry records."""
    query = db.query(TelemetryRecord)
    if machine_id:
        query = query.filter(TelemetryRecord.machine_id == machine_id)

    records = query.order_by(desc(TelemetryRecord.timestamp)).limit(limit).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "id",
        "machine_id",
        "sequence",
        "timestamp_utc",
        "data_source",
        "vibration_rms_ms2",
        "vibration_peak_ms2",
        "vibration_p2p_ms2",
        "vibration_std_ms2",
        "crest_factor",
        "kurtosis",
        "skewness",
        "temperature_c",
        "prediction",
        "confidence",
        "inference_location",
        "model_version",
        "is_anomaly",
    ])

    for r in records:
        writer.writerow([
            r.id,
            r.machine_id,
            r.sequence,
            r.timestamp.isoformat() if r.timestamp else "",
            r.data_source,
            r.vibration_rms,
            r.vibration_peak,
            r.vibration_p2p,
            r.vibration_std,
            r.crest_factor,
            r.kurtosis,
            r.skewness,
            r.temperature_c,
            r.prediction,
            r.confidence,
            r.inference_location,
            r.model_version or "",
            r.is_anomaly,
        ])

    csv_data = output.getvalue()
    filename = f"telemetry_{machine_id or 'all'}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

"""
Telemetry Ingestion and Historical Query Routes.
Accepts ESP32 hardware and simulation telemetry payloads,
validates device authentication, persists records, and broadcasts live updates.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import TelemetryPayload, TelemetryResponse
from app.config import settings
from app import crud
from app.routes.websocket import ws_manager

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


@router.post("", response_model=TelemetryResponse, status_code=status.HTTP_201_CREATED)
async def ingest_telemetry(
    payload: TelemetryPayload,
    x_device_token: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Ingest a telemetry message from an ESP32 device or simulator.
    Evaluates vibration and temperature thresholds, triggers alerts if necessary,
    and broadcasts live event to connected WebSocket clients.
    """
    # Verify device token if provided by hardware (or optional in student prototype mode)
    if x_device_token and x_device_token != settings.DEVICE_AUTH_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid device authentication token."
        )

    record, alert = crud.save_telemetry(db, payload)

    # Broadcast to WebSocket subscribers
    telemetry_event = {
        "type": "telemetry",
        "data": {
            "id": record.id,
            "machine_id": record.machine_id,
            "sequence": record.sequence,
            "timestamp": record.timestamp.isoformat(),
            "data_source": record.data_source,
            "vibration_rms": record.vibration_rms,
            "vibration_peak": record.vibration_peak,
            "vibration_p2p": record.vibration_p2p,
            "crest_factor": record.crest_factor,
            "kurtosis": record.kurtosis,
            "accel_x": record.accel_x,
            "accel_y": record.accel_y,
            "accel_z": record.accel_z,
            "temperature_c": record.temperature_c,
            "prediction": record.prediction,
            "confidence": record.confidence,
            "inference_location": record.inference_location,
            "is_anomaly": record.is_anomaly,
        }
    }
    await ws_manager.broadcast(telemetry_event)

    if alert:
        alert_event = {
            "type": "alert",
            "data": {
                "id": alert.id,
                "machine_id": alert.machine_id,
                "timestamp": alert.timestamp.isoformat(),
                "severity": alert.severity,
                "triggering_metric": alert.triggering_metric,
                "triggering_value": alert.triggering_value,
                "threshold_value": alert.threshold_value,
                "message": alert.message,
                "is_acknowledged": alert.is_acknowledged,
            }
        }
        await ws_manager.broadcast(alert_event)

    return record


@router.get("/latest/{machine_id}", response_model=TelemetryResponse)
def read_latest_telemetry(machine_id: str, db: Session = Depends(get_db)):
    """Fetch the most recent telemetry measurement for a specific machine."""
    record = crud.get_latest_telemetry(db, machine_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No telemetry records found for machine '{machine_id}'."
        )
    return record


@router.get("/history/{machine_id}", response_model=List[TelemetryResponse])
def read_telemetry_history(
    machine_id: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Query paginated historical telemetry for trend analysis and charting."""
    return crud.get_telemetry_history(
        db,
        machine_id=machine_id,
        limit=limit,
        offset=offset,
        start_time=start_time,
        end_time=end_time
    )

"""
Alerts and Notification API Routes.
Manages machine anomaly alerts, severity classification, and operator acknowledgements.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import AlertResponse, AlertAcknowledgeRequest
from app import crud
from app.routes.websocket import ws_manager

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertResponse])
def read_alerts(
    machine_id: Optional[str] = None,
    severity: Optional[str] = Query(None, pattern=r"^(warning|critical)$"),
    unacknowledged_only: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieve filtered alerts history."""
    return crud.get_alerts(
        db,
        machine_id=machine_id,
        severity=severity,
        unacknowledged_only=unacknowledged_only,
        limit=limit,
        offset=offset
    )


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: int,
    req: AlertAcknowledgeRequest,
    db: Session = Depends(get_db)
):
    """Acknowledge an active warning or critical alert."""
    alert = crud.acknowledge_alert(db, alert_id, req.acknowledged_by)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found."
        )

    # Broadcast acknowledgement update
    ack_event = {
        "type": "alert_acknowledged",
        "data": {
            "id": alert.id,
            "machine_id": alert.machine_id,
            "is_acknowledged": True,
            "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
            "acknowledged_by": alert.acknowledged_by,
        }
    }
    await ws_manager.broadcast(ack_event)

    return alert

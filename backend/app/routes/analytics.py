"""
Historical Analytics and Health Scoring Routes.
Calculates machine uptime, fault frequency distributions, and multi-sensor trends.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import AnalyticsSummaryResponse
from app import crud

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/{machine_id}", response_model=AnalyticsSummaryResponse)
def read_machine_analytics(machine_id: str, db: Session = Depends(get_db)):
    """
    Compute condition monitoring analytics for a given machine:
    - Observed uptime percentage
    - Fault distribution counts
    - Total warnings and critical events
    - Recent vibration and temperature trend vectors
    """
    machine = crud.get_machine(db, machine_id)
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine '{machine_id}' not found."
        )

    summary = crud.get_analytics_summary(db, machine_id)
    return summary

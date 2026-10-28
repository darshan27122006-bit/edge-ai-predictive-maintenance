"""
Machine Management API Routes.
Provides full CRUD for monitored machinery and operating threshold configurations.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import MachineCreate, MachineUpdate, MachineResponse
from app import crud

router = APIRouter(prefix="/machines", tags=["Machines"])


@router.get("", response_model=List[MachineResponse])
def read_machines(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Retrieve all registered machinery."""
    return crud.get_machines(db, skip=skip, limit=limit)


@router.post("", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(machine: MachineCreate, db: Session = Depends(get_db)):
    """Register a new rotating machine with vibration/temperature alert thresholds."""
    existing = crud.get_machine(db, machine.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Machine with ID '{machine.id}' already exists."
        )
    return crud.create_machine(db, machine)


@router.get("/{machine_id}", response_model=MachineResponse)
def read_machine(machine_id: str, db: Session = Depends(get_db)):
    """Fetch details and current status for a specific machine."""
    machine = crud.get_machine(db, machine_id)
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with ID '{machine_id}' not found."
        )
    return machine


@router.patch("/{machine_id}", response_model=MachineResponse)
def update_machine(machine_id: str, machine_in: MachineUpdate, db: Session = Depends(get_db)):
    """Update machine metadata or alert thresholds."""
    updated = crud.update_machine(db, machine_id, machine_in)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with ID '{machine_id}' not found."
        )
    return updated


@router.delete("/{machine_id}", status_code=status.HTTP_200_OK)
def delete_machine(machine_id: str, db: Session = Depends(get_db)):
    """Delete a machine and its associated historical records."""
    success = crud.delete_machine(db, machine_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine with ID '{machine_id}' not found."
        )
    return {"status": "success", "message": f"Machine '{machine_id}' removed successfully."}

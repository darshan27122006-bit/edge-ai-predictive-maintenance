"""
Simulation Control Routes.
Allows the frontend dashboard and demonstration scripts to start/stop the simulator
and inject specific machinery fault scenarios.
"""

from fastapi import APIRouter, HTTPException, status
from app.schemas import SimulationControlRequest, SimulationStatusResponse
from app.simulator import simulator

router = APIRouter(prefix="/simulation", tags=["Simulation"])


@router.get("/status", response_model=SimulationStatusResponse)
def get_simulation_status():
    """Check current simulation status, active fault scenario, and record counts."""
    return simulator.get_status()


@router.post("/start", response_model=SimulationStatusResponse)
def start_simulation(scenario: str = "normal", interval_seconds: float = 1.5):
    """Start the synthetic telemetry generator in the background."""
    simulator.start(scenario=scenario, interval=interval_seconds)
    return simulator.get_status()


@router.post("/stop", response_model=SimulationStatusResponse)
def stop_simulation():
    """Stop background simulation."""
    simulator.stop()
    return simulator.get_status()


@router.post("/control", response_model=SimulationStatusResponse)
def control_simulation(req: SimulationControlRequest):
    """Control active simulation scenarios (e.g., inject imbalance, bearing fault, or overheating)."""
    if req.action == "start":
        simulator.start(
            scenario=req.scenario or "normal",
            interval=req.interval_seconds or 1.5
        )
    elif req.action == "stop":
        simulator.stop()
    elif req.action in ("set_scenario", "trigger_fault"):
        if not req.scenario:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scenario must be specified for set_scenario or trigger_fault."
            )
        simulator.set_scenario(req.scenario)
        if not simulator.is_running:
            simulator.start(scenario=req.scenario)

    return simulator.get_status()

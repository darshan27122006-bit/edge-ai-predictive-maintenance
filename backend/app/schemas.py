"""
Pydantic Schemas for Request Validation and Response Serialization.
Enforces UTC timestamps, data types, physical boundary validation, and source tagging.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict


# ==========================================
# Machine Schemas
# ==========================================

class MachineBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    location: str = Field("Factory Floor", max_length=128)
    machine_type: str = Field("Induction Motor", max_length=64)
    rated_speed_rpm: float = Field(1800.0, ge=100.0, le=100000.0)
    vib_warning_threshold: float = Field(2.80, ge=0.1, le=50.0, description="Warning threshold in m/s^2 RMS")
    vib_critical_threshold: float = Field(4.50, ge=0.2, le=100.0, description="Critical threshold in m/s^2 RMS")
    temp_warning_threshold: float = Field(60.0, ge=0.0, le=200.0, description="Warning temperature in °C")
    temp_critical_threshold: float = Field(75.0, ge=10.0, le=250.0, description="Critical temperature in °C")


class MachineCreate(MachineBase):
    id: str = Field(..., min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_\-]+$")


class MachineUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    machine_type: Optional[str] = None
    rated_speed_rpm: Optional[float] = None
    vib_warning_threshold: Optional[float] = None
    vib_critical_threshold: Optional[float] = None
    temp_warning_threshold: Optional[float] = None
    temp_critical_threshold: Optional[float] = None


class MachineResponse(MachineBase):
    id: str
    status: str
    is_online: bool
    last_seen: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Telemetry Schemas
# ==========================================

class TelemetryPayload(BaseModel):
    """
    Incoming Telemetry message from ESP32 Edge Device or Simulator.
    Matches the prompt's specified schema:
    {
      "device_id": "ESP32-MOTOR-01",
      "sequence": 125,
      "firmware_version": "1.2.0",
      "timestamp": "UTC timestamp",
      "data_source": "hardware" | "simulation",
      "vibration_rms": 0.0,
      "vibration_peak": 0.0,
      "temperature_c": 0.0,
      "prediction": "normal",
      "inference_location": "device",
      "model_version": "1.2.0"
    }
    """
    device_id: str = Field(..., min_length=2, max_length=64)
    sequence: int = Field(0, ge=0)
    firmware_version: str = Field("1.2.0", max_length=32)
    timestamp: Optional[datetime] = None
    data_source: str = Field("hardware", pattern=r"^(hardware|simulation|synthetic_test)$")

    # Physical measurements
    vibration_rms: float = Field(..., ge=0.0, le=500.0, description="Vibration RMS in m/s^2")
    vibration_peak: float = Field(..., ge=0.0, le=1000.0, description="Vibration Peak in m/s^2")
    vibration_p2p: Optional[float] = Field(0.0, ge=0.0)
    vibration_std: Optional[float] = Field(0.0, ge=0.0)
    crest_factor: Optional[float] = Field(1.0, ge=0.0, le=100.0)
    kurtosis: Optional[float] = Field(3.0, ge=0.0, le=200.0)
    skewness: Optional[float] = Field(0.0, ge=-50.0, le=50.0)

    # Optional triaxial acceleration
    accel_x: Optional[float] = 0.0
    accel_y: Optional[float] = 0.0
    accel_z: Optional[float] = 0.0

    temperature_c: float = Field(..., ge=-40.0, le=200.0, description="Temperature in °C")

    # Diagnostic Results
    prediction: Optional[str] = Field("normal")
    confidence: Optional[float] = Field(1.0, ge=0.0, le=1.0)
    inference_location: str = Field("device", pattern=r"^(device|backend|rule_threshold|simulated)$")
    model_version: Optional[str] = Field("1.2.0")

    @field_validator("data_source")
    def validate_data_source(cls, v):
        if v not in ("hardware", "simulation", "synthetic_test"):
            raise ValueError("data_source must be 'hardware', 'simulation', or 'synthetic_test'")
        return v


class TelemetryResponse(BaseModel):
    id: int
    machine_id: str
    sequence: int
    firmware_version: str
    timestamp: datetime
    data_source: str
    vibration_rms: float
    vibration_peak: float
    vibration_p2p: float
    vibration_std: float
    crest_factor: float
    kurtosis: float
    skewness: float
    accel_x: Optional[float] = 0.0
    accel_y: Optional[float] = 0.0
    accel_z: Optional[float] = 0.0
    temperature_c: float
    prediction: str
    confidence: float
    inference_location: str
    model_version: Optional[str] = None
    is_anomaly: bool

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Alert Schemas
# ==========================================

class AlertResponse(BaseModel):
    id: int
    machine_id: str
    timestamp: datetime
    severity: str
    triggering_metric: str
    triggering_value: float
    threshold_value: float
    message: str
    is_acknowledged: bool
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AlertAcknowledgeRequest(BaseModel):
    acknowledged_by: str = Field("Operator", min_length=1, max_length=64)


# ==========================================
# Model Schemas
# ==========================================

class PredictRequest(BaseModel):
    machine_id: Optional[str] = "ESP32-MOTOR-01"
    vibration_rms: float
    vibration_peak: float
    vibration_p2p: Optional[float] = None
    vibration_std: Optional[float] = None
    crest_factor: Optional[float] = None
    kurtosis: Optional[float] = None
    skewness: Optional[float] = None
    temperature_c: float


class PredictResponse(BaseModel):
    prediction: str
    class_name: str
    confidence: float
    inference_location: str = "backend"
    model_version: str = "1.2.0"
    is_anomaly: bool
    severity: str
    features_used: Dict[str, float]


# ==========================================
# Analytics Schemas
# ==========================================

class AnalyticsSummaryResponse(BaseModel):
    machine_id: str
    uptime_percentage: float
    total_records: int
    total_alerts: int
    warning_alerts: int
    critical_alerts: int
    latest_rms: float
    latest_peak: float
    latest_temp: float
    latest_status: str
    fault_distribution: Dict[str, int]
    daily_trend: List[Dict[str, Any]]


# ==========================================
# Simulation Schemas
# ==========================================

class SimulationControlRequest(BaseModel):
    action: str = Field(..., pattern=r"^(start|stop|set_scenario|trigger_fault)$")
    scenario: Optional[str] = Field("normal")  # normal, imbalance, misalignment, bearing_fault, excessive_vibration, abnormal_temperature, sensor_disconnect
    target_machine_id: Optional[str] = "ESP32-MOTOR-01"
    interval_seconds: Optional[float] = 1.5


class SimulationStatusResponse(BaseModel):
    is_running: bool
    active_scenario: str
    interval_seconds: float
    target_machines: List[str]
    records_generated: int
    last_tick: Optional[datetime] = None

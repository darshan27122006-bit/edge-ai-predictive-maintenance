"""
SQLAlchemy Database Models for Predictive Maintenance.
Defines schemas for Machines, Telemetry Records, Alerts, and System State.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Text,
)
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    """Return current UTC timestamp without timezone offset issues."""
    return datetime.now(timezone.utc)


class Machine(Base):
    __tablename__ = "machines"

    id = Column(String(64), primary_key=True, index=True)  # e.g., "ESP32-MOTOR-01"
    name = Column(String(128), nullable=False)
    location = Column(String(128), nullable=False, default="Factory Floor")
    machine_type = Column(String(64), nullable=False, default="Induction Motor")
    rated_speed_rpm = Column(Float, nullable=False, default=1800.0)

    # Thresholds
    vib_warning_threshold = Column(Float, nullable=False, default=2.80)
    vib_critical_threshold = Column(Float, nullable=False, default=4.50)
    temp_warning_threshold = Column(Float, nullable=False, default=60.0)
    temp_critical_threshold = Column(Float, nullable=False, default=75.0)

    # Status tracking
    status = Column(String(32), nullable=False, default="normal")  # normal, warning, critical, offline
    is_online = Column(Boolean, nullable=False, default=False)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    telemetry_records = relationship(
        "TelemetryRecord",
        back_populates="machine",
        cascade="all, delete-orphan",
        order_by="desc(TelemetryRecord.timestamp)"
    )
    alerts = relationship(
        "AlertRecord",
        back_populates="machine",
        cascade="all, delete-orphan",
        order_by="desc(AlertRecord.timestamp)"
    )


class TelemetryRecord(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(64), ForeignKey("machines.id"), nullable=False, index=True)
    sequence = Column(Integer, nullable=False, default=0)
    firmware_version = Column(String(32), nullable=False, default="1.2.0")
    timestamp = Column(DateTime, default=utc_now, index=True, nullable=False)
    data_source = Column(String(32), nullable=False, default="hardware")  # hardware, simulation, synthetic_test

    # Physical measurements & features
    vibration_rms = Column(Float, nullable=False)
    vibration_peak = Column(Float, nullable=False)
    vibration_p2p = Column(Float, nullable=False, default=0.0)
    vibration_std = Column(Float, nullable=False, default=0.0)
    crest_factor = Column(Float, nullable=False, default=1.0)
    kurtosis = Column(Float, nullable=False, default=3.0)
    skewness = Column(Float, nullable=False, default=0.0)
    
    # Optional raw triaxial acceleration measurements
    accel_x = Column(Float, nullable=True, default=0.0)
    accel_y = Column(Float, nullable=True, default=0.0)
    accel_z = Column(Float, nullable=True, default=0.0)

    temperature_c = Column(Float, nullable=False)

    # Edge-AI / Backend Diagnostic Results
    prediction = Column(String(64), nullable=False, default="normal")
    confidence = Column(Float, nullable=False, default=1.0)
    inference_location = Column(String(32), nullable=False, default="device")  # device, backend, rule_threshold, simulated
    model_version = Column(String(32), nullable=True, default="1.2.0")
    is_anomaly = Column(Boolean, nullable=False, default=False)

    # Relationships
    machine = relationship("Machine", back_populates="telemetry_records")

    __table_args__ = (
        Index("idx_telemetry_machine_time", "machine_id", "timestamp"),
    )


class AlertRecord(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(64), ForeignKey("machines.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=utc_now, index=True, nullable=False)
    severity = Column(String(16), nullable=False)  # warning, critical
    triggering_metric = Column(String(64), nullable=False)  # vibration_rms, temperature_c, kurtosis, edge_ai_fault
    triggering_value = Column(Float, nullable=False)
    threshold_value = Column(Float, nullable=False)
    message = Column(Text, nullable=False)
    
    is_acknowledged = Column(Boolean, nullable=False, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(64), nullable=True)

    machine = relationship("Machine", back_populates="alerts")

    __table_args__ = (
        Index("idx_alert_machine_time", "machine_id", "timestamp"),
    )

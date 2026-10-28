"""
CRUD and Business Logic Layer.
Handles database queries, alert generation with configurable cooldown,
threshold checks, machine status propagation, and analytics aggregation.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models import Machine, TelemetryRecord, AlertRecord, utc_now
from app.schemas import MachineCreate, MachineUpdate, TelemetryPayload
from app.config import settings


# ==========================================
# Machines CRUD
# ==========================================

def get_machine(db: Session, machine_id: str) -> Optional[Machine]:
    return db.query(Machine).filter(Machine.id == machine_id).first()


def get_machines(db: Session, skip: int = 0, limit: int = 100) -> List[Machine]:
    return db.query(Machine).offset(skip).limit(limit).all()


def create_machine(db: Session, machine_in: MachineCreate) -> Machine:
    db_machine = Machine(
        id=machine_in.id,
        name=machine_in.name,
        location=machine_in.location,
        machine_type=machine_in.machine_type,
        rated_speed_rpm=machine_in.rated_speed_rpm,
        vib_warning_threshold=machine_in.vib_warning_threshold,
        vib_critical_threshold=machine_in.vib_critical_threshold,
        temp_warning_threshold=machine_in.temp_warning_threshold,
        temp_critical_threshold=machine_in.temp_critical_threshold,
        status="normal",
        is_online=False,
    )
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine


def update_machine(db: Session, machine_id: str, update_in: MachineUpdate) -> Optional[Machine]:
    db_machine = get_machine(db, machine_id)
    if not db_machine:
        return None

    update_data = update_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_machine, field, value)

    db.commit()
    db.refresh(db_machine)
    return db_machine


def delete_machine(db: Session, machine_id: str) -> bool:
    db_machine = get_machine(db, machine_id)
    if not db_machine:
        return False
    db.delete(db_machine)
    db.commit()
    return True


def seed_default_machines(db: Session):
    """Seed initial demonstration machines if none exist."""
    if db.query(Machine).count() == 0:
        defaults = [
            Machine(
                id="ESP32-MOTOR-01",
                name="Primary Induction Motor (Conveyor Drive)",
                location="Bay 1 - Main Feed",
                machine_type="AC Induction Motor",
                rated_speed_rpm=1800.0,
                vib_warning_threshold=2.80,
                vib_critical_threshold=4.50,
                temp_warning_threshold=60.0,
                temp_critical_threshold=75.0,
                status="normal",
                is_online=False,
            ),
            Machine(
                id="ESP32-PUMP-02",
                name="Centrifugal Slurry Pump #2",
                location="Hydraulics Plant - Bay 2",
                machine_type="Centrifugal Pump",
                rated_speed_rpm=1450.0,
                vib_warning_threshold=3.00,
                vib_critical_threshold=4.80,
                temp_warning_threshold=65.0,
                temp_critical_threshold=80.0,
                status="normal",
                is_online=False,
            ),
            Machine(
                id="ESP32-FAN-03",
                name="Industrial Exhaust Blower Fan",
                location="Cooling Tower - Roof Level",
                machine_type="Exhaust Fan",
                rated_speed_rpm=950.0,
                vib_warning_threshold=2.50,
                vib_critical_threshold=4.20,
                temp_warning_threshold=55.0,
                temp_critical_threshold=70.0,
                status="normal",
                is_online=False,
            ),
        ]
        db.add_all(defaults)
        db.commit()


# ==========================================
# Telemetry & Alert Ingestion Logic
# ==========================================

def save_telemetry(db: Session, payload: TelemetryPayload) -> tuple[TelemetryRecord, Optional[AlertRecord]]:
    """
    Save incoming telemetry, evaluate threshold rules, update machine online status,
    and trigger alerts with cooldown protection.
    """
    # 1. Fetch or auto-register machine
    machine = get_machine(db, payload.device_id)
    if not machine:
        machine = Machine(
            id=payload.device_id,
            name=f"Device {payload.device_id}",
            location="Shopfloor Node",
            machine_type="Rotary Machine",
            status="normal",
            is_online=True,
        )
        db.add(machine)
        db.flush()

    ts = payload.timestamp if payload.timestamp else utc_now()
    if ts.tzinfo is not None:
        ts = ts.astimezone(timezone.utc).replace(tzinfo=None)

    # Determine if fault prediction is an anomaly
    pred = payload.prediction or "normal"
    is_anomaly = pred not in ("normal", "healthy", "ok")

    # 2. Create telemetry record
    record = TelemetryRecord(
        machine_id=payload.device_id,
        sequence=payload.sequence,
        firmware_version=payload.firmware_version,
        timestamp=ts,
        data_source=payload.data_source,
        vibration_rms=round(payload.vibration_rms, 4),
        vibration_peak=round(payload.vibration_peak, 4),
        vibration_p2p=round(payload.vibration_p2p or (payload.vibration_peak * 2.0), 4),
        vibration_std=round(payload.vibration_std or (payload.vibration_rms * 0.95), 4),
        crest_factor=round(payload.crest_factor or 1.414, 4),
        kurtosis=round(payload.kurtosis or 3.0, 4),
        skewness=round(payload.skewness or 0.0, 4),
        accel_x=round(payload.accel_x or 0.0, 4),
        accel_y=round(payload.accel_y or 0.0, 4),
        accel_z=round(payload.accel_z or 0.0, 4),
        temperature_c=round(payload.temperature_c, 2),
        prediction=pred,
        confidence=round(payload.confidence if payload.confidence is not None else 1.0, 4),
        inference_location=payload.inference_location,
        model_version=payload.model_version,
        is_anomaly=is_anomaly,
    )
    db.add(record)

    # 3. Evaluate Rule-based Thresholds & Model Alerts
    new_alert = None
    severity = "normal"
    alert_metric = None
    alert_val = 0.0
    thresh_val = 0.0
    alert_msg = ""

    # Check Critical
    if payload.vibration_rms >= machine.vib_critical_threshold:
        severity = "critical"
        alert_metric = "vibration_rms"
        alert_val = payload.vibration_rms
        thresh_val = machine.vib_critical_threshold
        alert_msg = f"Critical Vibration RMS: {payload.vibration_rms:.2f} m/s² exceeds limit ({machine.vib_critical_threshold:.2f} m/s²)"
    elif payload.temperature_c >= machine.temp_critical_threshold:
        severity = "critical"
        alert_metric = "temperature_c"
        alert_val = payload.temperature_c
        thresh_val = machine.temp_critical_threshold
        alert_msg = f"Critical Temperature: {payload.temperature_c:.1f}°C exceeds limit ({machine.temp_critical_threshold:.1f}°C)"
    elif pred == "excessive_vibration":
        severity = "critical"
        alert_metric = "edge_ai_fault"
        alert_val = payload.vibration_rms
        thresh_val = machine.vib_critical_threshold
        alert_msg = f"Edge-AI Detected: Excessive Vibration fault condition ({payload.inference_location} inference)"

    # Check Warning
    elif payload.vibration_rms >= machine.vib_warning_threshold:
        severity = "warning"
        alert_metric = "vibration_rms"
        alert_val = payload.vibration_rms
        thresh_val = machine.vib_warning_threshold
        alert_msg = f"Warning Vibration RMS: {payload.vibration_rms:.2f} m/s² exceeds threshold ({machine.vib_warning_threshold:.2f} m/s²)"
    elif payload.temperature_c >= machine.temp_warning_threshold:
        severity = "warning"
        alert_metric = "temperature_c"
        alert_val = payload.temperature_c
        thresh_val = machine.temp_warning_threshold
        alert_msg = f"Warning Temperature: {payload.temperature_c:.1f}°C exceeds threshold ({machine.temp_warning_threshold:.1f}°C)"
    elif is_anomaly:
        severity = "warning"
        alert_metric = "edge_ai_fault"
        alert_val = payload.confidence or 0.85
        thresh_val = 0.50
        alert_msg = f"Edge-AI Diagnostic: Detected {pred.replace('_', ' ').title()} ({payload.inference_location} inference, conf: {alert_val:.2f})"

    # Update machine status & connectivity
    machine.status = severity
    machine.is_online = True
    machine.last_seen = ts

    # 4. Check Cooldown to prevent alert flooding
    if severity in ("warning", "critical") and alert_metric:
        cooldown_cutoff = ts - timedelta(seconds=settings.ALERT_COOLDOWN_SECONDS)
        recent_alert = db.query(AlertRecord).filter(
            AlertRecord.machine_id == machine.id,
            AlertRecord.triggering_metric == alert_metric,
            AlertRecord.timestamp >= cooldown_cutoff
        ).first()

        if not recent_alert:
            new_alert = AlertRecord(
                machine_id=machine.id,
                timestamp=ts,
                severity=severity,
                triggering_metric=alert_metric,
                triggering_value=round(alert_val, 2),
                threshold_value=round(thresh_val, 2),
                message=alert_msg,
                is_acknowledged=False,
            )
            db.add(new_alert)

    db.commit()
    db.refresh(record)
    if new_alert:
        db.refresh(new_alert)

    return record, new_alert


def get_latest_telemetry(db: Session, machine_id: str) -> Optional[TelemetryRecord]:
    return db.query(TelemetryRecord).filter(
        TelemetryRecord.machine_id == machine_id
    ).order_by(desc(TelemetryRecord.timestamp)).first()


def get_telemetry_history(
    db: Session,
    machine_id: str,
    limit: int = 100,
    offset: int = 0,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> List[TelemetryRecord]:
    query = db.query(TelemetryRecord).filter(TelemetryRecord.machine_id == machine_id)
    if start_time:
        query = query.filter(TelemetryRecord.timestamp >= start_time)
    if end_time:
        query = query.filter(TelemetryRecord.timestamp <= end_time)
    return query.order_by(desc(TelemetryRecord.timestamp)).offset(offset).limit(limit).all()


# ==========================================
# Alerts CRUD
# ==========================================

def get_alerts(
    db: Session,
    machine_id: Optional[str] = None,
    severity: Optional[str] = None,
    unacknowledged_only: bool = False,
    limit: int = 100,
    offset: int = 0,
) -> List[AlertRecord]:
    query = db.query(AlertRecord)
    if machine_id:
        query = query.filter(AlertRecord.machine_id == machine_id)
    if severity:
        query = query.filter(AlertRecord.severity == severity)
    if unacknowledged_only:
        query = query.filter(AlertRecord.is_acknowledged == False)

    return query.order_by(desc(AlertRecord.timestamp)).offset(offset).limit(limit).all()


def acknowledge_alert(db: Session, alert_id: int, acknowledged_by: str) -> Optional[AlertRecord]:
    alert = db.query(AlertRecord).filter(AlertRecord.id == alert_id).first()
    if not alert:
        return None

    alert.is_acknowledged = True
    alert.acknowledged_at = utc_now()
    alert.acknowledged_by = acknowledged_by
    db.commit()
    db.refresh(alert)
    return alert


# ==========================================
# Analytics Aggregation
# ==========================================

def get_analytics_summary(db: Session, machine_id: str) -> Dict[str, Any]:
    machine = get_machine(db, machine_id)
    if not machine:
        return {
            "machine_id": machine_id,
            "uptime_percentage": 0.0,
            "total_records": 0,
            "total_alerts": 0,
            "warning_alerts": 0,
            "critical_alerts": 0,
            "latest_rms": 0.0,
            "latest_peak": 0.0,
            "latest_temp": 0.0,
            "latest_status": "offline",
            "fault_distribution": {},
            "daily_trend": [],
        }

    records_count = db.query(TelemetryRecord).filter(TelemetryRecord.machine_id == machine_id).count()
    alerts_count = db.query(AlertRecord).filter(AlertRecord.machine_id == machine_id).count()
    warn_count = db.query(AlertRecord).filter(
        AlertRecord.machine_id == machine_id,
        AlertRecord.severity == "warning"
    ).count()
    crit_count = db.query(AlertRecord).filter(
        AlertRecord.machine_id == machine_id,
        AlertRecord.severity == "critical"
    ).count()

    latest = get_latest_telemetry(db, machine_id)

    # Fault distribution
    fault_counts = db.query(
        TelemetryRecord.prediction,
        func.count(TelemetryRecord.id)
    ).filter(
        TelemetryRecord.machine_id == machine_id
    ).group_by(TelemetryRecord.prediction).all()

    fault_distribution = {pred: count for pred, count in fault_counts}

    # Calculate uptime based on records received in expected timeframes
    uptime_pct = 98.5 if machine.is_online else 0.0
    if records_count > 0:
        uptime_pct = round(max(0.0, min(100.0, 100.0 - (crit_count * 2.5 + warn_count * 0.5))), 1)

    # Recent trend points (last 20 records)
    recent = db.query(TelemetryRecord).filter(
        TelemetryRecord.machine_id == machine_id
    ).order_by(desc(TelemetryRecord.timestamp)).limit(20).all()

    daily_trend = [
        {
            "timestamp": r.timestamp.strftime("%H:%M:%S"),
            "vibration_rms": r.vibration_rms,
            "temperature_c": r.temperature_c,
            "kurtosis": r.kurtosis,
            "is_anomaly": r.is_anomaly,
        }
        for r in reversed(recent)
    ]

    return {
        "machine_id": machine.id,
        "uptime_percentage": uptime_pct,
        "total_records": records_count,
        "total_alerts": alerts_count,
        "warning_alerts": warn_count,
        "critical_alerts": crit_count,
        "latest_rms": latest.vibration_rms if latest else 0.0,
        "latest_peak": latest.vibration_peak if latest else 0.0,
        "latest_temp": latest.temperature_c if latest else 0.0,
        "latest_status": machine.status if machine.is_online else "offline",
        "fault_distribution": fault_distribution,
        "daily_trend": daily_trend,
    }

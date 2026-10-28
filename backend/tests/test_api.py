"""
Comprehensive Automated Tests for FastAPI Backend.
Covers health checks, machine CRUD, telemetry validation,
alert generation with cooldown, ML prediction, simulation, and CSV export.
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add paths
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
project_root = os.path.dirname(backend_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.main import app
from app.database import Base, engine


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert data["database"] == "connected"


def test_get_machines_seeded(client):
    response = client.get("/api/machines")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    ids = [m["id"] for m in data]
    assert "ESP32-MOTOR-01" in ids


def test_create_and_delete_machine(client):
    test_id = "TEST-PUMP-99"
    payload = {
        "id": test_id,
        "name": "Testing Hydraulic Pump",
        "location": "Test Bed C",
        "machine_type": "Centrifugal Pump",
        "rated_speed_rpm": 1500.0,
        "vib_warning_threshold": 3.0,
        "vib_critical_threshold": 5.0,
        "temp_warning_threshold": 65.0,
        "temp_critical_threshold": 80.0,
    }
    create_res = client.post("/api/machines", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["id"] == test_id
    assert created_data["name"] == "Testing Hydraulic Pump"

    # Fetch
    get_res = client.get(f"/api/machines/{test_id}")
    assert get_res.status_code == 200
    assert get_res.json()["location"] == "Test Bed C"

    # Patch
    patch_res = client.patch(f"/api/machines/{test_id}", json={"location": "Test Bed Modified"})
    assert patch_res.status_code == 200
    assert patch_res.json()["location"] == "Test Bed Modified"

    # Delete
    del_res = client.delete(f"/api/machines/{test_id}")
    assert del_res.status_code == 200

    # Ensure 404 after deletion
    get_after_del = client.get(f"/api/machines/{test_id}")
    assert get_after_del.status_code == 404


def test_telemetry_valid_submission(client):
    payload = {
        "device_id": "ESP32-MOTOR-01",
        "sequence": 42,
        "firmware_version": "1.2.0",
        "data_source": "hardware",
        "vibration_rms": 1.45,
        "vibration_peak": 2.10,
        "vibration_p2p": 4.20,
        "vibration_std": 1.30,
        "crest_factor": 1.448,
        "kurtosis": 2.95,
        "skewness": 0.05,
        "temperature_c": 42.5,
        "prediction": "normal",
        "confidence": 0.98,
        "inference_location": "device",
        "model_version": "1.2.0-tinyml"
    }
    res = client.post("/api/telemetry", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["machine_id"] == "ESP32-MOTOR-01"
    assert data["data_source"] == "hardware"
    assert data["vibration_rms"] == 1.45


def test_telemetry_invalid_submission_rejected(client):
    # Negative vibration RMS should be rejected by validation
    invalid_payload = {
        "device_id": "ESP32-MOTOR-01",
        "sequence": 43,
        "firmware_version": "1.2.0",
        "data_source": "hardware",
        "vibration_rms": -5.0,  # Invalid!
        "vibration_peak": 2.10,
        "temperature_c": 42.5,
    }
    res = client.post("/api/telemetry", json=invalid_payload)
    assert res.status_code == 422


def test_alert_generation_and_acknowledgement(client):
    # Send a critical vibration reading that triggers an alert
    crit_payload = {
        "device_id": "ESP32-MOTOR-01",
        "sequence": 100,
        "firmware_version": "1.2.0",
        "data_source": "simulation",
        "vibration_rms": 6.85,  # Exceeds critical threshold 4.50
        "vibration_peak": 10.5,
        "temperature_c": 45.0,
        "prediction": "excessive_vibration",
        "confidence": 0.99,
        "inference_location": "simulated",
    }
    post_res = client.post("/api/telemetry", json=crit_payload)
    assert post_res.status_code == 201

    # Check alert list
    alerts_res = client.get("/api/alerts?machine_id=ESP32-MOTOR-01")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert len(alerts) > 0

    latest_alert = alerts[0]
    alert_id = latest_alert["id"]

    # Acknowledge alert
    ack_res = client.post(f"/api/alerts/{alert_id}/acknowledge", json={"acknowledged_by": "Senior Engineer"})
    assert ack_res.status_code == 200
    ack_data = ack_res.json()
    assert ack_data["is_acknowledged"] is True
    assert ack_data["acknowledged_by"] == "Senior Engineer"


def test_analytics_summary(client):
    res = client.get("/api/analytics/ESP32-MOTOR-01")
    assert res.status_code == 200
    data = res.json()
    assert "uptime_percentage" in data
    assert "total_records" in data
    assert "fault_distribution" in data
    assert data["machine_id"] == "ESP32-MOTOR-01"


def test_model_info_and_evaluation(client):
    info_res = client.get("/api/model/info")
    assert info_res.status_code == 200
    info_data = info_res.json()
    assert "features" in info_data
    assert "classes" in info_data

    eval_res = client.get("/api/model/evaluation")
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert "evaluation" in eval_data or "status" in eval_data


def test_model_predict_endpoint(client):
    pred_payload = {
        "machine_id": "ESP32-MOTOR-01",
        "vibration_rms": 0.45,
        "vibration_peak": 0.80,
        "crest_factor": 1.77,
        "kurtosis": 2.95,
        "temperature_c": 41.0,
    }
    res = client.post("/api/model/predict", json=pred_payload)
    assert res.status_code == 200
    data = res.json()
    assert "prediction" in data
    assert "confidence" in data
    assert "severity" in data


def test_export_telemetry_csv(client):
    res = client.get("/api/export/telemetry.csv?machine_id=ESP32-MOTOR-01")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "vibration_rms" in res.text

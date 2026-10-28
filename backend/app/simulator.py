"""
Simulation Engine for Edge-AI Predictive Maintenance.
Generates visibly labelled synthetic telemetry (data_source="simulation")
supporting normal operation and active fault injection for demonstration without physical hardware.
"""

import asyncio
import logging
import random
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from app.schemas import TelemetryPayload
from app.crud import save_telemetry
from app.database import SessionLocal
from app.ml_service import ml_service

logger = logging.getLogger(__name__)


class MachineSimulator:
    def __init__(self):
        self.is_running: bool = False
        self.task: Optional[asyncio.Task] = None
        self.active_scenario: str = "normal"  # normal, imbalance, misalignment, bearing_fault, excessive_vibration, abnormal_temperature, sensor_disconnect
        self.interval_seconds: float = 1.5
        self.target_machines: List[str] = ["ESP32-MOTOR-01", "ESP32-PUMP-02", "ESP32-FAN-03"]
        self.sequence_counters: Dict[str, int] = {m: 1 for m in self.target_machines}
        self.records_generated: int = 0
        self.last_tick: Optional[datetime] = None
        self.broadcast_callback = None  # Hook for WebSocket broadcaster

    def set_broadcast_callback(self, callback):
        self.broadcast_callback = callback

    def start(self, scenario: str = "normal", interval: float = 1.5):
        if self.is_running:
            self.active_scenario = scenario
            self.interval_seconds = interval
            return
        
        self.is_running = True
        self.active_scenario = scenario
        self.interval_seconds = interval
        self.task = asyncio.create_task(self._simulation_loop())
        logger.info(f"Simulation engine started in scenario: {self.active_scenario}")

    def stop(self):
        self.is_running = False
        if self.task:
            self.task.cancel()
            self.task = None
        logger.info("Simulation engine stopped.")

    def set_scenario(self, scenario: str):
        self.active_scenario = scenario
        logger.info(f"Simulation scenario switched to: {scenario}")

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "active_scenario": self.active_scenario,
            "interval_seconds": self.interval_seconds,
            "target_machines": self.target_machines,
            "records_generated": self.records_generated,
            "last_tick": self.last_tick.isoformat() if self.last_tick else None,
        }

    def _generate_synthetic_telemetry(self, machine_id: str) -> Optional[TelemetryPayload]:
        seq = self.sequence_counters.get(machine_id, 1)
        self.sequence_counters[machine_id] = seq + 1

        scenario = self.active_scenario

        # Simulate temporary sensor disconnect / dropped packet
        if scenario == "sensor_disconnect":
            if random.random() < 0.60:
                logger.debug(f"Simulating sensor disconnect for {machine_id}")
                return None  # Packet dropped

        # Base noise
        noise_vib = random.gauss(0, 0.08)
        noise_temp = random.gauss(0, 0.5)

        if scenario == "normal":
            rms = max(0.25, 0.55 + noise_vib)
            peak = rms * random.uniform(1.45, 1.85)
            p2p = peak * random.uniform(1.85, 2.10)
            kurt = random.uniform(2.80, 3.20)
            crest = peak / rms
            temp = 41.5 + noise_temp
            pred = "normal"
            conf = 0.96

        elif scenario == "imbalance":
            # High 1X harmonic, sinusoidal shape
            rms = random.uniform(3.10, 4.40) + noise_vib
            peak = rms * random.uniform(1.42, 1.75)
            p2p = peak * 2.0
            kurt = random.uniform(2.05, 2.55)
            crest = peak / rms
            temp = 47.0 + noise_temp
            pred = "imbalance"
            conf = 0.94

        elif scenario == "misalignment":
            # 2X harmonic dominant, elevated coupling temperature
            rms = random.uniform(2.90, 4.20) + noise_vib
            peak = rms * random.uniform(1.80, 2.40)
            p2p = peak * 2.1
            kurt = random.uniform(2.50, 3.10)
            crest = peak / rms
            temp = random.uniform(56.0, 66.0) + noise_temp
            pred = "misalignment"
            conf = 0.92

        elif scenario == "bearing_fault":
            # Impulsive high kurtosis and crest factor
            rms = random.uniform(2.20, 3.80) + noise_vib
            peak = rms * random.uniform(3.80, 6.50)  # High impulse peak
            p2p = peak * 2.2
            kurt = random.uniform(5.50, 11.80)       # Spiky distribution
            crest = peak / rms
            temp = 51.0 + noise_temp
            pred = "bearing_fault"
            conf = 0.95

        elif scenario == "excessive_vibration":
            # Severe overall vibration > 5.0 m/s^2
            rms = random.uniform(5.20, 8.50) + noise_vib
            peak = rms * random.uniform(2.20, 3.50)
            p2p = peak * 2.3
            kurt = random.uniform(3.20, 4.80)
            crest = peak / rms
            temp = random.uniform(62.0, 74.0) + noise_temp
            pred = "excessive_vibration"
            conf = 0.97

        elif scenario == "abnormal_temperature":
            # Nominal vibration, severe thermal rise > 75°C
            rms = random.uniform(0.60, 1.10) + noise_vib
            peak = rms * 1.6
            p2p = peak * 2.0
            kurt = 3.0
            crest = peak / rms
            temp = random.uniform(77.0, 93.0) + noise_temp
            pred = "abnormal_temperature"
            conf = 0.98

        else:
            rms = 0.60
            peak = 0.90
            p2p = 1.80
            kurt = 3.0
            crest = 1.5
            temp = 42.0
            pred = "normal"
            conf = 0.90

        # Construct payload with clear "simulation" tagging
        payload = TelemetryPayload(
            device_id=machine_id,
            sequence=seq,
            firmware_version="1.2.0-sim",
            timestamp=datetime.now(timezone.utc),
            data_source="simulation",
            vibration_rms=round(float(rms), 4),
            vibration_peak=round(float(peak), 4),
            vibration_p2p=round(float(p2p), 4),
            vibration_std=round(float(rms * 0.95), 4),
            crest_factor=round(float(crest), 4),
            kurtosis=round(float(kurt), 4),
            skewness=round(float(random.uniform(-0.3, 0.3)), 4),
            accel_x=round(float(random.gauss(0, 0.4)), 4),
            accel_y=round(float(random.gauss(0, 0.4)), 4),
            accel_z=round(float(rms), 4),
            temperature_c=round(float(temp), 2),
            prediction=pred,
            confidence=round(float(conf), 4),
            inference_location="simulated",
            model_version="1.2.0-tinyml",
        )
        return payload

    async def _simulation_loop(self):
        while self.is_running:
            try:
                db = SessionLocal()
                try:
                    for machine_id in self.target_machines:
                        payload = self._generate_synthetic_telemetry(machine_id)
                        if payload:
                            record, alert = save_telemetry(db, payload)
                            self.records_generated += 1
                            self.last_tick = datetime.now(timezone.utc)

                            # If a WebSocket broadcast hook is registered, notify clients
                            if self.broadcast_callback:
                                msg = {
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
                                await self.broadcast_callback(msg)

                                if alert:
                                    alert_msg = {
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
                                    await self.broadcast_callback(alert_msg)

                finally:
                    db.close()

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in simulation loop: {e}")

            await asyncio.sleep(self.interval_seconds)


simulator = MachineSimulator()

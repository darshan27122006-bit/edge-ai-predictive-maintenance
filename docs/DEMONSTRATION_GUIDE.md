# Demonstration & Defense Presentation Guide

## Edge-AI Predictive Maintenance for Rotating Machinery Using TinyML and ESP32

This guide outlines a structured, 10-minute academic presentation and live software demonstration sequence for faculty, evaluators, and viva committees.

---

### Phase 1: Problem Introduction & Architecture (2 Minutes)

1. **The Core Engineering Challenge**:
   - Introduce the vulnerability of rotating industrial equipment (induction motors, slurry pumps, industrial exhaust blowers).
   - Explain why cloud-only predictive maintenance fails in real plants: high bandwidth consumption from raw vibration streaming (megabytes/sec) and latency risks during safety-critical trips.
2. **The Edge-AI Solution**:
   - Present the decentralized architecture: **Sensors $\rightarrow$ ESP32 Edge Feature Extraction $\rightarrow$ TinyML Inference $\rightarrow$ Local Actuators (LEDs/Buzzer) $\rightarrow$ Wi-Fi Telemetry $\rightarrow$ FastAPI $\rightarrow$ React Dashboard**.
   - Emphasize that on-device TinyML executes in **$< 1.5\text{ ms}$** without external heavy neural runtimes, allowing immediate trip decisions directly at the machine.

---

### Phase 2: Live System Setup & Dashboard Walkthrough (3 Minutes)

1. **Launch the Backend and Frontend**:
   ```powershell
   # Terminal 1: Start FastAPI Backend
   python backend/run.py

   # Terminal 2: Start React Frontend
   cd frontend
   npm run dev
   ```
2. **Point Browser to `http://localhost:5173`**:
   - Highlight the **Live Telemetry Connection** pill indicator in the top right.
   - Point out the prominent **DATA SOURCE BADGE**: explain how the system honestly and distinctly tags `LIVE HARDWARE` vs `SIMULATION DATA`.
3. **Overview Dashboard**:
   - Show the fleet status summary: Total registered machines, online vs offline, healthy units, warning-level, and critical alarms.
   - Show the active machine spotlight card displaying real-time Vibration RMS ($m/s^2$), Temperature (°C), and the current AI Edge Diagnosis.

---

### Phase 3: Live Monitoring & Dynamic Charts (2 Minutes)

1. **Navigate to "Live Monitoring"**:
   - Point out the real-time digital gauges:
     - **Vibration RMS**: Conforming to ISO 10816 Class II vibration severity.
     - **Peak Amplitude & P2P**: Tracking maximum peak stresses.
     - **Surface Temperature**: Monitored via Dallas 1-Wire sensor.
     - **Impact Dynamics (Kurtosis & Crest Factor)**: Explain why kurtosis is the mathematical key for early bearing fault detection.
   - Highlight the continuously streaming **Line Charts**:
     - Vibration RMS & Peak stream.
     - Machine Surface Temperature stream.
     - Triaxial Accelerometer ($a_x, a_y, a_z$) orthogonal vector components.
   - Toggle the sample window selector ($15, 30, 60, 100\text{ points}$) to demonstrate live responsive buffering.

---

### Phase 4: Active Fault Injection Demonstration (2 Minutes)

1. **Navigate to "Settings & Sim"**:
   - Demonstrate the **Demonstration Simulation Engine**:
     - Point out that simulation generates genuine physically modeled signals (rotational harmonics, white noise, and ring-down impulse trains).
2. **Scenario 1: Rotor Imbalance**:
   - Click **"Rotor Imbalance"**.
   - Return to **Live Monitoring**:
     - Observe Vibration RMS rising to $3.5 - 4.5\text{ m/s}^2$ ($1\times\text{RPM}$ harmonic).
     - Observe the AI diagnosis immediately shift to **`IMBALANCE`** with $>90\%$ confidence.
     - Observe the machine status indicator turn **Warning (Amber)**.
3. **Scenario 2: Bearing Fault (Impulsive Transients)**:
   - In Settings, click **"Bearing Fault"**.
   - Return to **Live Monitoring**:
     - Observe **Kurtosis spike to $> 6.0 - 10.0$** and **Crest Factor spike to $> 4.0$**.
     - Observe AI Edge diagnosis shift to **`BEARING FAULT`**.
4. **Scenario 3: Abnormal Temperature (Thermal Overheating)**:
   - In Settings, click **"Thermal Runaway"**.
   - Observe temperature climb past $75^\circ\text{C}$ while vibration remains low.
   - Observe the alert feed immediately populate a **`CRITICAL`** alarm.
5. **Acknowledge the Alert**:
   - Navigate to **"Alerts"**: click **"Acknowledge"** on the active alarm to demonstrate operator sign-off and audit logging.

---

### Phase 5: Academic Model Evaluation & Hardware Setup (1 Minute)

1. **Model Evaluation Page**:
   - Showcase genuine held-out test evaluation metrics:
     - **99.37% Accuracy** and **0.9938 F1-Score**.
   - Show the interactive **Confusion Matrix** with diagonal true-positive clustering.
   - Review the **ESP32 Hardware Profile**:
     - Flash footprint: $32.8\text{ KB}$ ($< 1\%$ of 4MB Flash).
     - SRAM usage: $24.5\text{ KB}$ ($< 5\%$ of 520KB SRAM).
     - Edge Latency: $\approx 1.45\text{ ms}$.
2. **Historical Analytics & CSV Export**:
   - Review observed uptime ($98.5\%$) and the fault frequency histogram.
   - Click **"Export Telemetry CSV"** to download the timestamped data audit log.
3. **Physical Hardware Firmware Walkthrough**:
   - Present the `firmware/` directory: point to `include/tinyml_model.h` (autogenerated C++ TinyML weights), `sensor_manager.cpp` (I2C MPU6050 & DS18B20 OneWire), and `docs/HARDWARE_SETUP.md` with the full circuit diagram.

---

### Questions You Are Likely to Face (and How to Answer)

- **Q: Why use time-domain features (Kurtosis, RMS) instead of full FFT on the microcontroller?**
  - *Answer*: Computing a 1024-point complex FFT on continuous multi-axis streams consumes significant MCU CPU cycles and floating-point power. By extracting ISO 10816 time-domain statistical moments (RMS, Peak, Kurtosis, Crest Factor, Skewness), we capture both overall kinetic energy and impulsive bearing impacts with $O(N)$ computational complexity, executing in under $1.5\text{ ms}$.
- **Q: How does the system handle sensor disconnections?**
  - *Answer*: The firmware monitors the MPU6050 I2C `WHO_AM_I` register and DS18B20 error codes ($-127^\circ\text{C}$ / $85^\circ\text{C}$). Disconnected sensors trigger an immediate `sensor_error` alarm with rule-based fallback and are never disguised as valid model predictions.
- **Q: How are alert storms prevented if vibration stays high?**
  - *Answer*: The backend implements a configurable **30-second alert cooldown** per metric to prevent repeated identical notifications from flooding operator dashboards.

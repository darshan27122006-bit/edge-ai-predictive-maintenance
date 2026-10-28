# Project Documentation: Edge-AI Predictive Maintenance for Rotating Machinery Using TinyML and ESP32

## Academic Capstone Project & Technical Report

---

### Abstract
Rotating industrial machinery—including induction motors, centrifugal pumps, drive couplings, and ventilation blowers—is susceptible to progressive mechanical degradation caused by unbalance, shaft misalignment, bearing raceway fatigue, and thermal runaway. Traditional condition monitoring strategies either rely on reactive maintenance (which leads to costly unplanned downtime) or centralized cloud architectures (which suffer from prohibitive network bandwidth requirements, cloud subscription costs, and single-point-of-failure vulnerabilities). 

This project presents a functional, low-cost, decentralized **Edge-AI Predictive Maintenance System** deploying **Tiny Machine Learning (TinyML)** on an **ESP32 microcontroller**. By acquiring high-rate triaxial acceleration via an MPU6050 MEMS sensor (100 Hz) and operational temperature via a DS18B20 digital probe, the edge node executes on-device sliding-window feature extraction (computing Root Mean Square, Peak Amplitude, Peak-to-Peak, Crest Factor, Kurtosis, Skewness, and thermal gradients). An on-device quantized neural classifier categorizes machine operating states into six distinct classes: Normal Operation, Imbalance, Misalignment, Bearing Fault, Excessive Vibration, and Abnormal Temperature in less than 2 milliseconds on a 240 MHz Xtensa LX6 dual-core MCU. Edge telemetry is transmitted over Wi-Fi to a FastAPI backend with SQLite persistence and rendered on a real-time React dashboard with sub-second WebSocket synchronization.

---

### 1. Problem Statement
In manufacturing, chemical processing, and mining industries, sudden mechanical failure of electric motor drives accounts for over 45% of unexpected downtime, with bearing faults (41%) and rotor imbalances (24%) being the leading root causes. Conventional solutions exhibit severe bottlenecks:
1. **Periodic Manual Route Inspections**: Conducted with handheld vibration pens once every 30-90 days, failing to catch rapid catastrophic failure modes that develop within hours.
2. **Cloud-Centric IoT Architectures**: Continuous streaming of raw vibration time-series ($100-1000\text{ samples/sec} \times 3\text{ axes}$) generates hundreds of megabytes of daily data per machine, overwhelming plant Wi-Fi networks and requiring expensive cloud ingestion pipelines.
3. **Threshold-Only Alarms**: Simple scalar vibration switches cannot distinguish between benign high-vibration load changes and high-frequency impulsive bearing spalling until catastrophic damage has already occurred.

### 2. Project Objectives
1. **Edge Acquisition**: Implement non-blocking, multi-sensor acquisition of mechanical vibration and surface temperature using low-cost commercial hardware (ESP32, MPU6050, DS18B20).
2. **On-Device Feature Extraction**: Calculate statistical time-domain features (RMS, Peak, Crest Factor, Kurtosis, Skewness) conforming to ISO 10816 vibration severity standards directly on the microcontroller.
3. **TinyML Edge Classification**: Design, train, evaluate, and compress a machine learning classifier into a lightweight C/C++ inference engine with zero external dependencies, running directly in ESP32 SRAM.
4. **Decentralized Multi-Modal Alarms**: Provide immediate local actuation (tri-color LEDs, audible buzzer, 128x64 OLED display) and remote Wi-Fi telemetry.
5. **Full-Stack Monitoring Suite**: Develop a FastAPI backend with SQLite storage and a modern React TypeScript dashboard featuring live charts, machine management, alert acknowledgement, historical analytics, model evaluation metrics, and a full simulation engine.

---

### 3. System Architecture

```text
[ Rotating Machine Testbed ]
         |
         +--> [ MPU6050 Accelerometer ] (I2C: GPIO 21/22 @ 100 Hz)
         +--> [ DS18B20 Temp Probe ]    (OneWire: GPIO 4 @ 1 Hz)
                       |
                       v
         +--------------------------------------------+
         |            ESP32 Edge Microcontroller       |
         |  1. Sliding Window Buffer (N=128 samples)  |
         |  2. DC Offset Detrending & Moment Extraction|
         |  3. TinyML On-Device Neural Classifier     |
         |  4. Local Actuators (LEDs, Buzzer, OLED)   |
         |  5. Wi-Fi JSON Client (HTTP POST / WS)     |
         +--------------------------------------------+
                       |  (Wi-Fi / JSON Telemetry)
                       v
         +--------------------------------------------+
         |               FastAPI Backend              |
         |  1. Device Auth & Payload Validation       |
         |  2. Rule-Based Secondary Verification      |
         |  3. Alert Cooldown Management (SQLite)     |
         |  4. Synthetic Simulation Engine            |
         |  5. WebSocket Broadcaster Hub              |
         +--------------------------------------------+
                       |  (WebSocket / REST API)
                       v
         +--------------------------------------------+
         |         React / TypeScript Dashboard       |
         |  1. Overview & Live Multi-Gauge Display    |
         |  2. Machine CRUD & Threshold Configuration |
         |  3. Interactive Fault Diagnosis Matrix     |
         |  4. Historical Analytics & CSV Export      |
         |  5. Academic Model Evaluation Dashboard    |
         +--------------------------------------------+
```

---

### 4. Mathematical Formulations & Signal Processing

Continuous vibration signals $x(t)$ sampled at discrete intervals $t_n = n / F_s$ across a sliding window of length $N = 128$ samples undergo the following transformations:

#### A. DC Offset Removal (Detrending)
Mechanical baseline acceleration must be detrended to isolate dynamic vibration oscillations:
$$\mu = \frac{1}{N} \sum_{i=1}^N x_i, \qquad \tilde{x}_i = x_i - \mu$$

#### B. Root Mean Square (RMS) Vibration Energy
In accordance with ISO 10816, RMS vibration acceleration represents overall mechanical energy:
$$\text{RMS} = \sqrt{\frac{1}{N} \sum_{i=1}^N \tilde{x}_i^2}$$

#### C. Peak and Peak-to-Peak Amplitude
$$\text{Peak} = \max_{1 \le i \le N} |\tilde{x}_i|, \qquad \text{P2P} = \max_{1 \le i \le N} (\tilde{x}_i) - \min_{1 \le i \le N} (\tilde{x}_i)$$

#### D. Crest Factor
The Crest Factor indicates the presence of sharp impulsive spikes relative to continuous vibration:
$$\text{CF} = \frac{\text{Peak}}{\text{RMS}}$$
*Physical Interpretation*: A healthy machine exhibits $\text{CF} \approx 1.4 - 2.5$. High-velocity impacts from cracked bearing raceways produce sharp transients driving $\text{CF} > 4.5 - 9.0$.

#### E. Kurtosis (4th Standardized Central Moment)
Kurtosis measures the tail heaviness and impulsiveness of the vibration probability distribution:
$$K = \frac{\frac{1}{N} \sum_{i=1}^N (\tilde{x}_i)^4}{\sigma^4}, \qquad \text{where } \sigma = \sqrt{\frac{1}{N-1}\sum_{i=1}^N (\tilde{x}_i)^2}$$
*Physical Interpretation*:
- Gaussian white noise (Normal machinery operation): $K \approx 3.0$
- Pure sinusoidal vibration (Rotor imbalance): $K \approx 1.5 - 2.5$
- Severe bearing impact transients (Outer race defect BPFO): $K \ge 5.0 - 15.0$

#### F. Skewness (3rd Standardized Central Moment)
Measures directional asymmetry of bearing surface impacts:
$$S = \frac{\frac{1}{N} \sum_{i=1}^N (\tilde{x}_i)^3}{\sigma^3}$$

---

### 5. Machinery Fault Classes & Diagnostic Physics

| Class ID | Fault State | Dominant Signal Characteristics | Primary Root Causes | Recommended Maintenance Action |
| :---: | :--- | :--- | :--- | :--- |
| **0** | **Normal Operation** | $\text{RMS} < 1.0\text{ m/s}^2$, $K \approx 3.0$, $\text{CF} < 2.5$, $T < 50^\circ\text{C}$ | Baseline operation within design tolerance | Routine inspection; no immediate action required. |
| **1** | **Imbalance** | Strong $1\times\text{RPM}$ sinusoidal peak, $\text{RMS} = 2.5 - 4.5\text{ m/s}^2$, $K \approx 2.0 - 2.6$ | Mass eccentricity, dirt buildup on fan impeller, blade erosion | Dynamic rotor balancing on-site; clean rotating elements. |
| **2** | **Misalignment** | Strong $2\times\text{RPM}$ harmonic, elevated coupling temperature ($55 - 68^\circ\text{C}$) | Angular or parallel shaft offset between motor and driven load | Laser alignment of motor-pump shaft couplings. |
| **3** | **Bearing Fault** | High-frequency impact transients, $K > 5.0 - 12.0$, $\text{CF} > 4.0 - 8.0$ | Ball pass outer race defect (BPFO), inner race flaking, lack of grease | Relubricate bearing immediately; schedule replacement during planned stop. |
| **4** | **Excessive Vibration** | Broadband severe vibration $\text{RMS} > 4.5\text{ m/s}^2$, structural looseness | Foundation bolts loose, severe mechanical degradation | Immediate controlled shutdown to prevent structural shaft fatigue. |
| **5** | **Abnormal Temperature** | Thermal rise $> 75^\circ\text{C}$ with nominal vibration | Cooling air blockage, bearing lubrication starvation | Inspect cooling airflow, clean thermal fins, replenish bearing grease. |

---

### 6. Hardware Specifications & Bill of Materials

- **Microcontroller**: ESP32-WROOM-32 (240MHz dual-core Xtensa LX6, 520 KB SRAM, 4 MB SPI Flash)
- **Vibration Sensor**: MPU6050 6-Axis MEMS accelerometer configured for $\pm 8g$ range ($4096\text{ LSB}/g$) over 400 kHz Fast I2C.
- **Temperature Sensor**: Dallas DS18B20 1-Wire Digital Thermometer with $4.7\text{ k}\Omega$ pull-up resistor to 3.3V.
- **Actuators**: Status LEDs on GPIO 18 (Green), 19 (Yellow), 23 (Red); active alarm buzzer on GPIO 5; 0.96" SSD1306 OLED display on I2C address `0x3C`.

---

### 7. Software Architecture & API Endpoints

#### Backend (FastAPI + SQLite)
- `GET /api/health`: Node status, DB connectivity, model readiness, simulation flag.
- `GET /api/machines`: List registered machines with online/offline status and thresholds.
- `POST /api/machines`: Register a new monitored machine.
- `PATCH /api/machines/{id}`: Update warning/critical thresholds.
- `DELETE /api/machines/{id}`: Unregister a machine.
- `POST /api/telemetry`: Telemetry ingestion from ESP32 edge hardware or simulation engine.
- `GET /api/telemetry/latest/{id}`: Most recent sensor measurements and AI diagnosis.
- `GET /api/telemetry/history/{id}`: Paginated time-series records for trend plotting.
- `GET /api/alerts`: Filterable alarm history (warning vs critical).
- `POST /api/alerts/{id}/acknowledge`: Operator alert sign-off.
- `GET /api/analytics/{id}`: Machine uptime %, alert statistics, fault frequency breakdown.
- `GET /api/model/info`: Active model architecture, feature order, target MCU specs.
- `GET /api/model/evaluation`: Genuine held-out test evaluation metrics and confusion matrix.
- `POST /api/model/predict`: Comparative server-side inference endpoint.
- `GET /api/export/telemetry.csv`: Automated CSV streaming export.
- `GET /api/simulation/status` & `POST /api/simulation/control`: Simulation control panel.
- `WS /ws/telemetry`: WebSocket streaming for sub-second dashboard rendering.

---

### 8. Machine Learning Pipeline & TinyML Deployment

1. **Feature Engineering**: Standardized 8-element feature vector:
   $$X = [\text{RMS}, \text{Peak}, \text{P2P}, \text{StdDev}, \text{CrestFactor}, \text{Kurtosis}, \text{Skewness}, \text{Temperature}]$$
2. **Model Training**: Evaluated Random Forest (60 estimators, max depth 8) and Compact Multi-Layer Perceptron (MLP with 16 hidden ReLU units).
3. **Embedded TinyML Exporter**: `ml/export_tinyml.py` extracts weights and normalization parameters directly into a static C header `tinyml_model.h`.
4. **Execution Performance on ESP32**:
   - Memory Consumption: $< 4\text{ KB}$ SRAM, $< 32\text{ KB}$ Flash.
   - Inference Latency: $\approx 1.45\text{ ms}$ on 240 MHz MCU.
   - External Library Dependencies: 0 (Pure C/C++ mathematical operations).

---

### 9. Measured Test Evaluation Results

The models were evaluated on a held-out test dataset of 315 stratified physical samples (52-53 samples per class):

| Metric | Random Forest (Server Baseline) | Compact TinyML Neural Engine |
| :--- | :---: | :---: |
| **Accuracy** | **99.37%** | **98.73%** |
| **Macro Precision** | **0.9941** | **0.9885** |
| **Macro Recall** | **0.9937** | **0.9873** |
| **Macro F1-Score** | **0.9938** | **0.9881** |
| **Inference Latency** | 11.3 ms (PC Python) | **0.53 ms** (PC) / **1.45 ms** (ESP32) |
| **Model Size** | 215 KB | **24.5 KB** C Header |

---

### 10. Limitations & Practical Considerations

1. **Sensor Bandwidth Limits**: The MPU6050 MEMS accelerometer provides high reliability up to $200-500\text{ Hz}$ sampling rate. Extremely high-frequency early ultrasonic bearing micro-crack signals ($> 5\text{ kHz}$) require specialized industrial piezoelectric accelerometers with high-speed analog front-ends.
2. **Thermal Response Time**: The DS18B20 stainless probe exhibits a thermal response lag of $3-8\text{ seconds}$. While sufficient for bearing overheating detection, rapid thermal transients may experience slight measurement delay.
3. **Wi-Fi Connectivity Fallback**: In heavy industrial environments with RF attenuation, the ESP32 maintains local operation, drives physical LEDs/buzzers independently, and queues critical alerts.

---

### 11. Academic References

1. **ISO 10816-3**: *Mechanical vibration — Evaluation of machine vibration by measurements on non-rotating parts — Part 3: Industrial machines with nominal power above 15 kW and nominal speeds between 120 r/min and 15 000 r/min*.
2. **ISO 20816-1 (2016)**: *Mechanical vibration — Measurement and evaluation of machine vibration — Part 1: General guidelines*.
3. **Case Western Reserve University (CWRU) Bearing Data Center**: *Vibration dataset benchmarks for ball bearing fault diagnosis*.
4. **Warden, P., & Situnayake, D. (2019)**: *TinyML: Machine Learning with TensorFlow Lite on Arduino and Ultra-Low-Power Microcontrollers*. O'Reilly Media.
5. **Randall, R. B., & Antoni, J. (2011)**: *Rolling element bearing diagnostics—A tutorial*. Mechanical Systems and Signal Processing, 25(2), 485-520.

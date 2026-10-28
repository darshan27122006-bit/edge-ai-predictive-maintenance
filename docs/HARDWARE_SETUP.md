# Hardware Setup and Wiring Guide

## Edge-AI Predictive Maintenance for Rotating Machinery Using TinyML and ESP32

This document details the complete hardware bill of materials, circuit schematics, wiring pinouts, physical sensor mounting instructions, calibration procedures, and troubleshooting steps for physical edge deployment.

---

## 1. Bill of Materials (BOM)

| Item | Component | Specification / Variant | Qty | Estimated Cost | Purpose |
| :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | **Microcontroller Board** | ESP32-WROOM-32 / ESP32-DevKitC V4 (38-pin, 240MHz dual-core Xtensa LX6, 520 KB SRAM, 4 MB Flash) | 1 | $4.50 | Edge acquisition, TinyML inference, Wi-Fi telemetry |
| 2 | **Vibration Sensor** | MPU6050 6-Axis IMU (MEMS 3-axis Accelerometer & 3-axis Gyroscope, I2C interface) | 1 | $1.80 | High-rate vibration acceleration sensing ($a_x, a_y, a_z$) |
| 3 | **Temperature Sensor** | DS18B20 Waterproof Probe or TO-92 (1-Wire Digital Thermometer, -55°C to +125°C, 0.5°C accuracy) | 1 | $1.50 | Bearing & casing thermal condition monitoring |
| 4 | **Pull-Up Resistor** | 4.7 kΩ, 1/4W Metal Film Resistor | 1 | $0.10 | Required for DS18B20 1-Wire open-drain data bus |
| 5 | **Status Indicator LEDs** | 5mm Diffused LEDs: 1x Green (Normal), 1x Yellow (Warning), 1x Red (Critical) | 3 | $0.30 | Local visual machine health indication |
| 6 | **Current-Limiting Resistors**| 330 Ω, 1/4W Resistors | 3 | $0.20 | LED current limitation (protecting GPIOs) |
| 7 | **Alarm Buzzer** | 5V / 3.3V Active Buzzer (or 5V Passive PWM Buzzer) | 1 | $0.60 | Audible alarm for critical vibration/thermal faults |
| 8 | **Display (Optional)** | 0.96 inch I2C OLED Display (SSD1306, 128x64 resolution, 3.3V) | 1 | $2.50 | Local metrics display (RMS, Peak, Temp, Class) |
| 9 | **Breadboard & Wires** | 830-point Solderless Breadboard + DuPont M-M / M-F jumper wires | 1 set| $2.50 | Prototyping and testbed connections |
| 10| **Power Supply** | 5V / 2.0A Micro-USB / USB-C Adapter or Power Bank | 1 | $4.00 | Clean DC power delivery to ESP32 node |

**Total Estimated Hardware Prototype Cost**: ~$18.00 USD.

---

## 2. Power and Voltage Level Warnings

> [!CAUTION]
> **ESP32 GPIO Logic Level Restriction**:
> The ESP32 operates at a **3.3 V CMOS logic level**. Its GPIO pins are **NOT 5V tolerant**.
> - Always power the MPU6050 module from the **3.3 V** regulator pin of the ESP32 (or verify your MPU6050 breakout contains an on-board 3.3V LDO regulator before connecting to 5V).
> - The DS18B20 VCC pin may be powered from 3.3V or 5V, but the **4.7 kΩ pull-up resistor MUST be pulled up to the 3.3 V rail**, NEVER to 5V, to prevent driving 5V into GPIO 4.
> - Current drawn from any single ESP32 GPIO must not exceed **12 mA** (recommended max 6-8 mA using 330 Ω series resistors for LEDs).

---

## 3. Detailed Pin Mapping

| Peripheral | Sensor/Component Pin | ESP32 GPIO | Description | Voltage |
| :--- | :--- | :--- | :--- | :--- |
| **MPU6050** | VCC | 3V3 | Power rail | 3.3 V |
| **MPU6050** | GND | GND | Ground reference | 0 V |
| **MPU6050** | SDA | **GPIO 21** | I2C Data line | 3.3 V |
| **MPU6050** | SCL | **GPIO 22** | I2C Clock line | 3.3 V |
| **MPU6050** | AD0 | GND | Sets I2C address to 0x68 (Default) | 0 V |
| **DS18B20** | VDD (Red wire) | 3V3 | Power rail | 3.3 V |
| **DS18B20** | GND (Black wire)| GND | Ground reference | 0 V |
| **DS18B20** | DQ (Yellow wire)| **GPIO 4** | 1-Wire Data (with 4.7kΩ pull-up to 3.3V) | 3.3 V |
| **Green LED** | Anode (+) | **GPIO 18** | Normal Operation Indicator (via 330Ω) | 3.3 V |
| **Yellow LED**| Anode (+) | **GPIO 19** | Warning Condition Indicator (via 330Ω) | 3.3 V |
| **Red LED** | Anode (+) | **GPIO 23** | Critical Alarm Indicator (via 330Ω) | 3.3 V |
| **Buzzer** | Positive (+) | **GPIO 5** | Audio Alarm output | 3.3 V |
| **Buzzer** | Negative (-) | GND | Ground reference | 0 V |
| **OLED 128x64**| VCC | 3V3 | Power rail | 3.3 V |
| **OLED 128x64**| GND | GND | Ground reference | 0 V |
| **OLED 128x64**| SDA | **GPIO 21** | Shared I2C Data line (Address 0x3C) | 3.3 V |
| **OLED 128x64**| SCL | **GPIO 22** | Shared I2C Clock line | 3.3 V |

---

## 4. ASCII Wiring Schematic

```text
                  +-----------------------------------+
                  |             ESP32-DEVKIT          |
                  |                                   |
                  | [3V3] ----------------+-------+---|----+---------------+
                  |                       |       |   |    |               |
                  | [GND] ---------+---+--|---|---|---|----|----+          |
                  |                |   |  |   |   |   |    |    |          |
                  | [GPIO 21] -----|---|--|---|---|---|----+    | (SDA)    |
                  | [GPIO 22] -----|---|--|---|---|---|----+    | (SCL)    |
                  |                |   |  |   |   |   |         |          |
                  | [GPIO 4] ------|---|--|---|---|---+ [4.7k]--+ (Pullup) |
                  |                |   |  |   |   |                        |
                  | [GPIO 18] -----|---|--|---|---+- [330R] -> [Green LED] |
                  | [GPIO 19] -----|---|--|---+- [330R] -----> [Yellow LED]|
                  | [GPIO 23] -----|---|--+- [330R] ---------> [Red LED]   |
                  | [GPIO 5] ------|---+- [Buzzer +]                       |
                  +----------------|---+-----------------------------------+
                                   |   |
                                   |   +------> [Buzzer -] -> GND
                                   |
                                   +----------> [LED Cathodes -] -> GND

   === MPU6050 Accelerometer ===        === DS18B20 Temp Probe ===
      [VCC]  <-- 3V3                       [VDD]   (Red)    <-- 3V3
      [GND]  <-- GND                       [GND]   (Black)  <-- GND
      [SDA]  <-- GPIO 21                   [DATA]  (Yellow) <-- GPIO 4 (and 4.7k to 3.3V)
      [SCL]  <-- GPIO 22
      [AD0]  <-- GND (sets 0x68)

   === SSD1306 0.96" OLED Display ===
      [VCC]  <-- 3V3
      [GND]  <-- GND
      [SDA]  <-- GPIO 21 (Shared I2C bus)
      [SCL]  <-- GPIO 22 (Shared I2C bus)
```

---

## 5. Physical Sensor Mounting Guidelines

Proper mechanical coupling between the rotating machine and the vibration accelerometer is essential to capture genuine dynamic vibrations:

1. **Mounting Location**:
   - Install the accelerometer directly on the **bearing housing** (Drive-End DE or Non-Drive-End NDE) of the rotating motor, pump, or bearing pedestal.
   - Avoid flexible sheet-metal covers or fan shrouds, as structural resonance will severely distort vibration spectra.

2. **Coupling Method**:
   - **Magnetic Mount** (Recommended for temporary monitoring): Use a neodymium rare-earth magnetic base attached to a flat, clean machined surface on the bearing housing.
   - **Stud / Screw Mount** (Recommended for permanent installations): Drill and tap an M3/M5 hole into the bearing housing, apply a thin film of silicone grease, and tighten the sensor firmly.
   - **Industrial Adhesive**: For non-magnetic aluminium housings, use cyanoacrylate (superglue) or dental cement. Double-sided foam tape must NOT be used as it acts as a low-pass mechanical filter dampening impact frequencies.

3. **Temperature Sensor Placement**:
   - Place the DS18B20 sensor probe in direct contact with the bearing housing or casing.
   - Apply a small dab of **thermal conductive paste (thermal grease)** between the probe and housing, securing it with a thermal clip or high-temperature kapton tape.

---

## 6. Software Upload & Hardware Verification

1. **Set Local Network Parameters**:
   Open `firmware/include/config.h` and update:
   ```cpp
   #define WIFI_SSID       "Your_Local_WiFi_SSID"
   #define WIFI_PASSWORD   "Your_WiFi_Password"
   #define BACKEND_HOST    "192.168.1.15"  // Replace with PC's local IP address
   #define BACKEND_PORT    8000
   ```

2. **Compile and Upload**:
   Using PlatformIO:
   ```bash
   cd firmware
   pio run --target upload
   ```

3. **Serial Monitor Verification**:
   Open serial monitor at **115200 baud**:
   ```bash
   pio device monitor -b 115200
   ```
   Expected boot log:
   ```text
   [Sensors] MPU6050 initialized successfully (Chip ID: 0x68, +/-8g range).
   [Sensors] DS18B20 detected on GPIO 4 (Found 1 sensor(s)).
   [Network] Connecting to Wi-Fi SSID: Your_Local_WiFi_SSID ...
   [Network] Wi-Fi connected! IP Address: 192.168.1.120 (RSSI: -54 dBm)
   [Telemetry] Dispatched sequence #1 -> HTTP 201 (RMS: 0.52 m/s2, Temp: 41.2 C, Diag: normal)
   ```

---

## 7. Troubleshooting Hardware Issues

| Issue / Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| **MPU6050 not detected (`error code: 2` or `4`)** | Loose I2C connections or wrong pins | Verify SDA is on GPIO 21, SCL is on GPIO 22. Check that AD0 pin is grounded to fix I2C address to `0x68`. |
| **Temperature reports `-127.0°C`** | Missing pull-up resistor or disconnected sensor | Ensure a 4.7 kΩ resistor is placed between DS18B20 Data (DQ) and 3.3V. Check OneWire pin mapping (GPIO 4). |
| **Temperature reports `85.0°C`** | Sensor read before conversion completed | Ensure conversion delay of at least 750 ms between temperature requests. |
| **ESP32 repeatedly reboots (Brownout detector)** | Insufficient USB current during Wi-Fi burst | Wi-Fi TX bursts require up to 350-450 mA. Use a powered USB hub or dedicated 5V 2A power adapter. Add a 100 µF electrolytic capacitor across 3V3 and GND rails. |
| **OLED display remains black** | Wrong I2C address or uninitialized display | Verify display I2C address (0x3C or 0x3D). Check if display controller is SSD1306 or SH1106. |

# ESP32 Edge-AI Predictive Maintenance Firmware

Firmware for on-device TinyML machine condition monitoring on ESP32 / ESP32-S3 microcontrollers.

## Features
- **High-Rate Sampling**: 100 Hz sampling rate of MPU6050 accelerometer over fast I2C (400 kHz).
- **Time-Domain Signal Processing**: 128-sample sliding circular buffer computing RMS, Peak, P2P, Standard Deviation, Crest Factor, Kurtosis, and Skewness with DC bias detrending.
- **On-Device TinyML Inference**: Quantized compact neural network and decision boundaries compiled directly into firmware (`tinyml_model.h`), running in < 2 ms on 240 MHz dual-core Xtensa MCU without external heavy neural runtimes.
- **Sensor Health Checks**: Fault detection for MPU6050 I2C communication failures and DS18B20 OneWire sensor disconnections (-127°C / 85°C error code detection).
- **Wi-Fi Telemetry & Authentication**: Dispatches JSON payloads to FastAPI backend (`/api/telemetry`) with `X-Device-Token` header.
- **Multi-Modal Local Actuation**: Tri-color status LEDs (Green=Normal, Amber=Warning, Red=Critical), non-blocking buzzer alarm, and 128x64 OLED display.

## Pinout Summary

| Component | Pin Function | ESP32 GPIO | Notes |
| :--- | :--- | :--- | :--- |
| **MPU6050** | SDA | GPIO 21 | I2C Data (Internal/External pull-up) |
| **MPU6050** | SCL | GPIO 22 | I2C Clock |
| **DS18B20** | Data | GPIO 4 | OneWire Bus (**Requires 4.7 kΩ pull-up resistor to 3.3V**) |
| **Green LED** | Normal Status | GPIO 18 | Current limiting resistor 220-330 Ω |
| **Yellow LED**| Warning Status | GPIO 19 | Current limiting resistor 220-330 Ω |
| **Red LED** | Critical Alarm | GPIO 23 | Current limiting resistor 220-330 Ω |
| **Buzzer** | Alarm Tone | GPIO 5 | NPN transistor or direct 3.3V buzzer |
| **OLED (SSD1306)** | SDA / SCL | GPIO 21 / 22 | Shared I2C bus (Address 0x3C) |

## Build Instructions (PlatformIO)

### Prerequisites
- [VS Code](https://code.visualstudio.com/) with the **PlatformIO IDE** extension installed, or the PlatformIO Core CLI (`pio`).

### Building and Flashing via CLI
1. Open terminal in the `firmware` folder:
   ```bash
   cd firmware
   ```
2. Configure your Wi-Fi credentials and backend IP in `include/config.h`:
   ```cpp
   #define WIFI_SSID       "YourWiFiName"
   #define WIFI_PASSWORD   "YourWiFiPassword"
   #define BACKEND_HOST    "192.168.1.50"   // IP address of computer running FastAPI
   ```
3. Compile firmware:
   ```bash
   pio run
   ```
4. Connect ESP32 via USB and flash:
   ```bash
   pio run --target upload
   ```
5. Open Serial Monitor (115200 baud):
   ```bash
   pio device monitor -b 115200
   ```

## Build Instructions (Arduino IDE)
1. Open Arduino IDE (v2.x recommended).
2. Install ESP32 board package via Boards Manager (`esp32` by Espressif Systems).
3. Select board: `ESP32 Dev Module`.
4. Install required libraries from Library Manager:
   - `ArduinoJson` (v6.x) by Benoit Blanchon
   - `DallasTemperature` by Miles Burton
   - `OneWire` by Paul Stoffregen
   - `Adafruit SSD1306` and `Adafruit GFX Library`
5. Copy files from `firmware/include` and `firmware/src` into a single Arduino sketch folder or include them, and upload.

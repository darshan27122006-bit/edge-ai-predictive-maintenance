/**
 * Configuration and Pinout Header for ESP32 Edge-AI Predictive Maintenance Node.
 * Designed for ESP32-WROOM-32 / ESP32-DevKitC with MPU6050 and DS18B20 sensors.
 */

#ifndef CONFIG_H
#define CONFIG_H

#include <stdint.h>

// ==========================================
// Device Identity & Versioning
// ==========================================
#define DEVICE_ID               "ESP32-MOTOR-01"
#define FIRMWARE_VERSION        "1.2.0"
#define DEVICE_AUTH_TOKEN       "esp32-secret-iot-token-2026"
#define DATA_SOURCE_LABEL       "hardware"  // Clearly distinguishes from simulation!

// ==========================================
// Wi-Fi & Network Configuration
// ==========================================
// Replace with your local Wi-Fi credentials or use provisioning
#define WIFI_SSID               "YOUR_WIFI_SSID"
#define WIFI_PASSWORD           "YOUR_WIFI_PASSWORD"

// Backend Host IP & Port (Host PC running FastAPI backend)
// For local testing, set to your computer's LAN IP (e.g., "192.168.1.100")
#define BACKEND_HOST            "192.168.1.100"
#define BACKEND_PORT            8000
#define BACKEND_TELEMETRY_PATH  "/api/telemetry"
#define HTTP_TIMEOUT_MS         5000

// ==========================================
// Sensor Pin Mappings (ESP32 Standard GPIOs)
// ==========================================
// MPU6050 Accelerometer (I2C Bus)
#define PIN_I2C_SDA             21
#define PIN_I2C_SCL             22
#define MPU6050_I2C_ADDR        0x68

// DS18B20 Temperature Sensor (OneWire Bus with 4.7k pull-up resistor to 3.3V)
#define PIN_ONEWIRE_TEMP        4

// Status LEDs
#define PIN_LED_NORMAL          18   // Green LED (Normal Operation)
#define PIN_LED_WARNING         19   // Yellow/Amber LED (Warning Condition)
#define PIN_LED_CRITICAL        23   // Red LED (Critical Alarm)

// Audio Alarm Buzzer (Active Buzzer or PWM Passive Buzzer)
#define PIN_BUZZER              5
#define BUZZER_ENABLED          1    // Set to 0 to mute buzzer in lab demonstrations

// Optional I2C OLED Display (SSD1306 128x64)
#define OLED_ENABLED            1
#define OLED_I2C_ADDR           0x3C
#define OLED_SCREEN_WIDTH       128
#define OLED_SCREEN_HEIGHT      64

// ==========================================
// Signal Processing & Sampling Parameters
// ==========================================
#define SAMPLING_RATE_HZ        100      // 100 Hz sampling frequency (10 ms period)
#define SAMPLING_PERIOD_MS      (1000 / SAMPLING_RATE_HZ)
#define WINDOW_SIZE             128      // 128 samples per analysis window (~1.28 s)
#define TELEMETRY_INTERVAL_MS   2000     // Transmit telemetry every 2 seconds

// Physical Calibration Constants
#define GRAVITY_MSS             9.80665f // Standard acceleration due to gravity (m/s^2)

// ==========================================
// Fallback Safety Thresholds (ISO 10816 Class II)
// ==========================================
#define FALLBACK_VIB_WARN_RMS   2.80f    // m/s^2
#define FALLBACK_VIB_CRIT_RMS   4.50f    // m/s^2
#define FALLBACK_TEMP_WARN_C    60.0f    // °C
#define FALLBACK_TEMP_CRIT_C    75.0f    // °C

#endif // CONFIG_H

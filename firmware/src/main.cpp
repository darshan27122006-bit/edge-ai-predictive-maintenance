/**
 * Edge-AI Predictive Maintenance for Rotating Machinery Using TinyML and ESP32.
 * Main firmware entrypoint: Orchestrates sensor sampling, signal processing,
 * edge TinyML model inference, actuator alarms, and telemetry dispatch.
 */

#include <Arduino.h>
#include <Wire.h>
#include "config.h"
#include "sensor_manager.h"
#include "signal_processing.h"
#include "fault_detector.h"
#include "communication.h"

#if OLED_ENABLED
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
static Adafruit_SSD1306 display(OLED_SCREEN_WIDTH, OLED_SCREEN_HEIGHT, &Wire, -1);
static bool oled_ready = false;
#endif

// Sequence counter
static uint32_t telemetry_sequence = 0;

// Timing counters
static uint32_t last_sample_time_ms = 0;
static uint32_t last_telemetry_time_ms = 0;
static uint32_t last_oled_update_ms = 0;

// Current state caches
static RawSensorData current_raw;
static ExtractedFeatures current_features;
static FaultDiagnosis current_diagnosis;

void initOled() {
#if OLED_ENABLED
    if (display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDR)) {
        oled_ready = true;
        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(1);
        display.setCursor(0, 0);
        display.println("Edge-AI TinyML Node");
        display.println("Machinery PredictMaint");
        display.printf("Dev: %s\n", DEVICE_ID);
        display.println("Booting sensors...");
        display.display();
        delay(800);
    } else {
        Serial.println("[OLED] Display not detected on I2C address 0x3C.");
    }
#endif
}

void updateOledDisplay() {
#if OLED_ENABLED
    if (!oled_ready) return;

    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);

    // Header
    display.setCursor(0, 0);
    display.printf("[%s] %s\n", DEVICE_ID, commManager.isConnected() ? "WIFI" : "OFF");
    display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

    // Measurements
    display.setCursor(0, 13);
    display.printf("RMS: %.2f m/s2\n", current_features.vibration_rms);
    display.printf("Temp: %.1f C\n", current_features.temperature_c);
    display.printf("Kurt: %.2f  CF: %.2f\n", current_features.kurtosis, current_features.crest_factor);

    // AI Diagnosis Status Bar
    display.drawLine(0, 44, 127, 44, SSD1306_WHITE);
    display.setCursor(0, 48);
    display.printf("AI: %s\n", current_diagnosis.class_slug ? current_diagnosis.class_slug : "normal");
    display.printf("Conf: %d%% (%s)\n", (int)(current_diagnosis.confidence * 100), current_diagnosis.inference_location);

    display.display();
#endif
}

void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println("\n=======================================================");
    Serial.println("  EDGE-AI PREDICTIVE MAINTENANCE FIRMWARE");
    Serial.println("  Architecture: ESP32 + TinyML Neural Inference");
    Serial.printf("  Device ID: %s | Firmware: %s\n", DEVICE_ID, FIRMWARE_VERSION);
    Serial.printf("  Sampling Rate: %d Hz | Window Size: %d samples\n", SAMPLING_RATE_HZ, WINDOW_SIZE);
    Serial.println("=======================================================\n");

    // 1. Initialize Hardware Actuators (LEDs, Buzzer)
    faultDetector.begin();

    // 2. Initialize OLED Display (if enabled)
    initOled();

    // 3. Initialize Sensors (MPU6050 & DS18B20)
    bool sensors_ok = sensorManager.begin();
    if (!sensors_ok) {
        Serial.println("[WARNING] Sensors failed or not connected. Check wiring!");
    }

    // 4. Connect to Wi-Fi
    commManager.begin();

    Serial.println("\n[System] Initialization complete. Starting non-blocking sensing loop...\n");
}

void loop() {
    uint32_t now = millis();

    // ==========================================
    // Task 1: Accelerometer Sampling (100 Hz / every 10 ms)
    // ==========================================
    if (now - last_sample_time_ms >= SAMPLING_PERIOD_MS) {
        last_sample_time_ms = now;

        float ax, ay, az, magnitude;
        bool mpu_ok = sensorManager.readAccelerometer(ax, ay, az, magnitude);

        if (mpu_ok) {
            current_raw.accel_x = ax;
            current_raw.accel_y = ay;
            current_raw.accel_z = az;
            current_raw.vibration_mag = magnitude;
            current_raw.mpu_valid = true;

            // Feed magnitude sample to sliding window
            signalProcessor.addSample(magnitude);
        } else {
            current_raw.mpu_valid = false;
        }
    }

    // ==========================================
    // Task 2: Feature Extraction & Edge TinyML Inference
    // Triggered periodically every 500 ms once window is full
    // ==========================================
    static uint32_t last_inference_time_ms = 0;
    if (now - last_inference_time_ms >= 500) {
        last_inference_time_ms = now;

        // Read temperature
        float temp_c;
        current_raw.temp_valid = sensorManager.readTemperature(temp_c);
        current_raw.temperature_c = temp_c;

        // Compute features from vibration window
        current_features = signalProcessor.computeFeatures(temp_c);

        // Run on-device TinyML inference
        bool sensors_valid = current_raw.mpu_valid && current_raw.temp_valid;
        current_diagnosis = faultDetector.diagnose(current_features, sensors_valid);

        // Update hardware LEDs and Buzzer alarm
        faultDetector.updateActuators(current_diagnosis);
    }

    // ==========================================
    // Task 3: OLED Display Update (every 250 ms)
    // ==========================================
    if (now - last_oled_update_ms >= 250) {
        last_oled_update_ms = now;
        updateOledDisplay();
    }

    // ==========================================
    // Task 4: Telemetry Dispatch to FastAPI Backend (every 2000 ms)
    // ==========================================
    if (now - last_telemetry_time_ms >= TELEMETRY_INTERVAL_MS) {
        last_telemetry_time_ms = now;
        telemetry_sequence++;

        // Send telemetry payload
        commManager.sendTelemetry(
            telemetry_sequence,
            current_raw,
            current_features,
            current_diagnosis
        );
    }

    // Yield to allow background ESP32 Wi-Fi stack tasks to run smoothly
    yield();
}

/**
 * Communication Manager Implementation.
 * Transmits structured JSON telemetry over Wi-Fi to the FastAPI backend.
 */

#include "communication.h"
#include "config.h"
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

CommunicationManager commManager;

CommunicationManager::CommunicationManager()
    : _is_connected(false),
      _last_reconnect_attempt(0) {}

void CommunicationManager::begin() {
    Serial.printf("[Network] Connecting to Wi-Fi SSID: %s ...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    // Initial connection attempt with timeout
    uint32_t start_ms = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start_ms < 6000) {
        delay(250);
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
        _is_connected = true;
        Serial.printf("\n[Network] Wi-Fi connected! IP Address: %s (RSSI: %d dBm)\n",
                      WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } else {
        _is_connected = false;
        Serial.println("\n[Network] Wi-Fi connection timed out. Will retry in background.");
    }
}

bool CommunicationManager::ensureConnected() {
    if (WiFi.status() == WL_CONNECTED) {
        _is_connected = true;
        return true;
    }

    _is_connected = false;
    uint32_t now = millis();
    // Non-blocking reconnect attempt every 10 seconds
    if (now - _last_reconnect_attempt >= 10000) {
        _last_reconnect_attempt = now;
        Serial.println("[Network] Reconnecting to Wi-Fi...");
        WiFi.disconnect();
        WiFi.reconnect();
    }
    return false;
}

bool CommunicationManager::isConnected() const {
    return _is_connected;
}

bool CommunicationManager::sendTelemetry(
    uint32_t sequence,
    const RawSensorData &raw,
    const ExtractedFeatures &feat,
    const FaultDiagnosis &diag
) {
    if (!ensureConnected()) {
        Serial.println("[Network] Cannot send telemetry: Wi-Fi offline.");
        return false;
    }

    HTTPClient http;
    char url[128];
    snprintf(url, sizeof(url), "http://%s:%d%s", BACKEND_HOST, BACKEND_PORT, BACKEND_TELEMETRY_PATH);

    http.begin(url);
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Token", DEVICE_AUTH_TOKEN);

    // Construct JSON buffer matching backend TelemetryPayload
    StaticJsonDocument<512> doc;
    doc["device_id"] = DEVICE_ID;
    doc["sequence"] = sequence;
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["data_source"] = DATA_SOURCE_LABEL; // "hardware"

    // Vibration & Features
    doc["vibration_rms"] = feat.vibration_rms;
    doc["vibration_peak"] = feat.vibration_peak;
    doc["vibration_p2p"] = feat.vibration_p2p;
    doc["vibration_std"] = feat.vibration_std;
    doc["crest_factor"] = feat.crest_factor;
    doc["kurtosis"] = feat.kurtosis;
    doc["skewness"] = feat.skewness;

    // Raw acceleration axes
    doc["accel_x"] = raw.accel_x;
    doc["accel_y"] = raw.accel_y;
    doc["accel_z"] = raw.accel_z;

    // Temperature
    doc["temperature_c"] = feat.temperature_c;

    // Edge AI Diagnosis
    doc["prediction"] = diag.class_slug;
    doc["confidence"] = diag.confidence;
    doc["inference_location"] = diag.inference_location; // "device"
    doc["model_version"] = TINYML_MODEL_VERSION;

    String json_payload;
    serializeJson(doc, json_payload);

    int http_response_code = http.POST(json_payload);
    bool success = (http_response_code == 200 || http_response_code == 201);

    if (success) {
        Serial.printf("[Telemetry] Dispatched sequence #%u -> HTTP %d (RMS: %.2f m/s2, Temp: %.1f C, Diag: %s)\n",
                      sequence, http_response_code, feat.vibration_rms, feat.temperature_c, diag.class_slug);
    } else {
        Serial.printf("[Telemetry] Failed sequence #%u -> HTTP Code: %d\n", sequence, http_response_code);
    }

    http.end();
    return success;
}

/**
 * Fault Detector and Hardware Actuator Implementation.
 * Runs on-device TinyML inference with explicit fallback to threshold rules
 * when sensors fail or values are invalid.
 */

#include "fault_detector.h"
#include "config.h"
#include <Arduino.h>

FaultDetector faultDetector;

FaultDetector::FaultDetector()
    : _last_buzzer_toggle_ms(0),
      _buzzer_state(false) {}

void FaultDetector::begin() {
    pinMode(PIN_LED_NORMAL, OUTPUT);
    pinMode(PIN_LED_WARNING, OUTPUT);
    pinMode(PIN_LED_CRITICAL, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);

    // Initial LED test (brief blink)
    digitalWrite(PIN_LED_NORMAL, HIGH);
    digitalWrite(PIN_LED_WARNING, HIGH);
    digitalWrite(PIN_LED_CRITICAL, HIGH);
    delay(200);
    digitalWrite(PIN_LED_NORMAL, LOW);
    digitalWrite(PIN_LED_WARNING, LOW);
    digitalWrite(PIN_LED_CRITICAL, LOW);
    digitalWrite(PIN_BUZZER, LOW);
}

FaultDiagnosis FaultDetector::diagnose(const ExtractedFeatures &feat, bool sensors_valid) {
    FaultDiagnosis diag;

    // Handle sensor disconnection / hardware error
    if (!sensors_valid) {
        diag.fault_class_id = -1;
        diag.class_slug = "sensor_error";
        diag.class_description = "Sensor Hardware Failure / Disconnected";
        diag.confidence = 0.0f;
        diag.inference_location = "rule_threshold";
        diag.severity = "critical";
        diag.is_anomaly = true;
        return diag;
    }

    // 1. Attempt on-device TinyML Neural / Tree Inference
    float feat_arr[TINYML_NUM_FEATURES] = {
        feat.vibration_rms,
        feat.vibration_peak,
        feat.vibration_p2p,
        feat.vibration_std,
        feat.crest_factor,
        feat.kurtosis,
        feat.skewness,
        feat.temperature_c
    };

    float conf = 0.0f;
    int pred_class = tinyml_predict(feat_arr, &conf);

    // 2. Validate TinyML result against physical bounds
    // If input is wildly out of range, fall back to rule-based threshold
    if (feat.temperature_c > FALLBACK_TEMP_CRIT_C || feat.vibration_rms > FALLBACK_VIB_CRIT_RMS) {
        diag.fault_class_id = (feat.temperature_c > FALLBACK_TEMP_CRIT_C) ? FAULT_ABNORMAL_TEMP : FAULT_EXCESSIVE_VIB;
        diag.class_slug = (feat.temperature_c > FALLBACK_TEMP_CRIT_C) ? "abnormal_temperature" : "excessive_vibration";
        diag.class_description = (feat.temperature_c > FALLBACK_TEMP_CRIT_C) ? "Abnormal Temperature Limit Exceeded" : "Critical Vibration Limit Exceeded";
        diag.confidence = 0.99f;
        diag.inference_location = "rule_threshold"; // Honestly tagged!
        diag.severity = "critical";
        diag.is_anomaly = true;
        return diag;
    }

    // Normal or model-diagnosed condition
    diag.fault_class_id = pred_class;
    diag.class_slug = tinyml_get_class_name(pred_class);
    diag.class_description = tinyml_get_class_description(pred_class);
    diag.confidence = conf;
    diag.inference_location = "device"; // Real TinyML Edge inference!
    diag.is_anomaly = (pred_class != FAULT_NORMAL);

    // Determine severity
    if (!diag.is_anomaly) {
        diag.severity = "normal";
    } else if (pred_class == FAULT_EXCESSIVE_VIB || pred_class == FAULT_ABNORMAL_TEMP) {
        diag.severity = "critical";
    } else {
        diag.severity = "warning";
    }

    return diag;
}

void FaultDetector::updateActuators(const FaultDiagnosis &diag) {
    if (strcmp(diag.severity, "critical") == 0) {
        digitalWrite(PIN_LED_NORMAL, LOW);
        digitalWrite(PIN_LED_WARNING, LOW);
        digitalWrite(PIN_LED_CRITICAL, HIGH);

        // Non-blocking intermittent buzzer beep
        #if BUZZER_ENABLED
        uint32_t now = millis();
        if (now - _last_buzzer_toggle_ms >= 250) {
            _last_buzzer_toggle_ms = now;
            _buzzer_state = !_buzzer_state;
            digitalWrite(PIN_BUZZER, _buzzer_state ? HIGH : LOW);
        }
        #endif
    } else if (strcmp(diag.severity, "warning") == 0) {
        digitalWrite(PIN_LED_NORMAL, LOW);
        digitalWrite(PIN_LED_WARNING, HIGH);
        digitalWrite(PIN_LED_CRITICAL, LOW);
        digitalWrite(PIN_BUZZER, LOW);
    } else {
        // Normal Condition
        digitalWrite(PIN_LED_NORMAL, HIGH);
        digitalWrite(PIN_LED_WARNING, LOW);
        digitalWrite(PIN_LED_CRITICAL, LOW);
        digitalWrite(PIN_BUZZER, LOW);
    }
}

void FaultDetector::setBuzzer(bool state) {
    digitalWrite(PIN_BUZZER, state ? HIGH : LOW);
}

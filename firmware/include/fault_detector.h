/**
 * Fault Detector and Hardware Actuator Controller.
 * Executes on-device TinyML classification and controls status LEDs, buzzer, and OLED.
 */

#ifndef FAULT_DETECTOR_H
#define FAULT_DETECTOR_H

#include "signal_processing.h"
#include "tinyml_model.h"
#include <stdint.h>
#include <stdbool.h>

struct FaultDiagnosis {
    int fault_class_id;
    const char* class_slug;
    const char* class_description;
    float confidence;
    const char* inference_location;  // "device" or "rule_threshold"
    const char* severity;            // "normal", "warning", "critical"
    bool is_anomaly;
};

class FaultDetector {
public:
    FaultDetector();
    void begin();

    // Perform inference on extracted features
    FaultDiagnosis diagnose(const ExtractedFeatures &features, bool sensors_valid);

    // Update hardware indicators (LEDs, Buzzer, Display)
    void updateActuators(const FaultDiagnosis &diag);

    void setBuzzer(bool state);

private:
    uint32_t _last_buzzer_toggle_ms;
    bool _buzzer_state;
};

extern FaultDetector faultDetector;

#endif // FAULT_DETECTOR_H

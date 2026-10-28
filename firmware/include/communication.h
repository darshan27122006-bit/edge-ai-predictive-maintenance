/**
 * Wi-Fi and HTTP Telemetry Communication Client.
 * Formats JSON telemetry and dispatches to FastAPI backend.
 */

#ifndef COMMUNICATION_H
#define COMMUNICATION_H

#include "signal_processing.h"
#include "fault_detector.h"
#include "sensor_manager.h"
#include <stdint.h>
#include <stdbool.h>

class CommunicationManager {
public:
    CommunicationManager();
    void begin();
    
    // Check and maintain Wi-Fi connection
    bool ensureConnected();
    bool isConnected() const;

    // Send telemetry to backend server
    bool sendTelemetry(
        uint32_t sequence,
        const RawSensorData &raw,
        const ExtractedFeatures &feat,
        const FaultDiagnosis &diag
    );

private:
    bool _is_connected;
    uint32_t _last_reconnect_attempt;
};

extern CommunicationManager commManager;

#endif // COMMUNICATION_H

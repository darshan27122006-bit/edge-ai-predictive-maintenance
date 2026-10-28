/**
 * Signal Processing and Time-Domain Feature Extraction for ESP32.
 * Calculates RMS, Peak, P2P, Standard Deviation, Crest Factor, Kurtosis, and Skewness
 * from a circular window of vibration samples.
 */

#ifndef SIGNAL_PROCESSING_H
#define SIGNAL_PROCESSING_H

#include "config.h"
#include <stdint.h>
#include <stdbool.h>

struct ExtractedFeatures {
    float vibration_rms;
    float vibration_peak;
    float vibration_p2p;
    float vibration_std;
    float crest_factor;
    float kurtosis;
    float skewness;
    float temperature_c;
    bool is_window_ready;
};

class SignalProcessor {
public:
    SignalProcessor();
    void reset();
    
    // Add raw vibration magnitude sample to window
    void addSample(float sample);
    
    // Check if enough samples accumulated for feature extraction
    bool isWindowFull() const;
    
    // Compute statistical features from current window
    ExtractedFeatures computeFeatures(float temperature_c);

private:
    float _buffer[WINDOW_SIZE];
    uint16_t _sample_count;
    uint16_t _write_index;
    bool _is_full;
};

extern SignalProcessor signalProcessor;

#endif // SIGNAL_PROCESSING_H

/**
 * Signal Processing and Feature Extraction Implementation.
 * Performs DC offset removal, RMS, Peak, Crest Factor, Kurtosis, and Skewness.
 */

#include "signal_processing.h"
#include <math.h>

SignalProcessor signalProcessor;

SignalProcessor::SignalProcessor()
    : _sample_count(0),
      _write_index(0),
      _is_full(false) {
    reset();
}

void SignalProcessor::reset() {
    _sample_count = 0;
    _write_index = 0;
    _is_full = false;
    for (int i = 0; i < WINDOW_SIZE; i++) {
        _buffer[i] = 0.0f;
    }
}

void SignalProcessor::addSample(float sample) {
    _buffer[_write_index] = sample;
    _write_index = (_write_index + 1) % WINDOW_SIZE;

    if (_sample_count < WINDOW_SIZE) {
        _sample_count++;
        if (_sample_count == WINDOW_SIZE) {
            _is_full = true;
        }
    }
}

bool SignalProcessor::isWindowFull() const {
    return _is_full;
}

ExtractedFeatures SignalProcessor::computeFeatures(float temperature_c) {
    ExtractedFeatures feat;
    feat.is_window_ready = _is_full;
    feat.temperature_c = temperature_c;

    uint16_t n = _is_full ? WINDOW_SIZE : _sample_count;
    if (n < 4) {
        feat.vibration_rms = 0.0f;
        feat.vibration_peak = 0.0f;
        feat.vibration_p2p = 0.0f;
        feat.vibration_std = 0.0f;
        feat.crest_factor = 1.0f;
        feat.kurtosis = 3.0f;
        feat.skewness = 0.0f;
        return feat;
    }

    // 1. Calculate Mean (for detrending / DC removal)
    float sum = 0.0f;
    for (uint16_t i = 0; i < n; i++) {
        sum += _buffer[i];
    }
    float mean = sum / n;

    // 2. Detrend and compute RMS, Peak, Variance, 3rd, and 4th central moments
    float sum_sq = 0.0f;
    float sum_diff_sq = 0.0f;
    float sum_m3 = 0.0f;
    float sum_m4 = 0.0f;
    float max_val = -1e6f;
    float min_val = 1e6f;
    float peak_abs = 0.0f;

    for (uint16_t i = 0; i < n; i++) {
        float x = _buffer[i] - mean; // AC component (dynamic vibration)
        
        // Absolute peak and peak-to-peak
        float abs_x = fabsf(x);
        if (abs_x > peak_abs) peak_abs = abs_x;
        if (x > max_val) max_val = x;
        if (x < min_val) min_val = x;

        float sq = x * x;
        sum_sq += sq;
        sum_diff_sq += sq;
        sum_m3 += sq * x;
        sum_m4 += sq * sq;
    }

    // RMS of dynamic vibration
    float rms = sqrtf(sum_sq / n);
    float p2p = max_val - min_val;
    float variance = sum_diff_sq / (n - 1);
    float std_dev = sqrtf(variance);

    // Crest Factor: Peak / RMS
    float crest_factor = (rms > 1e-5f) ? (peak_abs / rms) : 1.414f;

    // Kurtosis (4th standardized moment)
    float kurtosis = 3.0f;
    if (variance > 1e-7f) {
        float m4 = sum_m4 / n;
        kurtosis = m4 / (variance * variance);
    }

    // Skewness (3rd standardized moment)
    float skewness = 0.0f;
    if (std_dev > 1e-5f) {
        float m3 = sum_m3 / n;
        skewness = m3 / (std_dev * std_dev * std_dev);
    }

    feat.vibration_rms = rms;
    feat.vibration_peak = peak_abs;
    feat.vibration_p2p = p2p;
    feat.vibration_std = std_dev;
    feat.crest_factor = crest_factor;
    feat.kurtosis = kurtosis;
    feat.skewness = skewness;

    return feat;
}

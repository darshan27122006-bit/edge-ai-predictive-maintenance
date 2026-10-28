"""
Feature Extraction Module for Rotating Machinery Vibration and Temperature Signals.
Implements time-domain statistical and signal-processing features conforming to
ISO 10816 standards for condition monitoring and predictive maintenance.

Features computed:
1. RMS (Root Mean Square) - Overall vibration energy
2. Peak Amplitude - Maximum absolute peak
3. Peak-to-Peak Amplitude - Range from maximum to minimum peak
4. Standard Deviation - Dynamic vibration variance
5. Crest Factor - Peak / RMS (indicator of impulsive impact spikes)
6. Kurtosis - 4th standardized moment (critical indicator for early bearing defect impacts)
7. Skewness - 3rd standardized moment (asymmetry of vibration distribution)
8. Temperature - Thermal operational condition
"""

import math
from typing import Dict, List, Union
import numpy as np


FEATURE_NAMES = [
    "vibration_rms",
    "vibration_peak",
    "vibration_p2p",
    "vibration_std",
    "crest_factor",
    "kurtosis",
    "skewness",
    "temperature_c",
]


def calculate_rms(samples: Union[List[float], np.ndarray]) -> float:
    """Calculate Root Mean Square (RMS) of a signal window."""
    arr = np.asarray(samples, dtype=np.float64)
    if len(arr) == 0:
        return 0.0
    return float(np.sqrt(np.mean(arr ** 2)))


def calculate_peak(samples: Union[List[float], np.ndarray]) -> float:
    """Calculate maximum absolute amplitude."""
    arr = np.asarray(samples, dtype=np.float64)
    if len(arr) == 0:
        return 0.0
    return float(np.max(np.abs(arr)))


def calculate_peak_to_peak(samples: Union[List[float], np.ndarray]) -> float:
    """Calculate peak-to-peak amplitude difference."""
    arr = np.asarray(samples, dtype=np.float64)
    if len(arr) == 0:
        return 0.0
    return float(np.max(arr) - np.min(arr))


def calculate_std(samples: Union[List[float], np.ndarray]) -> float:
    """Calculate standard deviation of vibration samples."""
    arr = np.asarray(samples, dtype=np.float64)
    if len(arr) < 2:
        return 0.0
    return float(np.std(arr, ddof=1))


def calculate_crest_factor(samples: Union[List[float], np.ndarray]) -> float:
    """
    Calculate Crest Factor (Peak / RMS).
    Healthy machinery typically exhibits CF between 1.5 and 2.5.
    Bearing impacts increase CF significantly (often 4.0 - 9.0+).
    """
    rms = calculate_rms(samples)
    if rms < 1e-6:
        return 1.0
    peak = calculate_peak(samples)
    return float(peak / rms)


def calculate_kurtosis(samples: Union[List[float], np.ndarray]) -> float:
    """
    Calculate Kurtosis (4th standardized central moment).
    Normal Gaussian vibration has kurtosis ~ 3.0.
    Impulsive bearing faults introduce sharp transients that drive kurtosis to 5.0 - 15.0+.
    """
    arr = np.asarray(samples, dtype=np.float64)
    n = len(arr)
    if n < 4:
        return 3.0
    mean = np.mean(arr)
    diff = arr - mean
    var = np.mean(diff ** 2)
    if var < 1e-8:
        return 3.0
    m4 = np.mean(diff ** 4)
    return float(m4 / (var ** 2))


def calculate_skewness(samples: Union[List[float], np.ndarray]) -> float:
    """Calculate Skewness (3rd standardized central moment)."""
    arr = np.asarray(samples, dtype=np.float64)
    n = len(arr)
    if n < 3:
        return 0.0
    mean = np.mean(arr)
    diff = arr - mean
    var = np.mean(diff ** 2)
    std = np.sqrt(var)
    if std < 1e-6:
        return 0.0
    m3 = np.mean(diff ** 3)
    return float(m3 / (std ** 3))


def extract_features(
    vibration_window: Union[List[float], np.ndarray],
    temperature_c: float
) -> Dict[str, float]:
    """
    Extract full feature set from a window of vibration samples and temperature.
    Returns a dictionary of named features.
    """
    arr = np.asarray(vibration_window, dtype=np.float64)
    
    # Detrend / remove DC bias if any
    if len(arr) > 0:
        detrended = arr - np.mean(arr)
    else:
        detrended = arr

    rms_val = calculate_rms(detrended)
    peak_val = calculate_peak(detrended)
    p2p_val = calculate_peak_to_peak(detrended)
    std_val = calculate_std(detrended)
    cf_val = calculate_crest_factor(detrended)
    kurt_val = calculate_kurtosis(detrended)
    skew_val = calculate_skewness(detrended)

    return {
        "vibration_rms": round(rms_val, 4),
        "vibration_peak": round(peak_val, 4),
        "vibration_p2p": round(p2p_val, 4),
        "vibration_std": round(std_val, 4),
        "crest_factor": round(cf_val, 4),
        "kurtosis": round(kurt_val, 4),
        "skewness": round(skew_val, 4),
        "temperature_c": round(float(temperature_c), 2),
    }


def features_to_vector(features: Dict[str, float]) -> List[float]:
    """Convert feature dictionary to ordered feature vector for ML model inference."""
    return [float(features[name]) for name in FEATURE_NAMES]

"""
Synthetic Benchmark Dataset Generator for Rotating Machinery Condition Monitoring.
Generates realistic vibration time-series and extracted feature vectors based on
physical mechanical dynamics and ISO 10816 vibration severity standards.

Classes:
0: Normal Operation
1: Imbalance (Dominant 1X rotational harmonic)
2: Misalignment (Dominant 2X harmonic + elevated coupling friction temp)
3: Bearing Fault (Impulsive transients / ring-down bursts -> high crest factor & kurtosis)
4: Excessive Vibration (Broadband severe mechanical looseness / vibration > 5.0 m/s²)
5: Abnormal Temperature (Thermal overheating > 70°C, lubrication starvation)
"""

import json
import os
import numpy as np
import pandas as pd
from feature_extraction import extract_features, FEATURE_NAMES

LABEL_MAP = {
    0: "Normal Operation",
    1: "Imbalance",
    2: "Misalignment",
    3: "Bearing Fault",
    4: "Excessive Vibration",
    5: "Abnormal Temperature",
}

CLASS_SLUGS = {
    0: "normal",
    1: "imbalance",
    2: "misalignment",
    3: "bearing_fault",
    4: "excessive_vibration",
    5: "abnormal_temperature",
}


def generate_vibration_window(
    fault_type: int,
    sampling_rate: int = 100,
    n_samples: int = 128,
    f0: float = 30.0,  # 1800 RPM nominal fundamental frequency
) -> tuple[np.ndarray, float]:
    """
    Synthesize physical vibration time-domain window and operating temperature.
    Returns: (vibration_samples, temperature_c)
    """
    t = np.linspace(0, n_samples / sampling_rate, n_samples, endpoint=False)
    
    if fault_type == 0:
        # Normal Operation: Low baseline vibration, white noise, small residual 1X
        amp_1x = np.random.uniform(0.15, 0.40)
        noise = np.random.normal(0, 0.12, n_samples)
        vibration = amp_1x * np.sin(2 * np.pi * f0 * t + np.random.uniform(0, 2*np.pi)) + noise
        temp = np.random.normal(40.0, 2.5)

    elif fault_type == 1:
        # Imbalance: High 1X harmonic, moderate noise, sinusoidal profile
        amp_1x = np.random.uniform(2.8, 4.6)
        noise = np.random.normal(0, 0.20, n_samples)
        vibration = amp_1x * np.sin(2 * np.pi * f0 * t + np.random.uniform(0, 2*np.pi)) + noise
        temp = np.random.normal(46.0, 3.0)

    elif fault_type == 2:
        # Misalignment: 2X harmonic dominant, 1X present, elevated coupling temp
        amp_1x = np.random.uniform(1.2, 2.2)
        amp_2x = np.random.uniform(2.2, 4.0)
        noise = np.random.normal(0, 0.22, n_samples)
        vibration = (
            amp_1x * np.sin(2 * np.pi * f0 * t) +
            amp_2x * np.sin(4 * np.pi * f0 * t + np.pi / 4) +
            noise
        )
        temp = np.random.normal(58.0, 4.0)

    elif fault_type == 3:
        # Bearing Fault: Periodic sharp impact impulses with exponential ringdown
        # Ball Pass Frequency Outer race (BPFO) ~ 3.2 * f0
        bpfo = 3.2 * f0
        base = np.random.normal(0, 0.25, n_samples)
        impulse_train = np.zeros(n_samples)
        
        # Insert transient impacts
        impact_interval = int(sampling_rate / bpfo)
        if impact_interval < 2:
            impact_interval = 2
            
        for i in range(0, n_samples, impact_interval):
            offset = i + np.random.randint(-1, 2)
            if 0 <= offset < n_samples:
                # Ring-down damping wave
                length = min(16, n_samples - offset)
                t_decay = np.arange(length)
                damped_wave = np.random.choice([1, -1]) * np.random.uniform(4.5, 8.5) * np.exp(-t_decay / 3.0) * np.cos(2 * np.pi * 0.35 * t_decay)
                impulse_train[offset:offset+length] += damped_wave

        vibration = base + impulse_train
        temp = np.random.normal(52.0, 3.5)

    elif fault_type == 4:
        # Excessive Vibration: Broadband severe vibration > 5.0 m/s², looseness harmonics
        amp_1x = np.random.uniform(3.5, 6.0)
        amp_harmonics = np.random.uniform(1.5, 3.0)
        noise = np.random.normal(0, 1.2, n_samples)
        vibration = (
            amp_1x * np.sin(2 * np.pi * f0 * t) +
            amp_harmonics * np.sin(2 * np.pi * (f0 / 2) * t) +
            noise
        )
        temp = np.random.normal(62.0, 5.0)

    elif fault_type == 5:
        # Abnormal Temperature: Nominal/low vibration, but overheating > 70°C
        amp_1x = np.random.uniform(0.3, 0.9)
        noise = np.random.normal(0, 0.18, n_samples)
        vibration = amp_1x * np.sin(2 * np.pi * f0 * t) + noise
        temp = np.random.uniform(74.0, 96.0)

    else:
        raise ValueError(f"Unknown fault type: {fault_type}")

    return vibration, temp


def generate_dataset(
    samples_per_class: int = 350,
    output_dir: str = "ml/datasets",
    random_seed: int = 42,
):
    """Generate train, validation, and test datasets with stratified distribution."""
    np.random.seed(random_seed)
    os.makedirs(output_dir, exist_ok=True)

    records = []
    
    for fault_class, class_name in LABEL_MAP.items():
        for i in range(samples_per_class):
            vib, temp = generate_vibration_window(fault_class)
            feats = extract_features(vib, temp)
            row = {
                **feats,
                "label": fault_class,
                "class_name": class_name,
                "class_slug": CLASS_SLUGS[fault_class],
            }
            records.append(row)

    df = pd.DataFrame(records)
    
    # Shuffle
    df = df.sample(frac=1.0, random_state=random_seed).reset_index(drop=True)

    # Train / Val / Test split (70% / 15% / 15%)
    n_total = len(df)
    n_train = int(0.70 * n_total)
    n_val = int(0.15 * n_total)

    train_df = df.iloc[:n_train].copy()
    val_df = df.iloc[n_train:n_train + n_val].copy()
    test_df = df.iloc[n_train + n_val:].copy()

    train_path = os.path.join(output_dir, "train.csv")
    val_path = os.path.join(output_dir, "val.csv")
    test_path = os.path.join(output_dir, "test.csv")
    all_path = os.path.join(output_dir, "machinery_dataset_full.csv")

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)
    df.to_csv(all_path, index=False)

    summary = {
        "total_samples": n_total,
        "train_samples": len(train_df),
        "val_samples": len(val_df),
        "test_samples": len(test_df),
        "samples_per_class": samples_per_class,
        "features": FEATURE_NAMES,
        "classes": LABEL_MAP,
        "class_slugs": CLASS_SLUGS,
        "sampling_rate_hz": 100,
        "window_size": 128,
        "standard_reference": "ISO 10816-3 Mechanical Vibration Evaluation",
    }

    with open(os.path.join(output_dir, "dataset_summary.json"), "w") as f:
        json.dump(summary, f, indent=2)

    print(f"Dataset generated successfully in {output_dir}:")
    print(f" - Total samples: {n_total} across {len(LABEL_MAP)} classes")
    print(f" - Train: {len(train_df)} | Val: {len(val_df)} | Test: {len(test_df)}")


if __name__ == "__main__":
    generate_dataset()

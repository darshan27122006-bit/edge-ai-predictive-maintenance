"""
Backend Machine Learning Inference and Evaluation Service.
Loads trained models (RandomForest and MLP NeuralNet) and handles:
1. Server-side model inference
2. Confidence score extraction
3. Severity mapping
4. Model evaluation metadata retrieval
"""

import os
import json
import logging
from typing import Dict, Any, Optional
import numpy as np
import joblib

logger = logging.getLogger(__name__)

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

CLASS_SLUGS = [
    "normal",
    "imbalance",
    "misalignment",
    "bearing_fault",
    "excessive_vibration",
    "abnormal_temperature",
]

CLASS_NAMES = [
    "Normal Operation",
    "Possible Imbalance",
    "Possible Misalignment",
    "Possible Bearing Fault",
    "Excessive Vibration",
    "Abnormal Temperature",
]


class MLService:
    def __init__(self, models_dir: str = "ml/models"):
        self.models_dir = models_dir
        self.rf_model = None
        self.mlp_model = None
        self.scaler = None
        self.evaluation_data = None
        self.load_models()

    def load_models(self):
        """Safely load trained model artifacts and evaluation metrics."""
        rf_path = os.path.join(self.models_dir, "random_forest.joblib")
        mlp_path = os.path.join(self.models_dir, "mlp_neuralnet.joblib")
        scaler_path = os.path.join(self.models_dir, "scaler.joblib")
        metrics_path = os.path.join(self.models_dir, "evaluation_metrics.json")

        if os.path.exists(rf_path):
            try:
                self.rf_model = joblib.load(rf_path)
                logger.info("Loaded RandomForest model successfully.")
            except Exception as e:
                logger.error(f"Error loading RandomForest model: {e}")

        if os.path.exists(mlp_path):
            try:
                self.mlp_model = joblib.load(mlp_path)
                logger.info("Loaded MLP NeuralNet model successfully.")
            except Exception as e:
                logger.error(f"Error loading MLP NeuralNet model: {e}")

        if os.path.exists(scaler_path):
            try:
                self.scaler = joblib.load(scaler_path)
                logger.info("Loaded feature scaler successfully.")
            except Exception as e:
                logger.error(f"Error loading scaler: {e}")

        if os.path.exists(metrics_path):
            try:
                with open(metrics_path, "r") as f:
                    self.evaluation_data = json.load(f)
                logger.info("Loaded evaluation metrics successfully.")
            except Exception as e:
                logger.error(f"Error loading evaluation metrics: {e}")

    def is_model_loaded(self) -> bool:
        return self.rf_model is not None or self.mlp_model is not None

    def predict(self, feature_dict: Dict[str, float], use_mlp: bool = False) -> Dict[str, Any]:
        """
        Run server-side inference on extracted features.
        Returns:
            dict containing prediction, class_name, confidence, is_anomaly, severity, features_used
        """
        # Ensure default values for any optional statistical features
        rms = float(feature_dict.get("vibration_rms") or 0.0)
        peak = float(feature_dict.get("vibration_peak") or 0.0)
        p2p_val = feature_dict.get("vibration_p2p")
        p2p = float(p2p_val if p2p_val is not None else (peak * 2.0 if peak > 0 else 0.0))
        std_val = feature_dict.get("vibration_std")
        std = float(std_val if std_val is not None else (rms * 0.95))
        cf_val = feature_dict.get("crest_factor")
        crest_factor = float(cf_val if cf_val is not None else ((peak / rms) if rms > 1e-4 else 1.414))
        kurt_val = feature_dict.get("kurtosis")
        kurtosis = float(kurt_val if kurt_val is not None else 3.0)
        skew_val = feature_dict.get("skewness")
        skewness = float(skew_val if skew_val is not None else 0.0)
        temp = float(feature_dict.get("temperature_c") or 40.0)

        feat_vector = [
            rms,
            peak,
            p2p,
            std,
            crest_factor,
            kurtosis,
            skewness,
            temp,
        ]

        # If model is loaded, execute prediction
        if self.is_model_loaded():
            model = self.mlp_model if (use_mlp and self.mlp_model) else (self.rf_model or self.mlp_model)
            X = np.array([feat_vector], dtype=np.float64)

            if model == self.mlp_model and self.scaler:
                X = self.scaler.transform(X)

            class_idx = int(model.predict(X)[0])
            
            # Predict probability if available
            confidence = 0.95
            if hasattr(model, "predict_proba"):
                try:
                    probs = model.predict_proba(X)[0]
                    confidence = float(np.max(probs))
                except Exception:
                    pass

            slug = CLASS_SLUGS[class_idx] if 0 <= class_idx < len(CLASS_SLUGS) else "unknown"
            name = CLASS_NAMES[class_idx] if 0 <= class_idx < len(CLASS_NAMES) else "Unknown Fault"
            is_anomaly = class_idx != 0
        else:
            # Explicit rule-based fallback if model is uninitialized
            logger.warning("ML model not loaded; applying physical threshold rule fallback.")
            if temp > 75.0:
                slug = "abnormal_temperature"
                name = "Abnormal Temperature"
                class_idx = 5
                is_anomaly = True
                confidence = 0.85
            elif rms > 4.5:
                slug = "excessive_vibration"
                name = "Excessive Vibration"
                class_idx = 4
                is_anomaly = True
                confidence = 0.88
            elif kurtosis > 4.5 or crest_factor > 3.8:
                slug = "bearing_fault"
                name = "Possible Bearing Fault"
                class_idx = 3
                is_anomaly = True
                confidence = 0.80
            elif rms > 2.8:
                slug = "imbalance"
                name = "Possible Imbalance"
                class_idx = 1
                is_anomaly = True
                confidence = 0.75
            else:
                slug = "normal"
                name = "Normal Operation"
                class_idx = 0
                is_anomaly = False
                confidence = 0.95

        # Determine severity
        if not is_anomaly:
            severity = "normal"
        elif slug in ("excessive_vibration", "abnormal_temperature") or rms > 4.5 or temp > 75.0:
            severity = "critical"
        else:
            severity = "warning"

        return {
            "prediction": slug,
            "class_name": name,
            "class_id": class_idx,
            "confidence": round(confidence, 4),
            "is_anomaly": is_anomaly,
            "severity": severity,
            "inference_location": "backend",
            "model_version": self.evaluation_data.get("version", "1.2.0") if self.evaluation_data else "1.2.0",
            "features_used": {name: val for name, val in zip(FEATURE_NAMES, feat_vector)}
        }

    def get_model_info(self) -> Dict[str, Any]:
        """Return model metadata, feature names, classes, and target board profile."""
        if self.evaluation_data:
            return {
                "model_name": self.evaluation_data.get("model_name", "Edge-AI Machinery Fault Classifier"),
                "version": self.evaluation_data.get("version", "1.2.0"),
                "architecture": self.evaluation_data.get("architecture", "Random Forest & MLP TinyML"),
                "primary_model": self.evaluation_data.get("primary_model", "RandomForest"),
                "feature_count": len(FEATURE_NAMES),
                "features": FEATURE_NAMES,
                "classes": CLASS_NAMES,
                "class_slugs": CLASS_SLUGS,
                "target_hardware": self.evaluation_data.get("esp32_hardware_profile", {}),
                "is_model_loaded": self.is_model_loaded(),
            }
        return {
            "model_name": "Edge-AI Machinery Fault Classifier",
            "version": "1.2.0",
            "architecture": "Random Forest & Compact MLP",
            "feature_count": len(FEATURE_NAMES),
            "features": FEATURE_NAMES,
            "classes": CLASS_NAMES,
            "class_slugs": CLASS_SLUGS,
            "is_model_loaded": self.is_model_loaded(),
        }

    def get_evaluation_metrics(self) -> Dict[str, Any]:
        """Return genuine held-out test evaluation metrics and confusion matrices."""
        if self.evaluation_data and "evaluation" in self.evaluation_data:
            return self.evaluation_data
        
        # If not evaluated yet, honestly report status
        return {
            "status": "not_evaluated",
            "message": "Evaluation data unavailable. Run `python ml/train_model.py` to generate.",
            "classes": CLASS_NAMES,
            "class_slugs": CLASS_SLUGS,
        }


ml_service = MLService()

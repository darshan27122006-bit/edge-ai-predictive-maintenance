"""
Machine Learning Model Inspection, Evaluation, and Prediction Routes.
Provides model metadata, genuine test set metrics, confusion matrix, and comparative server-side inference.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status

from app.schemas import PredictRequest, PredictResponse
from app.ml_service import ml_service

router = APIRouter(prefix="/model", tags=["Machine Learning"])


@router.get("/info", response_model=Dict[str, Any])
def get_model_info():
    """Retrieve metadata about the active ML models, features, and target MCU profile."""
    return ml_service.get_model_info()


@router.get("/evaluation", response_model=Dict[str, Any])
def get_model_evaluation():
    """
    Retrieve academic evaluation metrics computed on held-out test datasets.
    Includes Accuracy, Precision, Recall, F1-scores, Confusion Matrix, and measured inference latencies.
    """
    return ml_service.get_evaluation_metrics()


@router.post("/predict", response_model=PredictResponse)
def run_model_prediction(req: PredictRequest):
    """
    Run server-side fault classification for comparative analysis against ESP32 on-device inference.
    """
    features = {
        "vibration_rms": req.vibration_rms,
        "vibration_peak": req.vibration_peak,
        "vibration_p2p": req.vibration_p2p,
        "vibration_std": req.vibration_std,
        "crest_factor": req.crest_factor,
        "kurtosis": req.kurtosis,
        "skewness": req.skewness,
        "temperature_c": req.temperature_c,
    }

    result = ml_service.predict(features)
    return PredictResponse(**result)

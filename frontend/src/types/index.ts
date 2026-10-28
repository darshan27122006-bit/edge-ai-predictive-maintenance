/**
 * TypeScript Data Models for Edge-AI Predictive Maintenance Dashboard.
 */

export type DataSource = 'hardware' | 'simulation' | 'synthetic_test';
export type MachineStatus = 'normal' | 'warning' | 'critical' | 'offline';
export type InferenceLocation = 'device' | 'backend' | 'rule_threshold' | 'simulated';

export interface Machine {
  id: string;
  name: string;
  location: string;
  machine_type: string;
  rated_speed_rpm: number;
  vib_warning_threshold: number;
  vib_critical_threshold: number;
  temp_warning_threshold: number;
  temp_critical_threshold: number;
  status: MachineStatus;
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
}

export interface Telemetry {
  id: number;
  machine_id: string;
  sequence: number;
  firmware_version: string;
  timestamp: string;
  data_source: DataSource;
  vibration_rms: number;
  vibration_peak: number;
  vibration_p2p: number;
  vibration_std: number;
  crest_factor: number;
  kurtosis: number;
  skewness: number;
  accel_x?: number;
  accel_y?: number;
  accel_z?: number;
  temperature_c: number;
  prediction: string;
  confidence: number;
  inference_location: InferenceLocation;
  model_version?: string;
  is_anomaly: boolean;
}

export interface Alert {
  id: number;
  machine_id: string;
  timestamp: string;
  severity: 'warning' | 'critical';
  triggering_metric: string;
  triggering_value: number;
  threshold_value: number;
  message: string;
  is_acknowledged: boolean;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
}

export interface PerClassMetric {
  class_id: number;
  class_name: string;
  class_slug: string;
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface ModelEvaluationDetail {
  accuracy: number;
  precision_macro: number;
  recall_macro: number;
  f1_macro: number;
  f1_weighted: number;
  confusion_matrix: number[][];
  classes: string[];
  class_slugs: string[];
  per_class_metrics: PerClassMetric[];
  latency: {
    avg_ms: number;
    p95_ms: number;
    samples_tested: number;
    hardware_environment: string;
  };
}

export interface ModelInfo {
  model_name: string;
  version: string;
  architecture: string;
  primary_model?: string;
  feature_count: number;
  features: string[];
  classes: string[];
  class_slugs: string[];
  target_hardware?: {
    target_mcu: string;
    ram_allocated_kb: number;
    flash_footprint_kb: number;
    estimated_edge_latency_ms: number;
    inference_mode: string;
  };
  is_model_loaded: boolean;
}

export interface ModelEvaluationResponse {
  status?: string;
  message?: string;
  model_name?: string;
  version?: string;
  primary_model?: string;
  evaluation?: {
    RandomForest?: ModelEvaluationDetail;
    MLP_NeuralNet?: ModelEvaluationDetail;
  };
  esp32_hardware_profile?: {
    target_mcu: string;
    ram_allocated_kb: number;
    flash_footprint_kb: number;
    estimated_edge_latency_ms: number;
    inference_mode: string;
  };
}

export interface AnalyticsSummary {
  machine_id: string;
  uptime_percentage: number;
  total_records: number;
  total_alerts: number;
  warning_alerts: number;
  critical_alerts: number;
  latest_rms: number;
  latest_peak: number;
  latest_temp: number;
  latest_status: string;
  fault_distribution: Record<string, number>;
  daily_trend: Array<{
    timestamp: string;
    vibration_rms: number;
    temperature_c: number;
    kurtosis: number;
    is_anomaly: boolean;
  }>;
}

export interface SimulationStatus {
  is_running: boolean;
  active_scenario: string;
  interval_seconds: number;
  target_machines: string[];
  records_generated: number;
  last_tick: string | null;
}

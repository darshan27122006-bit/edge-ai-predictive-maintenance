/**
 * REST API Client Service.
 * Connects to the FastAPI backend with error handling and fallback defaults.
 */

import type {
  Machine,
  Telemetry,
  Alert,
  ModelInfo,
  ModelEvaluationResponse,
  AnalyticsSummary,
  SimulationStatus,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP Error ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`API Request failed [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Health
  getHealth: () => request<{ status: string; service: string; database: string; models_loaded: boolean }>('/health'),

  // Machines
  getMachines: () => request<Machine[]>('/machines'),
  getMachine: (id: string) => request<Machine>(`/machines/${id}`),
  createMachine: (data: Partial<Machine>) =>
    request<Machine>('/machines', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMachine: (id: string, data: Partial<Machine>) =>
    request<Machine>(`/machines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteMachine: (id: string) =>
    request<{ status: string; message: string }>(`/machines/${id}`, {
      method: 'DELETE',
    }),

  // Telemetry
  getLatestTelemetry: (machineId: string) =>
    request<Telemetry>(`/telemetry/latest/${machineId}`),
  getTelemetryHistory: (machineId: string, limit = 50, offset = 0) =>
    request<Telemetry[]>(`/telemetry/history/${machineId}?limit=${limit}&offset=${offset}`),

  // Alerts
  getAlerts: (params?: { machine_id?: string; severity?: string; unacknowledged_only?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.machine_id) query.append('machine_id', params.machine_id);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.unacknowledged_only) query.append('unacknowledged_only', 'true');
    return request<Alert[]>(`/alerts?${query.toString()}`);
  },
  acknowledgeAlert: (alertId: number, acknowledgedBy = 'Operator') =>
    request<Alert>(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
    }),

  // Analytics
  getAnalytics: (machineId: string) =>
    request<AnalyticsSummary>(`/analytics/${machineId}`),

  // Model & Diagnostics
  getModelInfo: () => request<ModelInfo>('/model/info'),
  getModelEvaluation: () => request<ModelEvaluationResponse>('/model/evaluation'),
  predictCondition: (features: {
    vibration_rms: number;
    vibration_peak: number;
    temperature_c: number;
    crest_factor?: number;
    kurtosis?: number;
  }) =>
    request<{
      prediction: string;
      class_name: string;
      confidence: number;
      is_anomaly: boolean;
      severity: string;
      inference_location: string;
    }>('/model/predict', {
      method: 'POST',
      body: JSON.stringify(features),
    }),

  // Simulation Controls
  getSimulationStatus: () => request<SimulationStatus>('/simulation/status'),
  startSimulation: (scenario = 'normal', interval = 1.5) =>
    request<SimulationStatus>(`/simulation/start?scenario=${scenario}&interval_seconds=${interval}`, {
      method: 'POST',
    }),
  stopSimulation: () => request<SimulationStatus>('/simulation/stop', { method: 'POST' }),
  controlSimulation: (action: string, scenario?: string) =>
    request<SimulationStatus>('/simulation/control', {
      method: 'POST',
      body: JSON.stringify({ action, scenario }),
    }),

  // CSV Export URL
  getExportUrl: (machineId?: string) => {
    return `${API_BASE}/export/telemetry.csv${machineId ? `?machine_id=${machineId}` : ''}`;
  },
};

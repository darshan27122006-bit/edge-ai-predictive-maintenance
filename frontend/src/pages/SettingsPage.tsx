import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  Square,
  FlaskConical,
  Database,
  Cpu,
  Key,
  Wifi,
  Info,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import type { SimulationStatus, ModelInfo } from '../types';
import { api } from '../services/api';

interface SettingsPageProps {
  simStatus: SimulationStatus | null;
  onRefreshSimStatus: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  simStatus,
  onRefreshSimStatus,
}) => {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [selectedScenario, setSelectedScenario] = useState('normal');
  const [isUpdating, setIsUpdating] = useState(false);
  const [backendHealth, setBackendHealth] = useState<any>(null);

  useEffect(() => {
    loadModelInfo();
    checkHealth();
  }, []);

  const loadModelInfo = async () => {
    try {
      const info = await api.getModelInfo();
      setModelInfo(info);
    } catch (e) {
      console.error('Failed to load model info:', e);
    }
  };

  const checkHealth = async () => {
    try {
      const h = await api.getHealth();
      setBackendHealth(h);
    } catch (e) {
      setBackendHealth({ status: 'offline' });
    }
  };

  const handleToggleSimulation = async () => {
    try {
      setIsUpdating(true);
      if (simStatus?.is_running) {
        await api.stopSimulation();
      } else {
        await api.startSimulation(selectedScenario);
      }
      await onRefreshSimStatus();
    } catch (e: any) {
      alert(`Simulation control failed: ${e.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleScenarioChange = async (scenario: string) => {
    setSelectedScenario(scenario);
    try {
      setIsUpdating(true);
      await api.controlSimulation('set_scenario', scenario);
      await onRefreshSimStatus();
    } catch (e: any) {
      alert(`Failed to set scenario: ${e.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            SYSTEM SETTINGS & SIMULATION CONTROLS
          </h2>
          <p className="text-xs text-slate-400">
            Hardware network provisioning, demonstration scenario injection, and runtime configurations
          </p>
        </div>
      </div>

      {/* Simulation Engine Control Card */}
      <div className="glass-panel p-6 rounded-2xl border border-purple-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-950/70 border border-purple-500/40 text-purple-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono text-white">
                  DEMONSTRATION SIMULATION ENGINE
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${
                    simStatus?.is_running
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {simStatus?.is_running ? 'Active Running' : 'Stopped'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate physically grounded vibration waveforms and inject fault conditions without physical hardware
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleSimulation}
            disabled={isUpdating}
            className={`px-5 py-2 rounded-lg font-mono text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 ${
              simStatus?.is_running
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
            }`}
          >
            {simStatus?.is_running ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                Stop Simulation
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                Start Simulation
              </>
            )}
          </button>
        </div>

        {/* Fault Injection Scenarios */}
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
            Inject Active Machine Condition Scenario
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs font-mono">
            {[
              { id: 'normal', label: 'Normal Operation', desc: 'Baseline vibration < 1.0 m/s²' },
              { id: 'imbalance', label: 'Rotor Imbalance', desc: '1X sinusoidal vibration' },
              { id: 'misalignment', label: 'Shaft Misalignment', desc: '2X harmonic + coupling temp' },
              { id: 'bearing_fault', label: 'Bearing Fault', desc: 'Impulsive transients (Kurtosis > 6)' },
              { id: 'excessive_vibration', label: 'Excessive Vibration', desc: 'Severe broadband > 5.0 m/s²' },
              { id: 'abnormal_temperature', label: 'Thermal Runaway', desc: 'Overheating > 75°C' },
              { id: 'sensor_disconnect', label: 'Sensor Dropout', desc: 'Simulates dropped packets' },
            ].map((sc) => {
              const isSelected = (simStatus?.active_scenario || selectedScenario) === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleScenarioChange(sc.id)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-purple-950/70 border-purple-500 text-purple-200 shadow-md shadow-purple-500/10'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold block text-white">{sc.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{sc.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Backend & Hardware Provisioning */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend Connection Card */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              BACKEND SERVICE STATUS
            </h3>
            <button
              onClick={checkHealth}
              className="p-1 rounded text-slate-400 hover:text-white"
              title="Refresh Health"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-300">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-500">Service:</span>
              <span>FastAPI REST & WebSocket Hub</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-500">Health State:</span>
              <span className="text-emerald-400 font-bold uppercase">
                {backendHealth?.status || 'HEALTHY'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-500">Database Engine:</span>
              <span>SQLite (predictive_maintenance.db)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-500">API Documentation:</span>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline"
              >
                Open Swagger UI (/docs)
              </a>
            </div>
          </div>
        </div>

        {/* ESP32 Hardware Provisioning Card */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            PHYSICAL ESP32 PROVISIONING
          </h3>

          <div className="space-y-2 text-xs font-mono text-slate-300">
            <p className="text-slate-400 leading-relaxed text-[11px]">
              To connect physical hardware, flash the compilable firmware located in{' '}
              <code className="text-cyan-400">firmware/</code> with your Wi-Fi credentials in{' '}
              <code className="text-slate-200">include/config.h</code>:
            </p>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
              <div>
                <span className="text-slate-500">Backend IP: </span>
                <span className="text-white">Your PC's LAN IP (Port 8000)</span>
              </div>
              <div>
                <span className="text-slate-500">Device Auth Token: </span>
                <span className="text-cyan-400">esp32-secret-iot-token-2026</span>
              </div>
              <div>
                <span className="text-slate-500">Sampling Config: </span>
                <span className="text-slate-300">100 Hz @ 128 window samples</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

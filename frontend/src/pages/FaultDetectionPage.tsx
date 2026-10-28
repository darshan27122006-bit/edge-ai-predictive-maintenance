import React, { useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  Wrench,
  CheckCircle2,
  Activity,
  Flame,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { Machine, Telemetry } from '../types';
import { api } from '../services/api';
import { DataSourceBadge } from '../components/DataSourceBadge';

interface FaultDetectionPageProps {
  machine: Machine | null;
  latestTelemetry: Telemetry | null;
}

export const FaultDetectionPage: React.FC<FaultDetectionPageProps> = ({
  machine,
  latestTelemetry,
}) => {
  // Playground state for testing model predictions interactively
  const [testRms, setTestRms] = useState<number>(3.2);
  const [testPeak, setTestPeak] = useState<number>(4.8);
  const [testTemp, setTestTemp] = useState<number>(45.0);
  const [testKurtosis, setTestKurtosis] = useState<number>(3.1);
  const [testCrestFactor, setTestCrestFactor] = useState<number>(1.5);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const faultCatalog = [
    {
      slug: 'normal',
      name: 'Normal Operation',
      icon: CheckCircle2,
      color: 'emerald',
      severity: 'Normal',
      symptoms: 'Vibration RMS < 1.0 m/s², Kurtosis ~ 3.0, Temp < 50°C',
      physics: 'Machinery operating within ISO 10816 Class II good condition limits with nominal baseline forces.',
      actions: 'Maintain standard routine lubrication and planned vibration check routes.',
    },
    {
      slug: 'imbalance',
      name: 'Rotor Imbalance (1X RPM)',
      icon: Activity,
      color: 'amber',
      severity: 'Warning',
      symptoms: 'High sinusoidal vibration RMS (2.5 - 4.5 m/s²), 1X rotational speed harmonic peak.',
      physics: 'Center of mass offset from axis of rotation due to dirt buildup, loss of balance weights, or erosion.',
      actions: 'Clean rotor/impeller surfaces and perform dynamic two-plane balance balancing.',
    },
    {
      slug: 'misalignment',
      name: 'Shaft Misalignment (2X RPM)',
      icon: Layers,
      color: 'amber',
      severity: 'Warning',
      symptoms: 'Dominant 2X rotational harmonic, elevated coupling temperature (55 - 68°C).',
      physics: 'Angular or parallel offset between motor and driven shaft putting flexural bending stress on couplings.',
      actions: 'Conduct precision dial-indicator or laser shaft alignment across coupling faces.',
    },
    {
      slug: 'bearing_fault',
      name: 'Bearing Fault (Impulsive Transients)',
      icon: AlertTriangle,
      color: 'rose',
      severity: 'Warning to Critical',
      symptoms: 'Extremely high Kurtosis (> 5.0 - 12.0) and Crest Factor (> 4.0), repetitive micro-impacts.',
      physics: 'Spalling or flaking on ball pass outer race (BPFO) or inner race (BPFI) exciting high-frequency ringing.',
      actions: 'Check bearing lubrication immediately; schedule bearing replacement during nearest scheduled stop.',
    },
    {
      slug: 'excessive_vibration',
      name: 'Excessive Vibration Severity',
      icon: AlertTriangle,
      color: 'rose',
      severity: 'Critical Alarm',
      symptoms: 'Broadband vibration RMS > 4.5 m/s², mechanical looseness harmonics.',
      physics: 'Severe structural looseness, broken foundation bolts, or catastrophic mechanical degradation.',
      actions: 'Immediate controlled shutdown; inspect foundation hold-down bolts and coupling integrity.',
    },
    {
      slug: 'abnormal_temperature',
      name: 'Abnormal Temperature Warning',
      icon: Flame,
      color: 'rose',
      severity: 'Critical Alarm',
      symptoms: 'Surface temperature > 75°C with nominal or baseline vibration levels.',
      physics: 'Thermal runaway caused by bearing grease drying/starvation or motor cooling fan failure.',
      actions: 'Inspect cooling fan shroud, verify ventilation airflow, and replenish recommended synthetic grease.',
    },
  ];

  const handleTestPrediction = async () => {
    try {
      setIsLoading(true);
      const res = await api.predictCondition({
        vibration_rms: Number(testRms),
        vibration_peak: Number(testPeak),
        temperature_c: Number(testTemp),
        crest_factor: Number(testCrestFactor),
        kurtosis: Number(testKurtosis),
      });
      setPredictionResult(res);
    } catch (e: any) {
      alert(`Prediction failed: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            EDGE-AI FAULT DETECTION & DIAGNOSIS MATRIX
          </h2>
          <p className="text-xs text-slate-400">
            Multi-class anomaly recognition, physical root-cause analysis, and maintenance prescriptions
          </p>
        </div>
      </div>

      {/* Live AI State Card */}
      {latestTelemetry && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4" />
                ACTIVE EDGE DIAGNOSIS
              </span>
              <DataSourceBadge source={latestTelemetry.data_source} size="sm" />
            </div>

            <h3 className="text-2xl font-bold font-mono text-white tracking-wide">
              {latestTelemetry.prediction.replace('_', ' ').toUpperCase()}
            </h3>

            <p className="text-xs font-mono text-slate-400">
              Inference Source:{' '}
              <span className="text-cyan-300 font-semibold uppercase">
                {latestTelemetry.inference_location}
              </span>{' '}
              | Model Version:{' '}
              <span className="text-slate-200">
                {latestTelemetry.model_version || '1.2.0-tinyml'}
              </span>{' '}
              | Timestamp:{' '}
              <span className="text-slate-300">
                {new Date(latestTelemetry.timestamp).toLocaleTimeString()}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono shrink-0">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">CONFIDENCE</span>
              <span className="text-cyan-400 text-lg font-bold">
                {(latestTelemetry.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">RMS VIBRATION</span>
              <span className="text-white text-lg font-bold">
                {latestTelemetry.vibration_rms.toFixed(2)} m/s²
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">KURTOSIS</span>
              <span className="text-purple-400 text-lg font-bold">
                {latestTelemetry.kurtosis.toFixed(2)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">TEMPERATURE</span>
              <span className="text-amber-400 text-lg font-bold">
                {latestTelemetry.temperature_c.toFixed(1)}°C
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Server-Side Comparative Prediction Playground */}
      <div className="glass-panel p-5 md:p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              INTERACTIVE FAULT CLASSIFICATION PLAYGROUND
            </h3>
            <p className="text-xs text-slate-400">
              Feed custom vibration and temperature features to the trained neural/forest model to verify classification boundaries
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs font-mono">
          <div>
            <label className="block text-slate-400 mb-1">Vibration RMS (m/s²)</label>
            <input
              type="number"
              step="0.1"
              value={testRms}
              onChange={(e) => setTestRms(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Vibration Peak (m/s²)</label>
            <input
              type="number"
              step="0.1"
              value={testPeak}
              onChange={(e) => setTestPeak(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Temperature (°C)</label>
            <input
              type="number"
              step="0.5"
              value={testTemp}
              onChange={(e) => setTestTemp(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Kurtosis (Moment 4)</label>
            <input
              type="number"
              step="0.1"
              value={testKurtosis}
              onChange={(e) => setTestKurtosis(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Crest Factor (Peak/RMS)</label>
            <input
              type="number"
              step="0.1"
              value={testCrestFactor}
              onChange={(e) => setTestCrestFactor(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <button
            onClick={handleTestPrediction}
            disabled={isLoading}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Running Inference...' : 'Evaluate Custom Feature Vector'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {predictionResult && (
            <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/40 text-xs font-mono flex items-center gap-4">
              <div>
                <span className="text-slate-500 block text-[10px]">PREDICTED CLASS</span>
                <span className="text-cyan-400 font-bold text-sm">
                  {predictionResult.class_name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CONFIDENCE</span>
                <span className="text-white font-bold">
                  {(predictionResult.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SEVERITY</span>
                <span
                  className={`font-bold uppercase ${
                    predictionResult.severity === 'critical'
                      ? 'text-rose-400'
                      : predictionResult.severity === 'warning'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {predictionResult.severity}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Machinery Fault Physics & Maintenance Action Matrix */}
      <div>
        <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-300 mb-4">
          DIAGNOSTIC KNOWLEDGE BASE & ISO 10816 FAULT CATALOG
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faultCatalog.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.slug}
                className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg ${
                        item.color === 'emerald'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : item.color === 'amber'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold font-mono text-white">{item.name}</h4>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      item.color === 'emerald'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : item.color === 'amber'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-rose-950 text-rose-300 border-rose-800'
                    }`}
                  >
                    {item.severity}
                  </span>
                </div>

                <div className="text-xs font-mono text-slate-400 space-y-1.5">
                  <p>
                    <span className="text-slate-300 font-semibold">Signal Symptoms: </span>
                    {item.symptoms}
                  </p>
                  <p>
                    <span className="text-slate-300 font-semibold">Physical Cause: </span>
                    {item.physics}
                  </p>
                  <p className="pt-1 flex items-start gap-1.5 text-cyan-300">
                    <Wrench className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Maintenance Action: </strong>
                      {item.actions}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

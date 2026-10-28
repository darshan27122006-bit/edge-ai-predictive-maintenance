import React, { useState } from 'react';
import {
  Activity,
  Thermometer,
  Gauge,
  Cpu,
  Brain,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { Machine, Telemetry } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { DataSourceBadge } from '../components/DataSourceBadge';

interface LiveMonitoringPageProps {
  machine: Machine | null;
  latestTelemetry: Telemetry | null;
  telemetryStream: Telemetry[];
}

export const LiveMonitoringPage: React.FC<LiveMonitoringPageProps> = ({
  machine,
  latestTelemetry,
  telemetryStream,
}) => {
  const [chartWindow, setChartWindow] = useState<number>(30); // 30 points window

  if (!machine) {
    return (
      <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-900/40">
        <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-mono text-slate-300">No machine selected</h3>
        <p className="text-xs text-slate-500 mt-1">Please select an asset from the header dropdown.</p>
      </div>
    );
  }

  // Filter telemetry for this specific machine
  const machineStream = telemetryStream
    .filter((t) => t.machine_id === machine.id)
    .slice(-chartWindow);

  // Prepare chart data format
  const chartData = machineStream.map((t) => ({
    time: new Date(t.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    rms: t.vibration_rms,
    peak: t.vibration_peak,
    temp: t.temperature_c,
    accel_x: t.accel_x || 0,
    accel_y: t.accel_y || 0,
    accel_z: t.accel_z || 0,
    kurtosis: t.kurtosis,
    crest_factor: t.crest_factor,
  }));

  const rms = latestTelemetry?.vibration_rms ?? 0.0;
  const peak = latestTelemetry?.vibration_peak ?? 0.0;
  const temp = latestTelemetry?.temperature_c ?? 0.0;
  const crestFactor = latestTelemetry?.crest_factor ?? 1.414;
  const kurtosis = latestTelemetry?.kurtosis ?? 3.0;
  const prediction = latestTelemetry?.prediction ?? 'normal';
  const confidence = latestTelemetry?.confidence ?? 1.0;
  const dataSource = latestTelemetry?.data_source ?? 'hardware';

  return (
    <div className="space-y-6">
      {/* Top Machine Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold font-mono text-white">{machine.id}</span>
              <StatusBadge status={machine.status} size="sm" />
              <DataSourceBadge source={dataSource} size="sm" />
            </div>
            <p className="text-xs text-slate-400">
              {machine.name} | {machine.location} ({machine.machine_type})
            </p>
          </div>
        </div>

        {/* Sampling specs */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
          <div className="text-right">
            <span className="block text-slate-500 text-[10px]">SAMPLING RATE</span>
            <span className="text-cyan-400 font-bold">100 Hz</span>
          </div>
          <div className="text-right">
            <span className="block text-slate-500 text-[10px]">WINDOW SIZE</span>
            <span className="text-slate-200 font-bold">128 samples (1.28s)</span>
          </div>
          <div className="text-right">
            <span className="block text-slate-500 text-[10px]">INFERENCE</span>
            <span className="text-emerald-400 font-bold uppercase">
              {latestTelemetry?.inference_location || 'device'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Live Gauge Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Vibration RMS */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              Vibration RMS
            </span>
            <span className="text-[10px] text-slate-500">ISO 10816</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono text-white tabular-nums">
              {rms.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400">m/s²</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Warn: {machine.vib_warning_threshold}</span>
              <span>Crit: {machine.vib_critical_threshold}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  rms >= machine.vib_critical_threshold
                    ? 'bg-rose-500'
                    : rms >= machine.vib_warning_threshold
                    ? 'bg-amber-500'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, (rms / machine.vib_critical_threshold) * 80)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Peak Amplitude */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Peak Amplitude
            </span>
            <span className="text-[10px] text-slate-500">Max Peak</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono text-white tabular-nums">
              {peak.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400">m/s²</span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            P2P: <span className="text-slate-200">{(latestTelemetry?.vibration_p2p || peak * 2).toFixed(2)} m/s²</span>
          </p>
        </div>

        {/* Temperature */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-400" />
              Temperature
            </span>
            <span className="text-[10px] text-slate-500">Bearing Surface</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono text-white tabular-nums">
              {temp.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400">°C</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Warn: {machine.temp_warning_threshold}°C</span>
              <span>Crit: {machine.temp_critical_threshold}°C</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  temp >= machine.temp_critical_threshold
                    ? 'bg-rose-500'
                    : temp >= machine.temp_warning_threshold
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (temp / machine.temp_critical_threshold) * 80)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Moments (Kurtosis & Crest Factor) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-400" />
              Impact Dynamics
            </span>
            <span className="text-[10px] text-slate-500">Impulsiveness</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <span className="text-[10px] font-mono text-slate-500">KURTOSIS</span>
              <div className="text-xl font-bold font-mono text-white tabular-nums">
                {kurtosis.toFixed(2)}
              </div>
              <span className="text-[9px] font-mono text-slate-400">Normal ~3.0</span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-500">CREST FACTOR</span>
              <div className="text-xl font-bold font-mono text-white tabular-nums">
                {crestFactor.toFixed(2)}
              </div>
              <span className="text-[9px] font-mono text-slate-400">Impact &gt;4.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* TinyML Edge Diagnosis Bar */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
              EDGE-AI TINYML DIAGNOSIS ({latestTelemetry?.inference_location || 'device'})
            </span>
            <h4 className="text-lg font-bold font-mono text-white">
              {prediction.replace('_', ' ').toUpperCase()}
            </h4>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Confidence: </span>
            <span className="text-cyan-400 font-bold">{(confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-slate-400">Model: </span>
            <span className="text-slate-200">{latestTelemetry?.model_version || '1.2.0-tinyml'}</span>
          </div>
        </div>
      </div>

      {/* Real-time Streaming Charts */}
      <div className="space-y-6">
        {/* Chart Window Controls */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-300">
            REAL-TIME CONTINUOUS SENSOR STREAMS
          </h3>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-mono">
            {[15, 30, 60, 100].map((pts) => (
              <button
                key={pts}
                onClick={() => setChartWindow(pts)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartWindow === pts
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {pts} pts
              </button>
            ))}
          </div>
        </div>

        {/* Vibration Chart */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Vibration Acceleration (m/s²)
            </span>
            <span className="text-slate-500">RMS & Peak Real-Time Stream</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Line
                  type="monotone"
                  dataKey="rms"
                  name="RMS (m/s²)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="peak"
                  name="Peak (m/s²)"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Temperature Chart */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Machine Surface Temperature (°C)
            </span>
            <span className="text-slate-500">Dallas DS18B20 OneWire Stream</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 10 }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Line
                  type="monotone"
                  dataKey="temp"
                  name="Temperature (°C)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Triaxial Acceleration Breakdown (X, Y, Z) */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Triaxial Acceleration Vector (X, Y, Z axes in m/s²)
            </span>
            <span className="text-slate-500">MPU6050 Accelerometer</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Line
                  type="monotone"
                  dataKey="accel_x"
                  name="X-Axis"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="accel_y"
                  name="Y-Axis"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="accel_z"
                  name="Z-Axis (Vertical)"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

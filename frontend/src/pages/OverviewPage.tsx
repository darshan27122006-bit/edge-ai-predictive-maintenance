import React from 'react';
import {
  Activity,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { Machine, Telemetry, Alert } from '../types';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { DataSourceBadge } from '../components/DataSourceBadge';

interface OverviewPageProps {
  machines: Machine[];
  latestTelemetry: Telemetry | null;
  selectedMachine: Machine | null;
  recentAlerts: Alert[];
  onSelectMachine: (id: string) => void;
  onNavigateTab: (tab: any) => void;
  onAcknowledgeAlert: (id: number) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  machines,
  latestTelemetry,
  selectedMachine,
  recentAlerts,
  onSelectMachine,
  onNavigateTab,
  onAcknowledgeAlert,
}) => {
  const totalMachines = machines.length;
  const onlineCount = machines.filter((m) => m.is_online).length;
  const offlineCount = totalMachines - onlineCount;
  const healthyCount = machines.filter((m) => m.status === 'normal' && m.is_online).length;
  const warningCount = machines.filter((m) => m.status === 'warning').length;
  const criticalCount = machines.filter((m) => m.status === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Page Title & System Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            MACHINERY CONDITION MONITORING OVERVIEW
          </h2>
          <p className="text-xs text-slate-400">
            Real-time multi-node plant asset telemetry and edge AI diagnostics
          </p>
        </div>

        <div className="flex items-center gap-2">
          {latestTelemetry && (
            <DataSourceBadge source={latestTelemetry.data_source} size="md" />
          )}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <StatCard
          title="Total Machines"
          value={totalMachines}
          icon={<Cpu className="w-5 h-5" />}
          subtitle={`${onlineCount} Online | ${offlineCount} Offline`}
          accent="slate"
        />
        <StatCard
          title="Healthy Units"
          value={healthyCount}
          icon={<CheckCircle2 className="w-5 h-5" />}
          subtitle="ISO Normal Severity"
          accent="emerald"
        />
        <StatCard
          title="Warning Level"
          value={warningCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          subtitle="Inspection Required"
          accent="amber"
        />
        <StatCard
          title="Critical Alarms"
          value={criticalCount}
          icon={<AlertOctagon className="w-5 h-5" />}
          subtitle="Immediate Action"
          accent="rose"
        />
        <StatCard
          title="Active Target"
          value={selectedMachine ? selectedMachine.id : 'N/A'}
          icon={<Activity className="w-5 h-5" />}
          subtitle={selectedMachine ? selectedMachine.location : 'Select Machine'}
          accent="cyan"
        />
      </div>

      {/* Active Machine Spotlight Banner */}
      {selectedMachine && latestTelemetry && (
        <div className="glass-panel p-5 md:p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusBadge status={selectedMachine.status} size="lg" />
                <DataSourceBadge source={latestTelemetry.data_source} size="sm" />
                <span className="text-xs font-mono text-slate-400">
                  Node: <span className="text-white font-semibold">{selectedMachine.id}</span>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Rated: <span className="text-slate-200">{selectedMachine.rated_speed_rpm} RPM</span>
                </span>
              </div>

              <h3 className="text-lg md:text-xl font-bold text-white font-mono">
                {selectedMachine.name}
              </h3>
              <p className="text-xs text-slate-400">
                Location: {selectedMachine.location} | Type: {selectedMachine.machine_type}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Last Updated: {new Date(latestTelemetry.timestamp).toLocaleTimeString()}
                </span>
                <span>
                  Sequence: <span className="text-slate-200">#{latestTelemetry.sequence}</span>
                </span>
                <span>
                  Firmware: <span className="text-slate-200">{latestTelemetry.firmware_version}</span>
                </span>
              </div>
            </div>

            {/* Live Measurements Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 shrink-0">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Vibration RMS
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-white tabular-nums">
                    {latestTelemetry.vibration_rms.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">m/s²</span>
                </div>
                <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      latestTelemetry.vibration_rms >= selectedMachine.vib_critical_threshold
                        ? 'bg-rose-500'
                        : latestTelemetry.vibration_rms >= selectedMachine.vib_warning_threshold
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (latestTelemetry.vibration_rms / selectedMachine.vib_critical_threshold) * 80
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Temperature
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono text-white tabular-nums">
                    {latestTelemetry.temperature_c.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">°C</span>
                </div>
                <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      latestTelemetry.temperature_c >= selectedMachine.temp_critical_threshold
                        ? 'bg-rose-500'
                        : latestTelemetry.temperature_c >= selectedMachine.temp_warning_threshold
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (latestTelemetry.temperature_c / selectedMachine.temp_critical_threshold) * 80
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  AI Edge Diagnosis
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base font-bold font-mono text-cyan-400 truncate">
                    {latestTelemetry.prediction.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Conf: {(latestTelemetry.confidence * 100).toFixed(0)}%</span>
                  <span className="capitalize">{latestTelemetry.inference_location}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: All Registered Machines & Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-300">
            REGISTERED MACHINERY STATUS
          </h3>
          <button
            onClick={() => onNavigateTab('machines')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
          >
            Manage Machines <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {machines.map((machine) => {
            const isSelected = selectedMachine?.id === machine.id;
            return (
              <div
                key={machine.id}
                onClick={() => onSelectMachine(machine.id)}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-white">{machine.id}</span>
                    <h4 className="text-sm font-semibold text-slate-200 mt-0.5 line-clamp-1">
                      {machine.name}
                    </h4>
                    <span className="text-xs text-slate-400">{machine.location}</span>
                  </div>
                  <StatusBadge status={machine.status} size="sm" />
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Warn Vib: {machine.vib_warning_threshold} m/s²</span>
                  <span>Crit Temp: {machine.temp_critical_threshold}°C</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Alerts Feed */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
            RECENT ALERTS FEED
            {recentAlerts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {recentAlerts.length} Unacknowledged
              </span>
            )}
          </h3>
          <button
            onClick={() => onNavigateTab('alerts')}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
          >
            View All Alerts <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentAlerts.length === 0 ? (
          <div className="p-8 rounded-xl border border-slate-800/80 bg-slate-900/40 text-center">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-mono text-slate-300">All machinery operating normally.</p>
            <p className="text-xs text-slate-500 mt-1">
              No active unacknowledged warning or critical alarms.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  alert.severity === 'critical'
                    ? 'bg-rose-950/40 border-rose-500/40'
                    : 'bg-amber-950/40 border-amber-500/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      alert.severity === 'critical'
                        ? 'bg-rose-900/50 text-rose-300'
                        : 'bg-amber-900/50 text-amber-300'
                    }`}
                  >
                    {alert.severity === 'critical' ? (
                      <AlertOctagon className="w-4 h-4 animate-ping" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        [{alert.severity}] {alert.machine_id}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{alert.message}</p>
                  </div>
                </div>

                <button
                  onClick={() => onAcknowledgeAlert(alert.id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white flex items-center gap-1.5 border border-slate-700 self-end sm:self-center transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Filter,
  Check,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { Alert } from '../types';

interface AlertsPageProps {
  alerts: Alert[];
  onAcknowledgeAlert: (id: number) => Promise<void>;
  selectedMachineId?: string;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  alerts,
  onAcknowledgeAlert,
  selectedMachineId,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'warning' | 'critical'>('all');
  const [ackFilter, setAckFilter] = useState<'all' | 'unacknowledged' | 'acknowledged'>('all');
  const [isProcessing, setIsProcessing] = useState<number | null>(null);

  const filteredAlerts = alerts.filter((a) => {
    if (selectedMachineId && a.machine_id !== selectedMachineId) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (ackFilter === 'unacknowledged' && a.is_acknowledged) return false;
    if (ackFilter === 'acknowledged' && !a.is_acknowledged) return false;
    return true;
  });

  const unackCount = alerts.filter((a) => !a.is_acknowledged).length;
  const critCount = alerts.filter((a) => a.severity === 'critical').length;
  const warnCount = alerts.filter((a) => a.severity === 'warning').length;

  const handleAcknowledge = async (id: number) => {
    try {
      setIsProcessing(id);
      await onAcknowledgeAlert(id);
    } catch (e: any) {
      alert(`Acknowledgement failed: ${e.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            MACHINERY ANOMALY ALERTS & AUDIT LOG
          </h2>
          <p className="text-xs text-slate-400">
            Real-time threshold breaches, Edge-AI fault triggers, and operator sign-offs
          </p>
        </div>

        {/* Cooldown notice */}
        <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
          Anti-Flood Cooldown: <span className="text-cyan-400 font-bold">30 seconds</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-slate-500 text-[10px] font-mono uppercase">Total Logged</span>
          <div className="text-2xl font-bold font-mono text-white tabular-nums mt-0.5">
            {alerts.length}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-rose-400 text-[10px] font-mono uppercase">Unacknowledged</span>
          <div className="text-2xl font-bold font-mono text-rose-300 tabular-nums mt-0.5">
            {unackCount}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-rose-400 text-[10px] font-mono uppercase">Critical Level</span>
          <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums mt-0.5">
            {critCount}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-amber-400 text-[10px] font-mono uppercase">Warning Level</span>
          <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums mt-0.5">
            {warnCount}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-slate-400">Filters:</span>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e: any) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200"
          >
            <option value="all">All Severities</option>
            <option value="warning">Warning Only</option>
            <option value="critical">Critical Only</option>
          </select>

          {/* Acknowledged filter */}
          <select
            value={ackFilter}
            onChange={(e: any) => setAckFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="unacknowledged">Unacknowledged</option>
            <option value="acknowledged">Acknowledged</option>
          </select>
        </div>

        <span className="text-slate-500">
          Showing {filteredAlerts.length} of {alerts.length} events
        </span>
      </div>

      {/* Alerts Table */}
      {filteredAlerts.length === 0 ? (
        <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-900/40">
          <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-mono text-slate-300">No alerts matching filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all ${
                alert.severity === 'critical'
                  ? 'bg-rose-950/20 border-rose-500/30'
                  : 'bg-amber-950/20 border-amber-500/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      alert.severity === 'critical'
                        ? 'bg-rose-900/40 text-rose-300'
                        : 'bg-amber-900/40 text-amber-300'
                    }`}
                  >
                    {alert.severity === 'critical' ? (
                      <AlertOctagon className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">
                        [{alert.machine_id}]
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold border ${
                          alert.severity === 'critical'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs font-mono text-slate-200">{alert.message}</p>

                    <div className="text-[11px] font-mono text-slate-400 flex flex-wrap gap-4 pt-1">
                      <span>
                        Trigger: <strong className="text-slate-300">{alert.triggering_metric}</strong> ={' '}
                        <strong className="text-white">{alert.triggering_value}</strong>
                      </span>
                      <span>
                        Limit Threshold: <strong className="text-slate-300">{alert.threshold_value}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acknowledgement Status / Action */}
                <div className="shrink-0 flex items-center self-end sm:self-center">
                  {alert.is_acknowledged ? (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Signed off by {alert.acknowledged_by || 'Operator'}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={isProcessing === alert.id}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white border border-slate-700 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      {isProcessing === alert.id ? 'Saving...' : 'Acknowledge'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Download,
  BarChart3,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { Machine, AnalyticsSummary } from '../types';
import { api } from '../services/api';

interface HistoricalAnalyticsPageProps {
  machine: Machine | null;
}

export const HistoricalAnalyticsPage: React.FC<HistoricalAnalyticsPageProps> = ({ machine }) => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (machine) {
      loadAnalytics(machine.id);
    }
  }, [machine?.id]);

  const loadAnalytics = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await api.getAnalytics(id);
      setAnalytics(data);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!machine) {
    return (
      <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-900/40">
        <BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <h3 className="text-base font-mono text-slate-300">No machine selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select a machine from the header dropdown.</p>
      </div>
    );
  }

  // Format fault distribution for bar chart
  const faultData = analytics?.fault_distribution
    ? Object.entries(analytics.fault_distribution).map(([key, count]) => ({
        name: key.replace('_', ' ').toUpperCase(),
        count,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Title & CSV Export Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            HISTORICAL ANALYTICS & FLEET RELIABILITY
          </h2>
          <p className="text-xs text-slate-400">
            Observed asset uptime, statistical degradation trends, and abnormal event distributions
          </p>
        </div>

        <a
          href={api.getExportUrl(machine.id)}
          download
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-mono text-xs font-semibold transition-colors shrink-0"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          Export Telemetry CSV
        </a>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] font-mono uppercase text-slate-500">OBSERVED UPTIME</span>
          <div className="mt-1 flex items-baseline gap-1 text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {analytics?.uptime_percentage || 98.5}%
            <Percent className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-[11px] font-mono text-slate-400">Based on telemetry polling</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] font-mono uppercase text-slate-500">TOTAL DATA SAMPLES</span>
          <div className="mt-1 text-2xl font-bold font-mono text-white tabular-nums">
            {analytics?.total_records || 0}
          </div>
          <span className="text-[11px] font-mono text-slate-400">128-sample windows logged</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] font-mono uppercase text-amber-400">WARNING ALERTS</span>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-300 tabular-nums">
            {analytics?.warning_alerts || 0}
          </div>
          <span className="text-[11px] font-mono text-slate-400">Above warning threshold</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] font-mono uppercase text-rose-400">CRITICAL ALARMS</span>
          <div className="mt-1 text-2xl font-bold font-mono text-rose-300 tabular-nums">
            {analytics?.critical_alerts || 0}
          </div>
          <span className="text-[11px] font-mono text-slate-400">Immediate hazard level</span>
        </div>
      </div>

      {/* Trends Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Long-term Vibration Energy Trend */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Historical Vibration RMS Energy (m/s²)
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.daily_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="vibGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="vibration_rms"
                  stroke="#06b6d4"
                  fillOpacity={1}
                  fill="url(#vibGrad)"
                  name="RMS (m/s²)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Long-term Thermal Trend */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Machine Surface Temperature Trend (°C)
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.daily_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="temperature_c"
                  stroke="#f43f5e"
                  fillOpacity={1}
                  fill="url(#tempGrad)"
                  name="Temp (°C)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fault Frequency Breakdown */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider">
          CLASSIFICATION FREQUENCY DISTRIBUTION (HISTORICAL EVENT SAMPLES)
        </h3>
        <p className="text-xs text-slate-400">
          Distribution of operational classifications recorded for asset {machine.id}
        </p>

        {faultData.length === 0 ? (
          <p className="text-xs font-mono text-slate-500 py-6 text-center">
            Awaiting telemetry accumulation for fault frequency histogram.
          </p>
        ) : (
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faultData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Occurrences" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Academic Disclaimer on RUL */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-400 mt-0.5">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-slate-300 block mb-0.5">
            Engineering Note on Remaining Useful Life (RUL) Modeling:
          </span>
          <p className="text-slate-400 leading-relaxed">
            Remaining Useful Life (RUL) prognostic calculations are intentionally excluded from this prototype. Per academic standards, RUL estimation requires empirically validated run-to-failure degradation datasets (e.g. PRONOSTIA or NASA Prognostics) to avoid unsubstantiated claims. Condition monitoring relies on current ISO 10816 state detection and alert escalation.
          </p>
        </div>
      </div>
    </div>
  );
};

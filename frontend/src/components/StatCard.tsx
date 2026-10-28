import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  badge?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  accent = 'cyan',
  badge,
}) => {
  const accentBorders = {
    cyan: 'border-cyan-500/30 group-hover:border-cyan-500/60',
    emerald: 'border-emerald-500/30 group-hover:border-emerald-500/60',
    amber: 'border-amber-500/30 group-hover:border-amber-500/60',
    rose: 'border-rose-500/30 group-hover:border-rose-500/60',
    purple: 'border-purple-500/30 group-hover:border-purple-500/60',
    slate: 'border-slate-700/60 group-hover:border-slate-600',
  };

  const accentIcons = {
    cyan: 'text-cyan-400 bg-cyan-950/50 border-cyan-500/20',
    emerald: 'text-emerald-400 bg-emerald-950/50 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-950/50 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-950/50 border-rose-500/20',
    purple: 'text-purple-400 bg-purple-950/50 border-purple-500/20',
    slate: 'text-slate-400 bg-slate-800/50 border-slate-700/40',
  };

  return (
    <div
      className={`group relative p-5 rounded-xl bg-slate-900/80 backdrop-blur-md border ${accentBorders[accent]} transition-all duration-200 hover:shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider font-mono text-slate-400">
            {title}
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-white tabular-nums">
              {value}
            </span>
            {unit && <span className="text-sm font-mono text-slate-400">{unit}</span>}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={`p-2.5 rounded-lg border ${accentIcons[accent]}`}>
            {icon}
          </div>
          {badge}
        </div>
      </div>
    </div>
  );
};

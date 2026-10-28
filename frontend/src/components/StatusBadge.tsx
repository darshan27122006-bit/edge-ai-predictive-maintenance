import React from 'react';
import type { MachineStatus } from '../types';

interface StatusBadgeProps {
  status: MachineStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  const normStatus = (status || 'offline').toLowerCase();

  let bgClass = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotClass = 'bg-slate-400';
  let label = 'Offline';

  if (normStatus === 'normal' || normStatus === 'healthy' || normStatus === 'ok') {
    bgClass = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10';
    dotClass = 'bg-emerald-400 animate-pulse-slow';
    label = 'Normal';
  } else if (normStatus === 'warning') {
    bgClass = 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10';
    dotClass = 'bg-amber-400 animate-pulse';
    label = 'Warning';
  } else if (normStatus === 'critical' || normStatus === 'danger') {
    bgClass = 'bg-rose-950/70 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/20';
    dotClass = 'bg-rose-400 animate-ping';
    label = 'Critical';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono uppercase tracking-wider ${bgClass} ${sizeClasses[size]}`}
    >
      {showDot && <span className={`w-2 h-2 rounded-full ${dotClass}`} />}
      {label}
    </span>
  );
};

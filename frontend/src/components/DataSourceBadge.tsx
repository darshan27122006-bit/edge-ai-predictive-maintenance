import React from 'react';
import { Cpu, FlaskConical, Radio } from 'lucide-react';
import type { DataSource } from '../types';

interface DataSourceBadgeProps {
  source: DataSource | string;
  size?: 'sm' | 'md' | 'lg';
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ source, size = 'md' }) => {
  const isHardware = source === 'hardware';

  if (isHardware) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded-md border font-semibold ${
          size === 'sm'
            ? 'px-2 py-0.5 text-xs'
            : size === 'lg'
            ? 'px-3.5 py-1.5 text-sm'
            : 'px-2.5 py-1 text-xs'
        } bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/20`}
        title="Telemetry acquired from connected physical ESP32 hardware"
      >
        <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          Live Hardware
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded-md border font-semibold ${
        size === 'sm'
          ? 'px-2 py-0.5 text-xs'
          : size === 'lg'
          ? 'px-3.5 py-1.5 text-sm'
          : 'px-2.5 py-1 text-xs'
      } bg-purple-950/70 border-purple-500/50 text-purple-300 shadow-sm shadow-purple-500/20`}
      title="Telemetry synthesized by physics-based simulation engine for testing"
    >
      <FlaskConical className="w-3.5 h-3.5 text-purple-400 animate-pulse-slow" />
      Simulation Data
    </span>
  );
};

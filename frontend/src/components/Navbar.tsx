import React from 'react';
import { Activity, Cpu, Wifi, WifiOff, Play, Square, Layers } from 'lucide-react';
import { DataSourceBadge } from './DataSourceBadge';
import type { Machine } from '../types';

interface NavbarProps {
  machines: Machine[];
  selectedMachineId: string;
  onSelectMachine: (id: string) => void;
  isWsConnected: boolean;
  activeDataSource: string;
  isSimRunning: boolean;
  onToggleSim: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  machines,
  selectedMachineId,
  onSelectMachine,
  isWsConnected,
  activeDataSource,
  isSimRunning,
  onToggleSim,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Academic Info */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-400 shadow-sm shadow-cyan-500/20">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-mono">
              EDGE-AI PREDICTIVE MAINTENANCE
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-semibold">
              v1.2 TinyML
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Rotating Machinery Vibration & Thermal Condition Monitoring (ESP32 Node)
          </p>
        </div>
      </div>

      {/* Center: Machine Selector & Source Indicator */}
      <div className="flex items-center gap-3">
        {/* Machine Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-mono hidden md:inline">Target:</span>
          <select
            value={selectedMachineId}
            onChange={(e) => onSelectMachine(e.target.value)}
            className="bg-transparent text-xs font-mono text-cyan-300 font-medium focus:outline-none cursor-pointer pr-1"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                {m.id} ({m.name})
              </option>
            ))}
          </select>
        </div>

        {/* Global Data Source Tag */}
        <DataSourceBadge source={activeDataSource} />
      </div>

      {/* Right Controls: Stream status & Simulation quick-toggle */}
      <div className="flex items-center gap-3">
        {/* Simulation Quick Control */}
        <button
          onClick={onToggleSim}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
            isSimRunning
              ? 'bg-amber-950/50 border-amber-600/50 text-amber-300 hover:bg-amber-900/50'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
          title={isSimRunning ? 'Pause synthetic simulation telemetry' : 'Start synthetic simulation telemetry'}
        >
          {isSimRunning ? (
            <>
              <Square className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Sim Active</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span>Start Sim</span>
            </>
          )}
        </button>

        {/* WebSocket Stream Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
            isWsConnected
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
              : 'bg-rose-950/50 border-rose-500/40 text-rose-400'
          }`}
          title={isWsConnected ? 'Connected to live WebSocket stream' : 'WebSocket offline; reconnecting...'}
        >
          {isWsConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-semibold">LIVE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>OFFLINE</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

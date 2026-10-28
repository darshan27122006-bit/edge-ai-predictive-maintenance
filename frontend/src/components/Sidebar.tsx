import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Cpu,
  AlertTriangle,
  Bell,
  BarChart3,
  BrainCircuit,
  Sliders,
} from 'lucide-react';

export type TabId =
  | 'overview'
  | 'live'
  | 'machines'
  | 'faults'
  | 'alerts'
  | 'analytics'
  | 'model'
  | 'settings';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  unacknowledgedAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  unacknowledgedAlertsCount,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitoring', icon: Activity },
    { id: 'machines', label: 'Machines', icon: Cpu },
    { id: 'faults', label: 'Fault Detection', icon: AlertTriangle },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: Bell,
      badge: unacknowledgedAlertsCount > 0 ? unacknowledgedAlertsCount : undefined,
    },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'model', label: 'Model Evaluation', icon: BrainCircuit },
    { id: 'settings', label: 'Settings & Sim', icon: Sliders },
  ];

  return (
    <aside className="w-full md:w-64 shrink-0 border-r border-slate-800/80 bg-slate-950/70 p-3 md:p-4 flex md:flex-col justify-between overflow-x-auto md:overflow-x-visible">
      <div className="flex md:flex-col gap-1 w-full">
        <div className="hidden md:block px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
          SYSTEM MODULES
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as TabId)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="hidden md:block p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400">
        <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
          <span>EDGE NODE</span>
          <span className="text-cyan-400">ONLINE</span>
        </div>
        <p className="text-[10px] text-slate-400">TinyML Xtensa LX6 @ 240MHz</p>
        <p className="text-[10px] text-slate-400">MPU6050 + DS18B20</p>
      </div>
    </aside>
  );
};

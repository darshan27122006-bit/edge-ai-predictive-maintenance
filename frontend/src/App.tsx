import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import type { TabId } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { MachineManagementPage } from './pages/MachineManagementPage';
import { FaultDetectionPage } from './pages/FaultDetectionPage';
import { AlertsPage } from './pages/AlertsPage';
import { HistoricalAnalyticsPage } from './pages/HistoricalAnalyticsPage';
import { ModelEvaluationPage } from './pages/ModelEvaluationPage';
import { SettingsPage } from './pages/SettingsPage';
import type { Machine, Telemetry, Alert, SimulationStatus } from './types';
import { api } from './services/api';
import { wsClient } from './services/websocket';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('ESP32-MOTOR-01');
  const [latestTelemetry, setLatestTelemetry] = useState<Telemetry | null>(null);
  const [telemetryStream, setTelemetryStream] = useState<Telemetry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [simStatus, setSimStatus] = useState<SimulationStatus | null>(null);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize data on mount
  useEffect(() => {
    initAppData();

    // Setup WebSocket connection
    wsClient.connect();

    const unsubConn = wsClient.on('connection_change', ({ connected }) => {
      setIsWsConnected(connected);
    });

    const unsubTelemetry = wsClient.on('telemetry', (record: Telemetry) => {
      setLatestTelemetry((prev) => (record.machine_id === selectedMachineId ? record : prev));

      setTelemetryStream((prev) => {
        const next = [...prev, record];
        return next.slice(-150); // Keep last 150 points for charts
      });

      // Update machine status in memory
      setMachines((prev) =>
        prev.map((m) =>
          m.id === record.machine_id
            ? {
                ...m,
                status: record.is_anomaly
                  ? record.prediction === 'excessive_vibration' ||
                    record.prediction === 'abnormal_temperature'
                    ? 'critical'
                    : 'warning'
                  : 'normal',
                is_online: true,
                last_seen: record.timestamp,
              }
            : m
        )
      );
    });

    const unsubAlert = wsClient.on('alert', (newAlert: Alert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    });

    const unsubAck = wsClient.on('alert_acknowledged', (ackData: any) => {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === ackData.id
            ? { ...a, is_acknowledged: true, acknowledged_by: ackData.acknowledged_by }
            : a
        )
      );
    });

    return () => {
      unsubConn();
      unsubTelemetry();
      unsubAlert();
      unsubAck();
      wsClient.disconnect();
    };
  }, [selectedMachineId]);

  const initAppData = async () => {
    try {
      setIsLoading(true);
      const [machineList, alertList, sim] = await Promise.all([
        api.getMachines(),
        api.getAlerts({ unacknowledged_only: false }),
        api.getSimulationStatus(),
      ]);

      setMachines(machineList);
      setAlerts(alertList);
      setSimStatus(sim);

      if (machineList.length > 0 && !selectedMachineId) {
        setSelectedMachineId(machineList[0].id);
      }

      // Fetch latest telemetry for selected machine
      const targetId = selectedMachineId || (machineList[0]?.id ?? 'ESP32-MOTOR-01');
      try {
        const latest = await api.getLatestTelemetry(targetId);
        setLatestTelemetry(latest);
      } catch (e) {
        // May not have telemetry yet if fresh
      }

      // Fetch recent history
      try {
        const history = await api.getTelemetryHistory(targetId, 40);
        setTelemetryStream(history.reverse());
      } catch (e) {
        // Empty history
      }
    } catch (err) {
      console.error('Failed to initialize app data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedMachine =
    machines.find((m) => m.id === selectedMachineId) || machines[0] || null;

  const handleAddMachine = async (data: Partial<Machine>) => {
    const created = await api.createMachine(data);
    setMachines((prev) => [...prev, created]);
    setSelectedMachineId(created.id);
  };

  const handleUpdateMachine = async (id: string, data: Partial<Machine>) => {
    const updated = await api.updateMachine(id, data);
    setMachines((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const handleDeleteMachine = async (id: string) => {
    await api.deleteMachine(id);
    setMachines((prev) => prev.filter((m) => m.id !== id));
    if (selectedMachineId === id && machines.length > 1) {
      const remaining = machines.filter((m) => m.id !== id);
      setSelectedMachineId(remaining[0].id);
    }
  };

  const handleAcknowledgeAlert = async (id: number) => {
    const updated = await api.acknowledgeAlert(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const handleToggleSim = async () => {
    if (simStatus?.is_running) {
      const nextSim = await api.stopSimulation();
      setSimStatus(nextSim);
    } else {
      const nextSim = await api.startSimulation('normal');
      setSimStatus(nextSim);
    }
  };

  const unacknowledgedCount = alerts.filter((a) => !a.is_acknowledged).length;
  const currentDataSource = latestTelemetry?.data_source || 'simulation';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        machines={machines}
        selectedMachineId={selectedMachineId}
        onSelectMachine={(id) => setSelectedMachineId(id)}
        isWsConnected={isWsConnected}
        activeDataSource={currentDataSource}
        isSimRunning={simStatus?.is_running ?? false}
        onToggleSim={handleToggleSim}
      />

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1600px] mx-auto">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          unacknowledgedAlertsCount={unacknowledgedCount}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'overview' && (
            <OverviewPage
              machines={machines}
              latestTelemetry={latestTelemetry}
              selectedMachine={selectedMachine}
              recentAlerts={alerts.filter((a) => !a.is_acknowledged)}
              onSelectMachine={(id) => setSelectedMachineId(id)}
              onNavigateTab={setActiveTab}
              onAcknowledgeAlert={handleAcknowledgeAlert}
            />
          )}

          {activeTab === 'live' && (
            <LiveMonitoringPage
              machine={selectedMachine}
              latestTelemetry={latestTelemetry}
              telemetryStream={telemetryStream}
            />
          )}

          {activeTab === 'machines' && (
            <MachineManagementPage
              machines={machines}
              onAddMachine={handleAddMachine}
              onUpdateMachine={handleUpdateMachine}
              onDeleteMachine={handleDeleteMachine}
              selectedMachineId={selectedMachineId}
              onSelectMachine={setSelectedMachineId}
            />
          )}

          {activeTab === 'faults' && (
            <FaultDetectionPage
              machine={selectedMachine}
              latestTelemetry={latestTelemetry}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsPage
              alerts={alerts}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              selectedMachineId={selectedMachineId}
            />
          )}

          {activeTab === 'analytics' && (
            <HistoricalAnalyticsPage machine={selectedMachine} />
          )}

          {activeTab === 'model' && <ModelEvaluationPage />}

          {activeTab === 'settings' && (
            <SettingsPage
              simStatus={simStatus}
              onRefreshSimStatus={async () => {
                const s = await api.getSimulationStatus();
                setSimStatus(s);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Cpu,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import type { Machine } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface MachineManagementPageProps {
  machines: Machine[];
  onAddMachine: (data: Partial<Machine>) => Promise<void>;
  onUpdateMachine: (id: string, data: Partial<Machine>) => Promise<void>;
  onDeleteMachine: (id: string) => Promise<void>;
  selectedMachineId: string;
  onSelectMachine: (id: string) => void;
}

export const MachineManagementPage: React.FC<MachineManagementPageProps> = ({
  machines,
  onAddMachine,
  onUpdateMachine,
  onDeleteMachine,
  selectedMachineId,
  onSelectMachine,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [deletingMachineId, setDeletingMachineId] = useState<string | null>(null);

  // New Machine Form State
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('Bay 1 - Main Floor');
  const [newType, setNewType] = useState('Induction Motor');
  const [newRpm, setNewRpm] = useState(1800);
  const [newVibWarn, setNewVibWarn] = useState(2.8);
  const [newVibCrit, setNewVibCrit] = useState(4.5);
  const [newTempWarn, setNewTempWarn] = useState(60.0);
  const [newTempCrit, setNewTempCrit] = useState(75.0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newId.trim() || !newName.trim()) {
      setErrorMsg('Machine ID and Name are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddMachine({
        id: newId.trim().toUpperCase(),
        name: newName.trim(),
        location: newLocation.trim(),
        machine_type: newType,
        rated_speed_rpm: Number(newRpm),
        vib_warning_threshold: Number(newVibWarn),
        vib_critical_threshold: Number(newVibCrit),
        temp_warning_threshold: Number(newTempWarn),
        temp_critical_threshold: Number(newTempCrit),
      });
      setShowAddModal(false);
      setNewId('');
      setNewName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register machine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMachine) return;

    try {
      setIsSubmitting(true);
      await onUpdateMachine(editingMachine.id, {
        name: editingMachine.name,
        location: editingMachine.location,
        machine_type: editingMachine.machine_type,
        rated_speed_rpm: Number(editingMachine.rated_speed_rpm),
        vib_warning_threshold: Number(editingMachine.vib_warning_threshold),
        vib_critical_threshold: Number(editingMachine.vib_critical_threshold),
        temp_warning_threshold: Number(editingMachine.temp_warning_threshold),
        temp_critical_threshold: Number(editingMachine.temp_critical_threshold),
      });
      setEditingMachine(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update machine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMachineId) return;
    try {
      setIsSubmitting(true);
      await onDeleteMachine(deletingMachineId);
      setDeletingMachineId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to remove machine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            ROTATING MACHINERY INVENTORY
          </h2>
          <p className="text-xs text-slate-400">
            Configure monitored assets, sensor mappings, and ISO 10816 threshold limits
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-colors shadow-md shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          Register Machine
        </button>
      </div>

      {/* Machine Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map((m) => {
          const isSelected = selectedMachineId === m.id;
          return (
            <div
              key={m.id}
              className={`p-5 rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-white tracking-wide">
                      {m.id}
                    </span>
                    <span className="block text-[11px] font-mono text-slate-400">
                      {m.rated_speed_rpm} RPM
                    </span>
                  </div>
                </div>

                <StatusBadge status={m.status} size="sm" />
              </div>

              <div className="mt-3">
                <h4 className="text-sm font-semibold text-slate-200 line-clamp-1">{m.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{m.location}</p>
                <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {m.machine_type}
                </span>
              </div>

              {/* Thresholds Table */}
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Vibration Limits:</span>
                  <span className="text-slate-200">
                    Warn: {m.vib_warning_threshold} | Crit: {m.vib_critical_threshold} m/s²
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Thermal Limits:</span>
                  <span className="text-slate-200">
                    Warn: {m.temp_warning_threshold}°C | Crit: {m.temp_critical_threshold}°C
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => onSelectMachine(m.id)}
                  className={`text-xs font-mono font-medium px-2.5 py-1 rounded transition-colors ${
                    isSelected
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {isSelected ? 'Active Target' : 'Select'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingMachine(m)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                    title="Edit Machine Thresholds"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingMachineId(m.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Remove Machine"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Register Machine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                REGISTER NEW ROTATING MACHINE
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs font-mono text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Device ID *</label>
                  <input
                    type="text"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="e.g. ESP32-MOTOR-04"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Rated Speed (RPM)</label>
                  <input
                    type="number"
                    value={newRpm}
                    onChange={(e) => setNewRpm(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Machine Asset Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Secondary Booster Pump #4"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Shopfloor Location</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Machine Class / Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="AC Induction Motor">AC Induction Motor</option>
                    <option value="Centrifugal Pump">Centrifugal Pump</option>
                    <option value="Exhaust Fan">Exhaust Fan</option>
                    <option value="Gearbox Coupling">Gearbox Coupling</option>
                  </select>
                </div>
              </div>

              {/* Threshold limits */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider block">
                  ISO 10816 Operating Alarm Limits
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Vibration Warning (m/s²)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newVibWarn}
                      onChange={(e) => setNewVibWarn(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Vibration Critical (m/s²)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newVibCrit}
                      onChange={(e) => setNewVibCrit(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Temp Warning (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newTempWarn}
                      onChange={(e) => setNewTempWarn(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Temp Critical (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newTempCrit}
                      onChange={(e) => setNewTempCrit(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Machine Modal */}
      {editingMachine && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-400" />
                EDIT MACHINE CONFIGURATION: {editingMachine.id}
              </h3>
              <button
                onClick={() => setEditingMachine(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="mt-4 space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Machine Asset Name</label>
                <input
                  type="text"
                  value={editingMachine.name}
                  onChange={(e) =>
                    setEditingMachine({ ...editingMachine, name: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Location</label>
                  <input
                    type="text"
                    value={editingMachine.location}
                    onChange={(e) =>
                      setEditingMachine({ ...editingMachine, location: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Rated Speed (RPM)</label>
                  <input
                    type="number"
                    value={editingMachine.rated_speed_rpm}
                    onChange={(e) =>
                      setEditingMachine({
                        ...editingMachine,
                        rated_speed_rpm: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <span className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider block">
                  Threshold Reconfiguration
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Vibration Warning (m/s²)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingMachine.vib_warning_threshold}
                      onChange={(e) =>
                        setEditingMachine({
                          ...editingMachine,
                          vib_warning_threshold: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Vibration Critical (m/s²)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingMachine.vib_critical_threshold}
                      onChange={(e) =>
                        setEditingMachine({
                          ...editingMachine,
                          vib_critical_threshold: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Temp Warning (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editingMachine.temp_warning_threshold}
                      onChange={(e) =>
                        setEditingMachine({
                          ...editingMachine,
                          temp_warning_threshold: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Temp Critical (°C)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editingMachine.temp_critical_threshold}
                      onChange={(e) =>
                        setEditingMachine({
                          ...editingMachine,
                          temp_critical_threshold: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMachine(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Update Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMachineId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold font-mono text-white">CONFIRM DELETION</h3>
            </div>
            <p className="text-xs font-mono text-slate-300">
              Are you sure you want to remove machine asset{' '}
              <span className="text-rose-400 font-bold">{deletingMachineId}</span>? All associated
              historical telemetry and alert records will be permanently removed.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingMachineId(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

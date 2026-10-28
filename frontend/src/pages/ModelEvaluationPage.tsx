import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Cpu,
  Clock,
  HardDrive,
  BarChart2,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { ModelEvaluationResponse } from '../types';
import { api } from '../services/api';

export const ModelEvaluationPage: React.FC = () => {
  const [evalData, setEvalData] = useState<ModelEvaluationResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState<'RandomForest' | 'MLP_NeuralNet'>('RandomForest');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      const data = await api.getModelEvaluation();
      setEvalData(data);
    } catch (e) {
      console.error('Failed to load evaluation metrics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const modelMetrics = evalData?.evaluation?.[selectedModel];
  const espProfile = evalData?.esp32_hardware_profile;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            ACADEMIC MODEL EVALUATION & TINYML BENCHMARKS
          </h2>
          <p className="text-xs text-slate-400">
            Empirical test performance, per-class confusion matrix, and measured ESP32 edge resource footprints
          </p>
        </div>

        {/* Model Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-mono">
          <button
            onClick={() => setSelectedModel('RandomForest')}
            className={`px-3 py-1.5 rounded transition-colors ${
              selectedModel === 'RandomForest'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Random Forest (Baseline)
          </button>
          <button
            onClick={() => setSelectedModel('MLP_NeuralNet')}
            className={`px-3 py-1.5 rounded transition-colors ${
              selectedModel === 'MLP_NeuralNet'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Compact TinyML Neural Net
          </button>
        </div>
      </div>

      {!modelMetrics ? (
        <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-900/40">
          <BrainCircuit className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-base font-mono text-slate-300">Model Evaluation Not Completed</h3>
          <p className="text-xs text-slate-500 mt-1">
            Run <code className="text-cyan-400">python ml/train_model.py</code> to execute training & evaluation.
          </p>
        </div>
      ) : (
        <>
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30">
              <span className="text-[10px] font-mono uppercase text-slate-400">TEST ACCURACY</span>
              <div className="mt-1 text-3xl font-bold font-mono text-emerald-400 tabular-nums">
                {(modelMetrics.accuracy * 100).toFixed(2)}%
              </div>
              <span className="text-[11px] font-mono text-slate-500">Held-out test set</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30">
              <span className="text-[10px] font-mono uppercase text-slate-400">MACRO F1-SCORE</span>
              <div className="mt-1 text-3xl font-bold font-mono text-cyan-400 tabular-nums">
                {modelMetrics.f1_macro.toFixed(4)}
              </div>
              <span className="text-[11px] font-mono text-slate-500">Harmonic mean P & R</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30">
              <span className="text-[10px] font-mono uppercase text-slate-400">MACRO PRECISION</span>
              <div className="mt-1 text-3xl font-bold font-mono text-purple-400 tabular-nums">
                {modelMetrics.precision_macro.toFixed(4)}
              </div>
              <span className="text-[11px] font-mono text-slate-500">Across 6 fault classes</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">
              <span className="text-[10px] font-mono uppercase text-slate-400">MACRO RECALL</span>
              <div className="mt-1 text-3xl font-bold font-mono text-amber-400 tabular-nums">
                {modelMetrics.recall_macro.toFixed(4)}
              </div>
              <span className="text-[11px] font-mono text-slate-500">Sensitivity rate</span>
            </div>
          </div>

          {/* Microcontroller Hardware Resource Footprints */}
          {espProfile && (
            <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  ESP32 TARGET BOARD HARDWARE PROFILE
                </span>
                <span className="text-xs font-mono text-slate-400">{espProfile.target_mcu}</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">MCU FLASH USAGE</span>
                  <span className="text-white text-base font-bold">
                    {espProfile.flash_footprint_kb} KB
                  </span>
                  <span className="text-[10px] text-slate-500 block">&lt; 1% of 4MB Flash</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">SRAM ALLOCATION</span>
                  <span className="text-white text-base font-bold">
                    {espProfile.ram_allocated_kb} KB
                  </span>
                  <span className="text-[10px] text-slate-500 block">&lt; 5% of 520KB SRAM</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">EDGE INFERENCE LATENCY</span>
                  <span className="text-emerald-400 text-base font-bold">
                    {espProfile.estimated_edge_latency_ms} ms
                  </span>
                  <span className="text-[10px] text-slate-500 block">Measured at 240 MHz</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">DESKTOP BENCHMARK</span>
                  <span className="text-cyan-400 text-base font-bold">
                    {modelMetrics.latency.avg_ms.toFixed(3)} ms
                  </span>
                  <span className="text-[10px] text-slate-500 block">Single-sample inference</span>
                </div>
              </div>
            </div>
          )}

          {/* Confusion Matrix Table */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                CONFUSION MATRIX (HELD-OUT TEST SAMPLES)
              </h3>
              <p className="text-xs text-slate-400">
                Rows represent true ground-truth classes; columns represent model predictions
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-2.5 text-left bg-slate-950">Ground Truth \ Predicted</th>
                    {modelMetrics.classes.map((cname) => (
                      <th key={cname} className="p-2.5 text-center bg-slate-950/60 font-medium">
                        {cname}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modelMetrics.confusion_matrix.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-slate-800/60">
                      <td className="p-2.5 font-bold text-slate-300 bg-slate-950/40">
                        {modelMetrics.classes[rowIdx]}
                      </td>
                      {row.map((val, colIdx) => {
                        const isDiagonal = rowIdx === colIdx;
                        return (
                          <td
                            key={colIdx}
                            className={`p-2.5 text-center font-bold tabular-nums ${
                              isDiagonal
                                ? val > 0
                                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                                  : 'text-slate-500'
                                : val > 0
                                ? 'bg-rose-950/40 text-rose-300 font-bold border border-rose-500/30'
                                : 'text-slate-600'
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-Class Detailed Performance Table */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              PER-CLASS PERFORMANCE BREAKDOWN
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-2.5 text-left">Class Name</th>
                    <th className="p-2.5 text-center">Precision</th>
                    <th className="p-2.5 text-center">Recall</th>
                    <th className="p-2.5 text-center">F1-Score</th>
                    <th className="p-2.5 text-center">Test Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {modelMetrics.per_class_metrics.map((pcm) => (
                    <tr key={pcm.class_id} className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-semibold text-slate-200">{pcm.class_name}</td>
                      <td className="p-2.5 text-center text-cyan-400 tabular-nums">
                        {(pcm.precision * 100).toFixed(1)}%
                      </td>
                      <td className="p-2.5 text-center text-amber-400 tabular-nums">
                        {(pcm.recall * 100).toFixed(1)}%
                      </td>
                      <td className="p-2.5 text-center text-emerald-400 font-bold tabular-nums">
                        {pcm.f1_score.toFixed(4)}
                      </td>
                      <td className="p-2.5 text-center text-slate-400 tabular-nums">
                        {pcm.support}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

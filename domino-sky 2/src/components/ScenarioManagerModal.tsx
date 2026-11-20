/**
 * DOMINO SKY - Scenario Management & Comparison Modal
 * Save, load, rename, export, and compare disruption scenarios using LocalStorage.
 */

import React, { useState, useEffect } from 'react';
import { SimulationResult } from '../engine/types';
import { CandidateAction } from '../engine/recovery';
import { X, Save, FolderOpen, Trash2, Edit3, Download, Layers, Check, Plus, AlertTriangle } from 'lucide-react';

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  closedAirport: string | null;
  closureStart: string | null;
  closureEnd: string | null;
  appliedActionTitle?: string;
  appliedActionId?: string;
  summaryMetrics: {
    delayedCount: number;
    cancelledCount: number;
    totalDelayMinutes: number;
    strandedPax: number;
    crewBreaches: number;
  };
}

interface ScenarioManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentResult: SimulationResult;
  appliedAction: CandidateAction | null;
  onLoadScenario: (scenario: SavedScenario) => void;
}

const STORAGE_KEY = 'domino_sky_saved_scenarios_v1';

export const ScenarioManagerModal: React.FC<ScenarioManagerModalProps> = ({
  isOpen,
  onClose,
  currentResult,
  appliedAction,
  onLoadScenario,
}) => {
  const [savedList, setSavedList] = useState<SavedScenario[]>([]);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [compareAId, setCompareAId] = useState<string | null>(null);
  const [compareBId, setCompareBId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manage' | 'compare'>('manage');

  // Load from local storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSavedList(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('Failed to parse saved scenarios from localStorage:', e);
    }
  }, [isOpen]);

  const saveToStorage = (list: SavedScenario[]) => {
    setSavedList(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save scenarios to localStorage:', e);
    }
  };

  const handleSaveCurrent = () => {
    const name = newScenarioName.trim() || `Scenario ${savedList.length + 1} (${currentResult.params.closedAirport || 'Normal'})`;
    const newEntry: SavedScenario = {
      id: `scen_${Date.now()}`,
      name,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      closedAirport: currentResult.params.closedAirport,
      closureStart: currentResult.params.closureStart,
      closureEnd: currentResult.params.closureEnd,
      appliedActionTitle: appliedAction?.title,
      appliedActionId: appliedAction?.id,
      summaryMetrics: {
        delayedCount: currentResult.metrics.delayedCount,
        cancelledCount: currentResult.metrics.cancelledCount,
        totalDelayMinutes: currentResult.metrics.totalDelayMinutes,
        strandedPax: currentResult.metrics.strandedPax.total,
        crewBreaches: currentResult.metrics.crewBreachesCount,
      },
    };

    saveToStorage([newEntry, ...savedList]);
    setNewScenarioName('');
  };

  const handleDelete = (id: string) => {
    saveToStorage(savedList.filter((s) => s.id !== id));
    if (compareAId === id) setCompareAId(null);
    if (compareBId === id) setCompareBId(null);
  };

  const handleRename = (id: string) => {
    if (!editingName.trim()) return;
    saveToStorage(
      savedList.map((s) => (s.id === id ? { ...s, name: editingName.trim() } : s))
    );
    setEditingId(null);
    setEditingName('');
  };

  const handleExportJSON = () => {
    const exportData = {
      scenarioParams: currentResult.params,
      metrics: currentResult.metrics,
      savedScenarios: savedList,
      exportTimestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domino_sky_scenario_${currentResult.params.closedAirport || 'baseline'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const compareA = savedList.find((s) => s.id === compareAId);
  const compareB = savedList.find((s) => s.id === compareBId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1e293b] bg-[#182235]">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Scenario Management &amp; Persistence
              </h2>
              <p className="text-xs text-slate-400">
                Save, restore, compare, and export disruption parameters and recovery interventions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-[#080D18] p-1 rounded-xl border border-[#1e293b] flex text-xs">
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'manage' ? 'bg-[#182235] text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Saved List
              </button>
              <button
                onClick={() => setActiveTab('compare')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeTab === 'compare' ? 'bg-[#182235] text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Compare Scenarios
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-5 text-xs text-slate-200">
          {activeTab === 'manage' ? (
            <>
              {/* Save Current Scenario Bar */}
              <div className="bg-[#080D18] border border-[#1e293b] p-3.5 rounded-xl flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Enter scenario name (e.g., Severe BOM Storm + Spare Swap)..."
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  className="flex-1 w-full bg-[#111827] border border-[#334155] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleSaveCurrent}
                  className="w-full sm:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Current State</span>
                </button>
              </div>

              {/* Saved Scenarios List */}
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-slate-400 font-medium">
                  <span>Saved Scenarios ({savedList.length})</span>
                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export JSON</span>
                  </button>
                </div>

                {savedList.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 border border-dashed border-[#1e293b] rounded-xl">
                    No scenarios saved in browser storage yet. Click &quot;Save Current State&quot; above to snapshot any scenario!
                  </div>
                ) : (
                  savedList.map((scen) => (
                    <div
                      key={scen.id}
                      className="bg-[#080D18] border border-[#1e293b] hover:border-[#334155] p-3.5 rounded-xl flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        {editingId === scen.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="bg-[#111827] border border-cyan-500 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRename(scen.id)}
                              className="p-1 bg-cyan-600 text-white rounded cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">{scen.name}</span>
                            <button
                              onClick={() => {
                                setEditingId(scen.id);
                                setEditingName(scen.name);
                              }}
                              className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                              title="Rename"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-2">
                          <span>Airport: <strong className="text-slate-200">{scen.closedAirport || 'None (Normal)'}</strong></span>
                          {scen.closureStart && (
                            <span>Time: <strong className="text-slate-200 font-mono">{scen.closureStart}–{scen.closureEnd}</strong></span>
                          )}
                          <span>Delays: <strong className="text-amber-400 font-mono">{scen.summaryMetrics.delayedCount}</strong></span>
                          <span>Minutes: <strong className="text-cyan-400 font-mono">{scen.summaryMetrics.totalDelayMinutes}m</strong></span>
                          {scen.summaryMetrics.strandedPax > 0 && (
                            <span>Stranded: <strong className="text-rose-400 font-mono">{scen.summaryMetrics.strandedPax}</strong></span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            onLoadScenario(scen);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 bg-[#182235] hover:bg-cyan-950/80 border border-[#334155] text-cyan-300 font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDelete(scen.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete scenario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* Compare Tab */
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-400">
                Select two saved scenarios to compare their delay impact, stranded passengers, and operational recovery deltas side-by-side.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Scenario A</label>
                  <select
                    value={compareAId || ''}
                    onChange={(e) => setCompareAId(e.target.value || null)}
                    className="w-full bg-[#080D18] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">Select Scenario A...</option>
                    {savedList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Scenario B</label>
                  <select
                    value={compareBId || ''}
                    onChange={(e) => setCompareBId(e.target.value || null)}
                    className="w-full bg-[#080D18] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">Select Scenario B...</option>
                    {savedList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {compareA && compareB ? (
                <div className="bg-[#080D18] border border-[#1e293b] rounded-xl overflow-hidden mt-2">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-[#182235] text-slate-400 border-b border-[#1e293b]">
                        <th className="p-3">Metric</th>
                        <th className="p-3 text-cyan-300 font-bold">{compareA.name}</th>
                        <th className="p-3 text-amber-300 font-bold">{compareB.name}</th>
                        <th className="p-3 text-right">Delta (B vs A)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]">
                      <tr>
                        <td className="p-3 text-slate-400">Closed Airport</td>
                        <td className="p-3 font-mono font-bold text-white">{compareA.closedAirport || 'None'}</td>
                        <td className="p-3 font-mono font-bold text-white">{compareB.closedAirport || 'None'}</td>
                        <td className="p-3 text-right text-slate-500">—</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-slate-400">Total Delayed Flights</td>
                        <td className="p-3 font-mono text-white">{compareA.summaryMetrics.delayedCount}</td>
                        <td className="p-3 font-mono text-white">{compareB.summaryMetrics.delayedCount}</td>
                        <td className="p-3 text-right font-mono font-bold">
                          {compareB.summaryMetrics.delayedCount - compareA.summaryMetrics.delayedCount > 0 ? (
                            <span className="text-rose-400">+{compareB.summaryMetrics.delayedCount - compareA.summaryMetrics.delayedCount}</span>
                          ) : (
                            <span className="text-emerald-400">{compareB.summaryMetrics.delayedCount - compareA.summaryMetrics.delayedCount}</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-slate-400">Cumulative Delay Mins</td>
                        <td className="p-3 font-mono text-white">{compareA.summaryMetrics.totalDelayMinutes}m</td>
                        <td className="p-3 font-mono text-white">{compareB.summaryMetrics.totalDelayMinutes}m</td>
                        <td className="p-3 text-right font-mono font-bold">
                          {compareB.summaryMetrics.totalDelayMinutes - compareA.summaryMetrics.totalDelayMinutes > 0 ? (
                            <span className="text-rose-400">+{compareB.summaryMetrics.totalDelayMinutes - compareA.summaryMetrics.totalDelayMinutes}m</span>
                          ) : (
                            <span className="text-emerald-400">{compareB.summaryMetrics.totalDelayMinutes - compareA.summaryMetrics.totalDelayMinutes}m</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-slate-400">Stranded Passengers</td>
                        <td className="p-3 font-mono text-white">{compareA.summaryMetrics.strandedPax}</td>
                        <td className="p-3 font-mono text-white">{compareB.summaryMetrics.strandedPax}</td>
                        <td className="p-3 text-right font-mono font-bold">
                          {compareB.summaryMetrics.strandedPax - compareA.summaryMetrics.strandedPax > 0 ? (
                            <span className="text-rose-400">+{compareB.summaryMetrics.strandedPax - compareA.summaryMetrics.strandedPax}</span>
                          ) : (
                            <span className="text-emerald-400">{compareB.summaryMetrics.strandedPax - compareA.summaryMetrics.strandedPax}</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 text-slate-400">Crew Duty Breaches</td>
                        <td className="p-3 font-mono text-white">{compareA.summaryMetrics.crewBreaches}</td>
                        <td className="p-3 font-mono text-white">{compareB.summaryMetrics.crewBreaches}</td>
                        <td className="p-3 text-right font-mono font-bold">
                          {compareB.summaryMetrics.crewBreaches - compareA.summaryMetrics.crewBreaches > 0 ? (
                            <span className="text-rose-400">+{compareB.summaryMetrics.crewBreaches - compareA.summaryMetrics.crewBreaches}</span>
                          ) : (
                            <span className="text-emerald-400">{compareB.summaryMetrics.crewBreaches - compareA.summaryMetrics.crewBreaches}</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 border border-dashed border-[#1e293b] rounded-xl">
                  Please select both Scenario A and Scenario B from the dropdowns above to display side-by-side comparison metrics.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

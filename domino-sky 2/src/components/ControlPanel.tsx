/**
 * DOMINO SKY - Simulation Control Panel
 * Disruption parameters, airport selector, closure window, and one-click real-world presets.
 */

import React, { useState } from 'react';
import { Airport } from '../data/loader';
import { DISRUPTION_PRESETS, DisruptionPreset } from '../config/constants';
import { Play, RotateCcw, AlertTriangle, CloudLightning, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface ControlPanelProps {
  airports: Airport[];
  selectedAirport: string;
  startTime: string;
  endTime: string;
  onChangeAirport: (id: string) => void;
  onChangeStartTime: (t: string) => void;
  onChangeEndTime: (t: string) => void;
  onRunSimulation: () => void;
  onReset: () => void;
  isLoading: boolean;
  activePresetId: string | null;
  onSelectPreset: (preset: DisruptionPreset) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  airports,
  selectedAirport,
  startTime,
  endTime,
  onChangeAirport,
  onChangeStartTime,
  onChangeEndTime,
  onRunSimulation,
  onReset,
  isLoading,
  activePresetId,
  onSelectPreset,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Group airports by tier
  const megaHubs = airports.filter((a) => a.tier === 'mega_hub');
  const regionalHubs = airports.filter((a) => a.tier === 'regional_hub');
  const spokes = airports.filter((a) => a.tier === 'spoke');

  const handleRun = () => {
    if (startTime >= endTime) {
      setErrorMsg('Reopening time must be after closure start time.');
      return;
    }
    setErrorMsg(null);
    onRunSimulation();
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 flex flex-col gap-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <CloudLightning className="w-4 h-4 text-amber-400" />
            Disruption Controls
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Simulate an airport closure to watch cascading delays propagate.
          </p>
        </div>

        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800/80 transition-colors"
          title="Reset to normal schedule"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Real-World Presets */}
      <div>
        <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 mb-2 flex items-center justify-between">
          <span>Preset Scenarios</span>
          <span className="text-[10px] text-amber-400 font-normal">One-click test cases</span>
        </label>
        <div className="grid grid-cols-1 gap-2">
          {DISRUPTION_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start justify-between gap-2 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/40 text-slate-100 ring-1 ring-amber-500/30'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>{preset.title}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                        preset.tag === 'Severe'
                          ? 'bg-rose-500/20 text-rose-300'
                          : preset.tag === 'Moderate'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {preset.tag}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{preset.subtitle}</div>
                </div>

                {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Configuration */}
      <div className="space-y-3.5 pt-2 border-t border-slate-800/80">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Select Airport to Close
          </label>
          <select
            value={selectedAirport}
            onChange={(e) => onChangeAirport(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <optgroup label="Mega Hubs (Tier 1)">
              {megaHubs.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} — {a.city} ({a.name})
                </option>
              ))}
            </optgroup>
            <optgroup label="Regional Hubs (Tier 2)">
              {regionalHubs.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} — {a.city} ({a.name})
                </option>
              ))}
            </optgroup>
            <optgroup label="Spokes (Tier 3)">
              {spokes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} — {a.city} ({a.name})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Time Window */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Closure Start (IST)
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => onChangeStartTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Reopening Time (IST)
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => onChangeEndTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={handleRun}
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 transition-all shadow-md hover:shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            <span>Simulating Network Ripple...</span>
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Propagation Simulation</span>
          </>
        )}
      </button>
    </div>
  );
};

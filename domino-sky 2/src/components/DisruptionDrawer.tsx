/**
 * DOMINO SKY - Disruption Control Panel & Drawer (Dark Ops Theme)
 * Configure airport ground stops, select duration presets (30m, 60m, 90m, 120m, 180m, custom),
 * and trigger deterministic network simulation.
 */

import React, { useState } from 'react';
import { Airport, parseHHMMToMinutes, formatMinutesToHHMM } from '../data/loader';
import { DISRUPTION_PRESETS, DisruptionPreset } from '../config/constants';
import { X, Play, RotateCcw, AlertTriangle, CloudLightning, Clock, CheckCircle2 } from 'lucide-react';

interface DisruptionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
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

export const DisruptionDrawer: React.FC<DisruptionDrawerProps> = ({
  isOpen,
  onClose,
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
  if (!isOpen) return null;

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const megaHubs = airports.filter((a) => a.tier === 'mega_hub');
  const regionalHubs = airports.filter((a) => a.tier === 'regional_hub');
  const spokes = airports.filter((a) => a.tier === 'spoke');

  // Compute duration in minutes
  let currentDurationMins = 0;
  try {
    const s = parseHHMMToMinutes(startTime);
    const e = parseHHMMToMinutes(endTime);
    if (e > s) currentDurationMins = e - s;
  } catch {
    currentDurationMins = 0;
  }

  const handleApplyDuration = (durMins: number) => {
    try {
      const s = parseHHMMToMinutes(startTime);
      const newEnd = formatMinutesToHHMM(s + durMins);
      onChangeEndTime(newEnd);
      setErrorMsg(null);
    } catch {
      setErrorMsg('Invalid start time.');
    }
  };

  const handleRun = () => {
    if (startTime >= endTime) {
      setErrorMsg('Reopening time must be strictly after closure start time.');
      return;
    }
    setErrorMsg(null);
    onRunSimulation();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
      <div className="w-full sm:w-[460px] bg-[#111827] h-full p-6 shadow-2xl flex flex-col gap-5 overflow-y-auto border-l border-[#1e293b] animate-in slide-in-from-right duration-200 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-950/60 rounded-xl text-amber-400 border border-amber-800">
              <CloudLightning className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Disruption Simulation Parameters
              </h2>
              <p className="text-xs text-slate-400">
                Configure airport closure time window &amp; test cascading propagation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#182235] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Airport Picker */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-white">
            Target Airport to Close
          </label>
          <select
            value={selectedAirport}
            onChange={(e) => onChangeAirport(e.target.value)}
            className="w-full bg-[#080D18] border border-[#334155] rounded-xl px-3 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <optgroup label="Mega Hubs (Tier 1)" className="bg-[#111827] text-cyan-300 font-bold">
              {megaHubs.map((a) => (
                <option key={a.id} value={a.id} className="text-white">
                  {a.id} — {a.city} ({a.name}) [Cap: {a.capacity_per_hour}/hr]
                </option>
              ))}
            </optgroup>
            <optgroup label="Regional Hubs (Tier 2)" className="bg-[#111827] text-cyan-300 font-bold">
              {regionalHubs.map((a) => (
                <option key={a.id} value={a.id} className="text-white">
                  {a.id} — {a.city} ({a.name}) [Cap: {a.capacity_per_hour}/hr]
                </option>
              ))}
            </optgroup>
            <optgroup label="Spoke Airports (Tier 3)" className="bg-[#111827] text-cyan-300 font-bold">
              {spokes.map((a) => (
                <option key={a.id} value={a.id} className="text-white">
                  {a.id} — {a.city} ({a.name}) [Cap: {a.capacity_per_hour}/hr]
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Time Window Inputs */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-white">
            Closure Time Window (IST)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Closure Starts</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => onChangeStartTime(e.target.value)}
                className="w-full bg-[#080D18] border border-[#334155] rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Reopening Time</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => onChangeEndTime(e.target.value)}
                className="w-full bg-[#080D18] border border-[#334155] rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Quick Duration Buttons (Section 6 requirement: 30m, 60m, 90m, 120m, 180m) */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-white">Closure Duration Presets</span>
            <span className="text-[11px] text-cyan-400 font-mono">
              Current: {currentDurationMins} minutes
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {[30, 60, 90, 120, 180].map((dur) => (
              <button
                key={dur}
                onClick={() => handleApplyDuration(dur)}
                className={`py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  currentDurationMins === dur
                    ? 'bg-cyan-600 text-white font-bold border border-cyan-400'
                    : 'bg-[#080D18] text-slate-300 hover:text-white hover:bg-[#182235] border border-[#1e293b]'
                }`}
              >
                {dur}m
              </button>
            ))}
          </div>
        </div>

        {/* Pre-Built Realistic Disruption Presets */}
        <div className="space-y-2 pt-2 border-t border-[#1e293b]">
          <span className="block text-xs font-bold text-white">
            Pre-Built Real World Scenarios
          </span>
          <div className="flex flex-col gap-2">
            {DISRUPTION_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => onSelectPreset(preset)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-600 shadow-md'
                      : 'bg-[#080D18] border-[#1e293b] hover:border-[#334155]'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-white mb-0.5">
                    <span>{preset.title}</span>
                    <span className="font-mono text-amber-400 text-[11px]">
                      {preset.startTime}–{preset.endTime}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {preset.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto pt-4 border-t border-[#1e293b] flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Simulate Disruption</span>
          </button>

          <button
            onClick={() => {
              onReset();
              onClose();
            }}
            className="p-2.5 rounded-xl border border-[#334155] bg-[#080D18] hover:bg-[#182235] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Reset to Baseline Clear Skies"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

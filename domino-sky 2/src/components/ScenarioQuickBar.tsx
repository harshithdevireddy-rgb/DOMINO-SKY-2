/**
 * DOMINO SKY - Scenario Quick Bar (Dark Ops Theme)
 * One-click disruption presets, active status pill, and customizer trigger.
 */

import React from 'react';
import { DISRUPTION_PRESETS, DisruptionPreset } from '../config/constants';
import { SlidersHorizontal, Sun, Check, CloudLightning } from 'lucide-react';

interface ScenarioQuickBarProps {
  activePresetId: string | null;
  onSelectPreset: (preset: DisruptionPreset) => void;
  onResetToNormal: () => void;
  onOpenCustomizer: () => void;
  currentClosureText: string;
}

export const ScenarioQuickBar: React.FC<ScenarioQuickBarProps> = ({
  activePresetId,
  onSelectPreset,
  onResetToNormal,
  onOpenCustomizer,
  currentClosureText,
}) => {
  return (
    <div className="w-full bg-[#111827] border border-[#1e293b] rounded-2xl p-3.5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 text-slate-100">
      {/* Current operational briefing */}
      <div className="flex items-center gap-2.5 text-xs">
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="font-semibold text-slate-400">Simulation Scenario:</span>
        <span className="font-medium text-white bg-[#080D18] px-3 py-1 rounded-xl border border-[#1e293b] font-mono text-[11px]">
          {currentClosureText}
        </span>
      </div>

      {/* Preset Pills */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0">
        {DISRUPTION_PRESETS.map((preset) => {
          const isSelected = activePresetId === preset.id;

          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-amber-950/80 text-amber-200 border border-amber-600 font-bold shadow-md'
                  : 'bg-[#182235] text-slate-300 hover:text-white hover:bg-[#1e293b] border border-[#334155]'
              }`}
            >
              <CloudLightning className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{preset.title.split(' ')[0]} {preset.title.split(' ')[1]}</span>
              <span className="text-[10px] text-slate-400 font-mono">({preset.startTime}–{preset.endTime})</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
            </button>
          );
        })}

        {/* Clear Skies button */}
        <button
          onClick={onResetToNormal}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activePresetId === null && currentClosureText.includes('Normal')
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600 font-bold'
              : 'bg-[#182235] text-slate-300 hover:text-white hover:bg-[#1e293b] border border-[#334155]'
          }`}
          title="Reset to scheduled baseline operations"
        >
          <Sun className="w-3.5 h-3.5 text-emerald-400" />
          <span>Clear Skies</span>
        </button>

        {/* Custom Settings button */}
        <button
          onClick={onOpenCustomizer}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-800 transition-all flex items-center gap-1.5 cursor-pointer"
          title="Select any airport and duration"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Custom Disruption...</span>
        </button>
      </div>
    </div>
  );
};

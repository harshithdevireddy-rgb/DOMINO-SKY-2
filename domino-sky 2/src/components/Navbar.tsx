/**
 * DOMINO SKY - Operations Control Center Navbar (Dark Theme)
 * Real-time network status indicator, scenario management, and multi-view switcher.
 */

import React from 'react';
import { Plane, Layers, BookOpen, FolderOpen, RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { NetworkDisruptionLevel } from '../engine/types';

interface NavbarProps {
  activeView: 'simulator' | 'before_after';
  onChangeView: (v: 'simulator' | 'before_after') => void;
  onOpenAssumptions: () => void;
  onOpenIntro: () => void;
  onOpenScenarios: () => void;
  hasRecoveryApplied: boolean;
  onReset: () => void;
  networkStatus: NetworkDisruptionLevel;
  totalDelayMinutes: number;
  delayedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onChangeView,
  onOpenAssumptions,
  onOpenIntro,
  onOpenScenarios,
  hasRecoveryApplied,
  onReset,
  networkStatus,
  totalDelayMinutes,
  delayedCount,
}) => {
  return (
    <header className="w-full bg-[#111827]/95 backdrop-blur-md border-b border-[#1e293b] sticky top-0 z-40 px-4 lg:px-8 py-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & System Status */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#182235] border border-[#334155] flex items-center justify-center text-cyan-400 shadow-md">
            <Plane className="w-5 h-5 fill-current rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white tracking-tight text-base font-sans">
                DOMINO SKY
              </span>
              <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded-full font-mono">
                OPS INTELLIGENCE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5 hidden sm:block">
              Airline Disruption Propagation &amp; AI Recovery Simulator
            </p>
          </div>
        </div>

        {/* Dynamic Network Disruption Status Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#080D18] border border-[#1e293b]">
          <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
            networkStatus === 'NORMAL'
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
              : networkStatus === 'MINOR'
              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
              : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
          }`} />
          <span className="text-xs font-mono font-bold text-slate-200">
            {networkStatus === 'NORMAL'
              ? 'NORMAL OPERATIONS'
              : networkStatus === 'MINOR'
              ? `MINOR DISRUPTION (${delayedCount} delayed)`
              : `CRITICAL DISRUPTION (${totalDelayMinutes}m delay)`}
          </span>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-[#080D18] p-1 rounded-xl border border-[#1e293b] text-xs">
          <button
            onClick={() => onChangeView('simulator')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeView === 'simulator'
                ? 'bg-[#182235] text-white font-bold border border-[#334155] shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Operations
          </button>

          {hasRecoveryApplied && (
            <button
              onClick={() => onChangeView('before_after')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'before_after'
                  ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-700 shadow-sm'
                  : 'text-emerald-400 hover:text-emerald-300 font-semibold'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Before / After View</span>
            </button>
          )}
        </div>

        {/* Actions & Modals */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenScenarios}
            className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#182235] hover:bg-[#1e293b] border border-[#334155] transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
            title="Saved Scenarios & Comparison"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Scenarios</span>
          </button>

          <button
            onClick={onOpenIntro}
            className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#182235] hover:bg-[#1e293b] border border-[#334155] transition-colors hidden md:block font-medium cursor-pointer"
          >
            Story Guide
          </button>

          <button
            onClick={onOpenAssumptions}
            className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-[#182235] hover:bg-[#1e293b] border border-[#334155] transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Simulation Rules</span>
          </button>

          <button
            onClick={onReset}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#182235] transition-colors cursor-pointer"
            title="Reset to Scheduled Baseline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

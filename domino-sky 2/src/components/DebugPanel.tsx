/**
 * DOMINO SKY - Diagnostic Debug & Number Guard Audit Panel (Dark Ops Theme)
 * Collapsible inspection tray for raw engine JSON, AI API payloads,
 * and Number Guard verification audits.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Terminal, ShieldAlert, CheckCircle2, Code2 } from 'lucide-react';
import { SimulationResult } from '../engine/types';
import { DispatcherClientResult } from '../api/dispatcherClient';

interface DebugPanelProps {
  simulationResult: SimulationResult;
  dispatcherResult: DispatcherClientResult | null;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  simulationResult,
  dispatcherResult,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'guard' | 'engine' | 'ai_in' | 'ai_out'>('guard');

  const audits = dispatcherResult?.totalAudits || [];

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-2xl overflow-hidden shadow-2xl select-none text-slate-100">
      {/* Header bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#182235]/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-bold">Simulator Diagnostic &amp; Number Guard Audit Trail</span>
          {audits.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded-full text-[10px] font-mono font-bold">
              {audits.length} AI number corrections
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-[11px] font-mono">{isOpen ? 'Hide technical logs' : 'Inspect raw JSON & audits'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-5 border-t border-[#1e293b] flex flex-col gap-3 bg-[#080D18]">
          {/* Tabs */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab('guard')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'guard'
                  ? 'bg-amber-950 text-amber-200 border border-amber-700 shadow-md'
                  : 'bg-[#182235] text-slate-400 hover:text-white border border-[#334155]'
              }`}
            >
              Number Guard Audits ({audits.length})
            </button>
            <button
              onClick={() => setActiveTab('engine')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'engine'
                  ? 'bg-cyan-950 text-cyan-200 border border-cyan-700 shadow-md'
                  : 'bg-[#182235] text-slate-400 hover:text-white border border-[#334155]'
              }`}
            >
              Raw Engine Output
            </button>
            <button
              onClick={() => setActiveTab('ai_in')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'ai_in'
                  ? 'bg-cyan-950 text-cyan-200 border border-cyan-700 shadow-md'
                  : 'bg-[#182235] text-slate-400 hover:text-white border border-[#334155]'
              }`}
            >
              Payload Sent to AI
            </button>
            <button
              onClick={() => setActiveTab('ai_out')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTab === 'ai_out'
                  ? 'bg-cyan-950 text-cyan-200 border border-cyan-700 shadow-md'
                  : 'bg-[#182235] text-slate-400 hover:text-white border border-[#334155]'
              }`}
            >
              Raw AI Response
            </button>
          </div>

          {/* Tab 1: Number Guard */}
          {activeTab === 'guard' && (
            <div className="space-y-2">
              {audits.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    Zero hallucinated numbers detected. All stated operational values matched the simulation ground truth bit-for-bit.
                  </span>
                </div>
              ) : (
                audits.map((a, i) => (
                  <div
                    key={i}
                    className="p-3 bg-[#111827] border border-amber-800/80 rounded-xl text-xs flex flex-col gap-1 font-mono text-amber-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-400">
                        REPLACED: {a.originalValue} → {a.correctedValue}
                      </span>
                      <span className="text-[10px] text-slate-400">{a.field}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-sans">
                      {a.context}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Raw Engine Output */}
          {activeTab === 'engine' && (
            <div className="bg-[#050912] p-4 rounded-xl border border-[#1e293b] font-mono text-[11px] text-slate-300 max-h-96 overflow-y-auto">
              <pre>{JSON.stringify(simulationResult.metrics, null, 2)}</pre>
            </div>
          )}

          {/* Tab 3: Payload Sent to AI */}
          {activeTab === 'ai_in' && (
            <div className="bg-[#050912] p-4 rounded-xl border border-[#1e293b] font-mono text-[11px] text-slate-300 max-h-96 overflow-y-auto">
              <pre>{JSON.stringify(dispatcherResult?.rawPayloadSent || { note: 'No external LLM payload called yet' }, null, 2)}</pre>
            </div>
          )}

          {/* Tab 4: Raw AI Response */}
          {activeTab === 'ai_out' && (
            <div className="bg-[#050912] p-4 rounded-xl border border-[#1e293b] font-mono text-[11px] text-slate-300 max-h-96 overflow-y-auto">
              <pre>{JSON.stringify(dispatcherResult?.rawResponseReceived || { note: 'Operating under deterministic rule-based fallback dispatcher' }, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

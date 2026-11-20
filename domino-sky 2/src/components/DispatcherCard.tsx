/**
 * DOMINO SKY - AI & Rule-Based Dispatcher Panel (Dark Ops Theme)
 * Recommends mathematically verified operational recovery plans.
 * Strictly audited by Number Guard with clear labeling of Rule-Based vs AI modes.
 */

import React from 'react';
import { CandidateAction } from '../engine/recovery';
import { DispatcherClientResult } from '../api/dispatcherClient';
import { ShieldCheck, Sparkles, Check, ArrowRight, UserCheck, AlertCircle, RefreshCw, Cpu, Layers } from 'lucide-react';

interface DispatcherCardProps {
  dispatcherResult: DispatcherClientResult | null;
  isLoading: boolean;
  onConsultDispatcher: () => void;
  onApplyAction: (action: CandidateAction) => void;
  appliedActionId: string | null;
}

export const DispatcherCard: React.FC<DispatcherCardProps> = ({
  dispatcherResult,
  isLoading,
  onConsultDispatcher,
  onApplyAction,
  appliedActionId,
}) => {
  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 flex flex-col gap-5 shadow-2xl text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md font-bold">
            <Cpu className="w-5 h-5 text-cyan-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Operations Recovery Dispatcher
              </h2>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                dispatcherResult?.mode === 'ai_claude'
                  ? 'bg-purple-950 text-purple-300 border-purple-800'
                  : 'bg-cyan-950 text-cyan-300 border-cyan-800'
              }`}>
                {dispatcherResult?.mode === 'ai_claude' ? 'AI DISPATCHER' : 'RULE-BASED DISPATCHER'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluates spare rotations, connection protection, and tactical flight resets against deterministic simulator.
            </p>
          </div>
        </div>

        {/* Audit Certification Badge */}
        <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded-full font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Number Guard: 100% Simulator Verified</span>
        </div>
      </div>

      {/* Initial Empty / CTA State */}
      {!dispatcherResult && !isLoading && (
        <div className="text-center py-10 px-4 bg-[#080D18] rounded-xl border border-[#1e293b] flex flex-col items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center border border-cyan-800">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              Formulate Disruption Mitigation Strategy
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
              The Dispatcher simulates candidate recovery actions — including deploying spare aircraft (VT-DS17 at BLR, VT-DS18 at DEL), holding onward legs to protect connections, or tactical cancellations — and scores each by exact delay and passenger savings.
            </p>
          </div>
          <button
            onClick={onConsultDispatcher}
            className="mt-1 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-all flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-cyan-200" />
            <span>Generate Recovery Recommendations</span>
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 text-center flex flex-col items-center justify-center gap-3 bg-[#080D18] rounded-xl border border-[#1e293b]">
          <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
          <div className="text-sm font-semibold text-white">
            Running candidate recovery simulations in memory...
          </div>
          <div className="text-xs text-slate-400">
            Evaluating spare aircraft availability at BLR/DEL, turnaround buffer slack, and crew duty limits
          </div>
        </div>
      )}

      {/* Result State */}
      {dispatcherResult && !isLoading && (
        <div className="space-y-4">
          {/* Executive Summary Narrative */}
          <div className="bg-[#080D18] p-4 rounded-xl border border-cyan-900/60 text-xs text-slate-200 leading-relaxed">
            <div className="flex items-center justify-between text-[11px] text-cyan-400 uppercase tracking-wider mb-1.5 font-bold font-mono">
              <span>Operational Situation Briefing</span>
              <span className="text-[10px] text-slate-500 lowercase">
                engine: {dispatcherResult.mode === 'ai_claude' ? 'LLM Assisted' : 'Deterministic Rule-Based Fallback'}
              </span>
            </div>
            <p className="text-slate-300">
              {dispatcherResult.summary}
            </p>
          </div>

          {/* Action Cards List */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>Prioritized Candidate Actions ({dispatcherResult.recommendations.length})</span>
              <button
                onClick={onConsultDispatcher}
                className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Re-analyze</span>
              </button>
            </div>

            {dispatcherResult.recommendations.map((rec) => {
              const { action } = rec;
              const isApplied = appliedActionId === action.id;
              const d = action.delta;

              return (
                <div
                  key={action.id}
                  className={`bg-[#080D18] border rounded-xl p-4 flex flex-col gap-3 transition-all ${
                    isApplied
                      ? 'border-emerald-600 bg-emerald-950/20 shadow-lg'
                      : 'border-[#1e293b] hover:border-[#334155]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#182235] text-cyan-400 flex items-center justify-center text-xs font-mono font-bold border border-[#334155]">
                        #{rec.rank}
                      </span>
                      <span className="font-bold text-white text-sm">
                        {action.title}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        action.type === 'SPARE_AIRCRAFT_SWAP'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : action.type === 'CANCEL_FLIGHT'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {action.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      {d.delayMinutesSaved > 0 && (
                        <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                          +{d.delayMinutesSaved}m saved
                        </span>
                      )}
                      {d.strandedPaxSaved > 0 && (
                        <span className="text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800 font-bold">
                          +{d.strandedPaxSaved} pax protected
                        </span>
                      )}
                      {d.crewBreachesSaved > 0 && (
                        <span className="text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800 font-bold">
                          +{d.crewBreachesSaved} crew restored
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Recommendation Text (Audited by Number Guard) */}
                  <p className="text-xs text-slate-300 leading-relaxed pl-7">
                    {rec.explanation}
                  </p>

                  {/* Operational Assumptions */}
                  {action.assumptions.length > 0 && (
                    <div className="pl-7 text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                      {action.assumptions.map((ass, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-cyan-500" />
                          <span>{ass}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Execution Footer */}
                  <div className="pl-7 pt-2 flex items-center justify-between border-t border-[#1e293b]">
                    <div className="text-[11px] text-slate-400">
                      Metrics after recovery:{' '}
                      <strong className="text-white font-mono">{action.metricsAfter.delayedCount} delayed</strong>,{' '}
                      <strong className="text-white font-mono">{action.metricsAfter.totalDelayMinutes}m total</strong>,{' '}
                      <strong className="text-white font-mono">{action.metricsAfter.strandedPax} stranded</strong>
                    </div>

                    {isApplied ? (
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-950 border border-emerald-700 flex items-center gap-1.5 font-mono">
                        <Check className="w-3.5 h-3.5" />
                        <span>ACTIVE PLAN</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => onApplyAction(action)}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <span>Apply &amp; Re-Simulate</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

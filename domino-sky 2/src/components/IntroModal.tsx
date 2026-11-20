/**
 * DOMINO SKY - Operational Overview & Story Guide Modal (Dark Ops Theme)
 * Real-world explanation of the aviation domino effect.
 */

import React from 'react';
import { CloudLightning, ArrowRight, ShieldCheck, Sparkles, Plane, X } from 'lucide-react';

interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo: () => void;
}

export const IntroModal: React.FC<IntroModalProps> = ({
  isOpen,
  onClose,
  onStartDemo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#111827] border border-[#1e293b] rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-150 relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#182235] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero badge */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-950/60 rounded-2xl border border-amber-800 text-amber-400 shadow-md">
            <CloudLightning className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Welcome to Domino Sky
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Airline Disruption Propagation &amp; Intelligence Simulator
            </p>
          </div>
        </div>

        {/* Narrative Paragraph */}
        <div className="bg-[#080D18] border border-[#1e293b] rounded-2xl p-4 sm:p-5 text-xs text-slate-300 leading-relaxed space-y-3">
          <p>
            A <strong className="text-amber-400">90-minute thunderstorm in Mumbai</strong> can delay or cancel a flight from <strong className="text-white">Bengaluru to Kolkata</strong> five hours later.
          </p>
          <p>
            Because each aircraft flies a tight sequential chain of 4–5 legs throughout the day, holding one aircraft cascades delays across clear-weather cities, breaks passenger connections, and pushes flight crews past legal duty limits.
          </p>
          <p className="text-cyan-300 font-medium bg-cyan-950/40 p-3 rounded-xl border border-cyan-800/80">
            Domino Sky lets you close any Indian airport for a chosen window, trace why each flight is delayed, identify stranded passengers, and apply AI recovery interventions.
          </p>
        </div>

        {/* Golden Rule Guarantee */}
        <div className="flex items-center gap-3 p-3.5 bg-emerald-950/50 border border-emerald-800 rounded-2xl text-xs text-emerald-200 font-medium">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            <strong>Deterministic Principle:</strong> 100% of flight delays, passenger numbers, and crew duty limits are computed by our deterministic engine. Zero AI hallucination.
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onStartDemo}
            className="flex-1 py-3 px-5 rounded-2xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <span>Simulate Mumbai Monsoon Disruption</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white bg-[#182235] hover:bg-[#1e293b] border border-[#334155] transition-colors cursor-pointer"
          >
            Explore System
          </button>
        </div>
      </div>
    </div>
  );
};

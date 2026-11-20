/**
 * DOMINO SKY - Operational Rules & Simulation Logic Modal (Dark Ops Theme)
 * Transparent documentation of timing model, turnaround rules, airport closures,
 * crew duty limitations, passenger strandedness accounting, and Number Guard verification.
 */

import React from 'react';
import { X, BookOpen, ShieldCheck, Clock, CheckCircle2, AlertTriangle, Layers, Scale } from 'lucide-react';
import { SIMULATION_CONFIG } from '../config/constants';

interface AssumptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssumptionsModal: React.FC<AssumptionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#111827] border border-[#1e293b] rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-150 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#182235] rounded-2xl border border-[#334155] text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Simulation Engine Rules &amp; Mathematical Logic
              </h2>
              <p className="text-xs text-slate-400">
                Aviation operational constraints, timing model, and safety verification architecture.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#182235] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: The Golden Rule */}
        <div className="bg-emerald-950/40 border border-emerald-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm mb-1.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Core Principle: 100% Deterministic Engine</span>
          </div>
          <p className="text-xs text-emerald-100/90 leading-relaxed">
            All flight delays, rotational domino propagation, passenger counts, and crew duty limits are computed by a pure, deterministic TypeScript module with <strong>zero randomness</strong> and <strong>no AI calculations</strong>. The AI Dispatcher interprets bottlenecks and recommends from a fixed menu of scored actions. Every number stated by the AI is audited by the <strong>Number Guard</strong> before being presented.
          </p>
        </div>

        {/* Section 2: Airport Closure Semantics */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
            1. Airport Closure Semantics
          </h3>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>
              <strong>Closure Window:</strong> An airport is closed for departures and arrivals during <code className="text-cyan-300 bg-[#080D18] px-1.5 py-0.5 rounded font-mono border border-[#1e293b]">[start, end)</code> IST.
            </li>
            <li>
              <strong>Departing Flights:</strong> Any flight attempting to depart during the closure is held on the ground until reopening time.
            </li>
            <li>
              <strong>Arriving Flights:</strong> Any flight whose arrival would fall inside the closure window is held at its origin airport so that it lands safely at reopening time.
            </li>
          </ul>
        </div>

        {/* Section 3: Aircraft Turnaround & Slack Absorption */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
            2. Turnaround Buffer &amp; Slack Absorption
          </h3>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>
              <strong>Minimum Turnaround:</strong> An aircraft requires at least <strong>{SIMULATION_CONFIG.MIN_TURNAROUND_MINUTES} minutes</strong> on the ground between landing and next departure for deplaning, cleaning, fueling, and boarding.
            </li>
            <li>
              <strong>Slack Absorption:</strong> When an aircraft has more than 30 minutes scheduled between flights (e.g. 70 min turnaround), the difference is schedule buffer. Downstream delay shrinks as buffer absorbs earlier lateness, causing the domino effect to naturally dissipate.
            </li>
          </ul>
        </div>

        {/* Section 4: Crew Legal Duty Limits */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
            3. Crew Legal Duty Limitations (DGCA FDTL)
          </h3>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>
              <strong>Maximum Duty Limit:</strong> A crew may work at most <strong>{SIMULATION_CONFIG.MAX_CREW_DUTY_MINS} minutes (10 hours)</strong> from duty report until actual arrival of their last flight.
            </li>
            <li>
              <strong>Warning Threshold:</strong> Roster status turns amber once duty used reaches <strong>{SIMULATION_CONFIG.CREW_DUTY_WARNING_THRESHOLD_MINS} minutes (9 hours)</strong>.
            </li>
            <li>
              <strong>Breach Tracking:</strong> Any delay pushing the final leg past 600 minutes triggers a legal duty breach, flagging the crew as illegal and identifying the breached flight leg.
            </li>
          </ul>
        </div>

        {/* Section 5: Passenger Strandedness Accounting */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
            4. Passenger Strandedness &amp; Double-Counting Prevention
          </h3>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>
              <strong>Connections:</strong> A passenger connection is broken when actual departure of the connecting flight minus actual arrival of the inbound flight is less than <code className="text-cyan-300 font-mono">min_connect_minutes</code> (40 or 45 mins).
            </li>
            <li>
              <strong>Stranded Accounting:</strong> Total stranded passengers equals passengers on cancelled flights plus passengers who missed their connecting leg. Passengers on cancelled connecting flights are not counted twice.
            </li>
          </ul>
        </div>

        {/* Section 6: Spare Aircraft Operations */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
            5. Spare Aircraft Feasibility
          </h3>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>
              <strong>Bases:</strong> Spare aircraft <code className="text-white font-mono">VT-DS17</code> is stationed at <strong className="text-white">BLR</strong>, and <code className="text-white font-mono">VT-DS18</code> is stationed at <strong className="text-white">DEL</strong>.
            </li>
            <li>
              <strong>Feasibility:</strong> A spare can only be deployed to replace an aircraft that is physically at its base airport. Swapping in a spare resets downstream rotational delays to zero and assigns fresh flight crews.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

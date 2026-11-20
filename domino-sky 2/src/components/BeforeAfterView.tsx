/**
 * DOMINO SKY - Before vs After Recovery Comparison View (Dark Ops Theme)
 * Mathematically compares the disrupted network state with the post-intervention recovered state.
 * Displays absolute improvements, percentage improvements with div-by-zero guards,
 * and highlights operational trade-offs (e.g. intentional cancellation).
 */

import React, { useState } from 'react';
import { SimulationResult } from '../engine/types';
import { Airport } from '../data/loader';
import { CandidateAction } from '../engine/recovery';
import { NetworkMap } from './NetworkMap';
import { AircraftTimeline } from './AircraftTimeline';
import { ArrowRight, CheckCircle2, TrendingDown, Users, ShieldCheck, Clock, Plane, AlertTriangle } from 'lucide-react';

interface BeforeAfterViewProps {
  beforeResult: SimulationResult;
  afterResult: SimulationResult;
  appliedAction: CandidateAction | null;
  airports: Airport[];
  onSelectFlight: (id: string) => void;
  selectedFlightId: string | null;
  onClose: () => void;
}

export const BeforeAfterView: React.FC<BeforeAfterViewProps> = ({
  beforeResult,
  afterResult,
  appliedAction,
  airports,
  onSelectFlight,
  selectedFlightId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'map' | 'timeline' | 'table'>('map');

  const beforeMetrics = beforeResult.metrics;
  const afterMetrics = afterResult.metrics;

  const delayDelta = beforeMetrics.totalDelayMinutes - afterMetrics.totalDelayMinutes;
  const paxDelta = beforeMetrics.strandedPax.total - afterMetrics.strandedPax.total;
  const breachesDelta = beforeMetrics.crewBreachesCount - afterMetrics.crewBreachesCount;
  const delayedFlightsDelta = beforeMetrics.delayedCount - afterMetrics.delayedCount;
  const cancelledDelta = afterMetrics.cancelledCount - beforeMetrics.cancelledCount;

  // Percentage calculations with zero-division guard
  const delayPctSaved = beforeMetrics.totalDelayMinutes > 0
    ? Math.round((delayDelta / beforeMetrics.totalDelayMinutes) * 100)
    : 0;

  const paxPctSaved = beforeMetrics.strandedPax.total > 0
    ? Math.round((paxDelta / beforeMetrics.strandedPax.total) * 100)
    : 0;

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 flex flex-col gap-6 text-slate-100 shadow-2xl">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
              RECOVERY PLAN SIMULATED
            </span>
            <span className="text-xs text-slate-400">
              Intervention: <strong className="text-white">{appliedAction?.title || 'Applied Action'}</strong>
            </span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            Before vs After Network Recovery Comparison
          </h2>
          <p className="text-xs text-slate-400">
            Side-by-side simulation proof validating delay savings, preserved passenger itineraries, and restored crew legality.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-[#080D18] p-1 rounded-xl border border-[#1e293b] flex items-center text-xs">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-[#182235] text-cyan-300 font-bold border border-[#334155]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Side-by-Side Map
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-[#182235] text-cyan-300 font-bold border border-[#334155]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Timeline Comparison
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors cursor-pointer shadow-md"
          >
            Return to Simulator
          </button>
        </div>
      </div>

      {/* Deltas Scorecard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Delay Minutes Saved */}
        <div className="bg-[#080D18] border border-emerald-900/60 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Delay Recovered</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
              +{delayDelta}
            </span>
            <span className="text-xs text-slate-400 ml-1">mins</span>
          </div>
          <div className="text-[11px] text-emerald-300 font-mono font-medium">
            {delayPctSaved > 0 ? `${delayPctSaved}% overall delay reduction` : 'No delay increase'}
          </div>
        </div>

        {/* Stranded Pax Protected */}
        <div className="bg-[#080D18] border border-cyan-900/60 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Passengers Protected</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-cyan-400 font-mono tracking-tight">
              {paxDelta > 0 ? `+${paxDelta}` : paxDelta}
            </span>
            <span className="text-xs text-slate-400 ml-1">pax</span>
          </div>
          <div className="text-[11px] text-cyan-300 font-mono font-medium">
            {beforeMetrics.strandedPax.total} → {afterMetrics.strandedPax.total} stranded
          </div>
        </div>

        {/* Crew Duty Breaches Restored */}
        <div className="bg-[#080D18] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Crew Breaches Relieved</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-indigo-300 font-mono tracking-tight">
              {breachesDelta > 0 ? `+${breachesDelta}` : breachesDelta}
            </span>
            <span className="text-xs text-slate-400 ml-1">crews</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {beforeMetrics.crewBreachesCount} breaches → {afterMetrics.crewBreachesCount} breaches
          </div>
        </div>

        {/* Delayed Flights Resolved / Cancelled Flights */}
        <div className="bg-[#080D18] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Delayed Flights</span>
            <Plane className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-amber-400 font-mono tracking-tight">
              {delayedFlightsDelta > 0 ? `+${delayedFlightsDelta}` : delayedFlightsDelta}
            </span>
            <span className="text-xs text-slate-400 ml-1">resolved</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {cancelledDelta > 0 ? (
              <span className="text-rose-400">+{cancelledDelta} tactical cancellation</span>
            ) : (
              <span>{afterMetrics.delayedCount} remaining delayed</span>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Side-by-Side Comparison Table */}
      <div className="border border-[#1e293b] rounded-xl overflow-hidden bg-[#080D18]">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-[#182235] text-slate-400 border-b border-[#1e293b]">
              <th className="p-3 font-semibold">Operational Indicator</th>
              <th className="p-3 text-rose-300 font-bold font-mono">BEFORE RECOVERY (DISRUPTED)</th>
              <th className="p-3 text-cyan-300 font-bold font-mono">AFTER RECOVERY (MITIGATED)</th>
              <th className="p-3 text-right font-semibold">NET RECOVERY DELTA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]">
            <tr>
              <td className="p-3 text-slate-300 font-medium">Cumulative Network Delay</td>
              <td className="p-3 font-mono text-rose-400 font-bold">{beforeMetrics.totalDelayMinutes} mins</td>
              <td className="p-3 font-mono text-cyan-400 font-bold">{afterMetrics.totalDelayMinutes} mins</td>
              <td className="p-3 text-right font-mono font-bold text-emerald-400">
                -{delayDelta} mins ({delayPctSaved}% saved)
              </td>
            </tr>
            <tr>
              <td className="p-3 text-slate-300 font-medium">Delayed Flights Count</td>
              <td className="p-3 font-mono text-white">{beforeMetrics.delayedCount} flights</td>
              <td className="p-3 font-mono text-white">{afterMetrics.delayedCount} flights</td>
              <td className="p-3 text-right font-mono font-bold text-emerald-400">
                -{delayedFlightsDelta} flights
              </td>
            </tr>
            <tr>
              <td className="p-3 text-slate-300 font-medium">Stranded Passengers (Total)</td>
              <td className="p-3 font-mono text-rose-400 font-bold">{beforeMetrics.strandedPax.total} pax</td>
              <td className="p-3 font-mono text-cyan-400 font-bold">{afterMetrics.strandedPax.total} pax</td>
              <td className="p-3 text-right font-mono font-bold text-emerald-400">
                -{paxDelta} pax protected
              </td>
            </tr>
            <tr>
              <td className="p-3 text-slate-300 font-medium">Missed Passenger Connections</td>
              <td className="p-3 font-mono text-white">
                {beforeMetrics.strandedPax.brokenConnections.length} broken ({beforeMetrics.strandedPax.byReason.missedConnections} pax)
              </td>
              <td className="p-3 font-mono text-white">
                {afterMetrics.strandedPax.brokenConnections.length} broken ({afterMetrics.strandedPax.byReason.missedConnections} pax)
              </td>
              <td className="p-3 text-right font-mono font-bold text-emerald-400">
                -{beforeMetrics.strandedPax.brokenConnections.length - afterMetrics.strandedPax.brokenConnections.length} broken pairs
              </td>
            </tr>
            <tr>
              <td className="p-3 text-slate-300 font-medium">Crew Duty Limit Breaches</td>
              <td className="p-3 font-mono text-rose-400 font-bold">{beforeMetrics.crewBreachesCount} illegal</td>
              <td className="p-3 font-mono text-emerald-400 font-bold">{afterMetrics.crewBreachesCount} illegal</td>
              <td className="p-3 text-right font-mono font-bold text-emerald-400">
                -{breachesDelta} violations
              </td>
            </tr>
            <tr>
              <td className="p-3 text-slate-300 font-medium">Cancelled Flights</td>
              <td className="p-3 font-mono text-white">{beforeMetrics.cancelledCount} flights</td>
              <td className="p-3 font-mono text-white">{afterMetrics.cancelledCount} flights</td>
              <td className="p-3 text-right font-mono font-bold">
                {cancelledDelta > 0 ? (
                  <span className="text-amber-400">+{cancelledDelta} (tactical trade-off)</span>
                ) : (
                  <span className="text-emerald-400">0</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Interactive Side-by-Side Map or Timeline Visuals */}
      {activeTab === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-300 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900">
              <span>BEFORE: DISRUPTED STATE</span>
              <span>{beforeMetrics.delayedCount} delayed ({beforeMetrics.totalDelayMinutes}m)</span>
            </div>
            <div className="h-[480px]">
              <NetworkMap
                airports={airports}
                flights={beforeResult.flights}
                closedAirportId={beforeResult.params.closedAirport}
                closureStart={beforeResult.params.closureStart}
                closureEnd={beforeResult.params.closureEnd}
                selectedFlightId={selectedFlightId}
                onSelectFlight={onSelectFlight}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300 bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-900">
              <span>AFTER: RECOVERED NETWORK</span>
              <span>{afterMetrics.delayedCount} delayed ({afterMetrics.totalDelayMinutes}m)</span>
            </div>
            <div className="h-[480px]">
              <NetworkMap
                airports={airports}
                flights={afterResult.flights}
                closedAirportId={afterResult.params.closedAirport}
                closureStart={afterResult.params.closureStart}
                closureEnd={afterResult.params.closureEnd}
                selectedFlightId={selectedFlightId}
                onSelectFlight={onSelectFlight}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono font-bold text-rose-300">BEFORE RECOVERY (ORIGINAL TIMELINE):</span>
            <AircraftTimeline
              timelines={beforeResult.timelines}
              selectedFlightId={selectedFlightId}
              onSelectFlight={onSelectFlight}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono font-bold text-cyan-300">AFTER RECOVERY (OPTIMIZED ROTATIONS):</span>
            <AircraftTimeline
              timelines={afterResult.timelines}
              selectedFlightId={selectedFlightId}
              onSelectFlight={onSelectFlight}
            />
          </div>
        </div>
      )}
    </div>
  );
};

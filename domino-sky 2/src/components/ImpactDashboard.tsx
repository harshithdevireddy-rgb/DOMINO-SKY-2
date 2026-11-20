/**
 * DOMINO SKY - Impact Dashboard (Dark Ops Center Theme)
 * Real-time operational metrics, passenger strandedness breakdown,
 * and crew legal duty risk meter with dark aviation aesthetics.
 */

import React, { useState } from 'react';
import { SimulationResult } from '../engine/types';
import { Clock, Users, ShieldAlert, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Plane, Info, ShieldCheck } from 'lucide-react';

interface ImpactDashboardProps {
  result: SimulationResult;
  onOpenAssumptions: () => void;
  onSelectFlight?: (flightId: string) => void;
}

export const ImpactDashboard: React.FC<ImpactDashboardProps> = ({
  result,
  onOpenAssumptions,
  onSelectFlight,
}) => {
  const { metrics, params, crews, connections } = result;
  const [showPaxBreakdown, setShowPaxBreakdown] = useState(true);
  const [showCrewList, setShowCrewList] = useState(false);

  const isDisrupted = metrics.delayedCount > 0 || metrics.cancelledCount > 0 || metrics.strandedPax.total > 0;
  const sortedCrews = Object.values(crews).sort((a, b) => b.dutyUsedMinutes - a.dutyUsedMinutes);

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 flex flex-col gap-6 text-slate-100 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e293b] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isDisrupted ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            Operations Overview &amp; Impact Accounting
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isDisrupted
              ? `Operational impact of ${params.closedAirport || 'airport'} ground stop closure.`
              : 'Network running on scheduled baseline.'}
          </p>
        </div>

        <button
          onClick={onOpenAssumptions}
          className="self-start sm:self-auto text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium hover:underline cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Rules &amp; Assumptions</span>
        </button>
      </div>

      {/* Operational Narrative Briefing */}
      <div
        className={`p-4 rounded-xl text-xs leading-relaxed border ${
          isDisrupted
            ? 'bg-amber-950/30 border-amber-800/80 text-amber-200'
            : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
        }`}
      >
        {isDisrupted ? (
          <span>
            Holding flights at <strong className="font-semibold text-white">{params.closedAirport}</strong> from{' '}
            <strong className="font-mono font-semibold text-amber-300">{params.closureStart}</strong> to{' '}
            <strong className="font-mono font-semibold text-amber-300">{params.closureEnd} IST</strong> has propagated to{' '}
            <strong className="font-bold text-amber-400">{metrics.delayedCount} delayed flights</strong> ({metrics.onTimeCount} on time) and{' '}
            <strong className="font-bold text-amber-400">{metrics.totalDelayMinutes} minutes</strong> of cumulative delay across{' '}
            <strong className="font-bold text-cyan-300">{metrics.aircraftAffectedCount} aircraft rotations</strong>.
            Currently, <strong className="font-bold text-rose-400">{metrics.strandedPax.total} passengers</strong> are stranded ({metrics.strandedPax.byReason.cancelledFlights} from cancellations, {metrics.strandedPax.byReason.missedConnections} from missed connections), and{' '}
            <strong className={metrics.crewBreachesCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-200 font-medium'}>
              {metrics.crewBreachesCount} crew duty limits
            </strong>{' '}
            have been breached.
          </span>
        ) : (
          <span className="flex items-center gap-2 text-emerald-300 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            Clear skies across all 16 airports: all 70 flights are operating on time, all 21 passenger connections are made, and all 16 crews are legal.
          </span>
        )}
      </div>

      {/* 5 Clean Metric Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Delay */}
        <div className="bg-[#080D18] border border-[#1e293b] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Cumulative Delay</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {metrics.totalDelayMinutes}
            </span>
            <span className="text-xs text-slate-400 ml-1 font-medium">mins</span>
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>Max: <strong className="text-slate-200 font-mono">{metrics.maxDelayMinutes}m</strong></span>
            <span>Avg: <strong className="text-slate-200 font-mono">{metrics.averageDelayMinutes}m</strong></span>
          </div>
        </div>

        {/* Flight Disruption Ratio */}
        <div className="bg-[#080D18] border border-[#1e293b] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Flight Status</span>
            <Plane className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {metrics.delayedCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">of {metrics.totalFlights} delayed</span>
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>On-time: <strong className="text-emerald-400 font-mono">{metrics.onTimeCount}</strong></span>
            <span>Canx: <strong className="text-rose-400 font-mono">{metrics.cancelledCount}</strong></span>
          </div>
        </div>

        {/* Aircraft Rotations Affected */}
        <div className="bg-[#080D18] border border-[#1e293b] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Aircraft Affected</span>
            <Plane className="w-4 h-4 text-indigo-400 rotate-45" />
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {metrics.aircraftAffectedCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">of 16 active</span>
          </div>
          <div className="text-[11px] text-slate-400">
            <span>Spares: <strong className="text-cyan-400 font-mono">2 on standby</strong></span>
          </div>
        </div>

        {/* Stranded Passengers */}
        <div className="bg-[#080D18] border border-[#1e293b] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Stranded Passengers</span>
            <Users className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-1.5">
            <span className="text-2xl font-black text-rose-400 font-mono tracking-tight">
              {metrics.strandedPax.total}
            </span>
            <span className="text-xs text-slate-400 ml-1 font-medium">pax</span>
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>Canx: <strong className="text-slate-200 font-mono">{metrics.strandedPax.byReason.cancelledFlights}</strong></span>
            <span>Missed CX: <strong className="text-slate-200 font-mono">{metrics.strandedPax.byReason.missedConnections}</strong></span>
          </div>
        </div>

        {/* Crew Duty Legal Status */}
        <div className="bg-[#080D18] border border-[#1e293b] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Crew Duty Limits</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className={`text-2xl font-black font-mono tracking-tight ${metrics.crewBreachesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {metrics.crewBreachesCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">breaches</span>
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>Warnings: <strong className="text-amber-400 font-mono">{metrics.crewWarningsCount}</strong></span>
            <span>Legal: <strong className="text-emerald-400 font-mono">{16 - metrics.crewBreachesCount - metrics.crewWarningsCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Accordion 1: Stranded Passengers Breakdown */}
      <div className="border border-[#1e293b] rounded-xl overflow-hidden bg-[#080D18]">
        <button
          onClick={() => setShowPaxBreakdown(!showPaxBreakdown)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#182235]/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">
              Passenger Strandedness Breakdown by Airport &amp; Broken Connections
            </span>
            <span className="text-[10px] bg-[#182235] text-slate-300 px-2 py-0.5 rounded-full font-mono border border-[#334155]">
              {metrics.strandedPax.total} Total Stranded
            </span>
          </div>
          {showPaxBreakdown ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showPaxBreakdown && (
          <div className="p-4 pt-1 border-t border-[#1e293b] flex flex-col gap-4">
            {metrics.strandedPax.total === 0 ? (
              <p className="text-xs text-emerald-400 py-2">
                No passengers are currently stranded in the network.
              </p>
            ) : (
              <>
                {/* Airport stranded badges */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {Object.entries(metrics.strandedPax.byAirport).map(([airport, count]) => (
                    count > 0 && (
                      <div
                        key={airport}
                        className="bg-[#182235] border border-[#334155] px-3 py-1.5 rounded-lg text-xs flex items-center gap-2"
                      >
                        <span className="font-bold text-white font-mono">{airport}:</span>
                        <span className="text-rose-400 font-mono font-bold">{count} pax</span>
                      </div>
                    )
                  ))}
                </div>

                {/* Broken connections details */}
                {metrics.strandedPax.brokenConnections.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold text-slate-400">
                      Broken Inbound/Outbound Connection Pairs ({metrics.strandedPax.brokenConnections.length}):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {metrics.strandedPax.brokenConnections.map((cx) => (
                        <div
                          key={cx.connection_id}
                          className="bg-[#111827] border border-[#1e293b] p-2.5 rounded-lg text-xs flex items-center justify-between"
                        >
                          <div>
                            <div className="font-mono font-bold text-slate-200">
                              {cx.connection_id}: {cx.from_flight} → {cx.to_flight}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Hub: <strong className="text-slate-300">{cx.airport}</strong> | Actual buffer: <strong className="text-rose-400 font-mono">{cx.actualConnectMinutes}m</strong> (req: {cx.min_connect_minutes}m)
                            </div>
                          </div>
                          <span className="font-mono font-bold text-rose-400 text-sm">{cx.passengers} pax</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Accordion 2: Crew Legal Duty Risk Meter */}
      <div className="border border-[#1e293b] rounded-xl overflow-hidden bg-[#080D18]">
        <button
          onClick={() => setShowCrewList(!showCrewList)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-[#182235]/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">
              Crew Legal Duty Monitor (16 Flight Crews)
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              metrics.crewBreachesCount > 0 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}>
              {metrics.crewBreachesCount > 0 ? `${metrics.crewBreachesCount} Breaches Detected` : 'All Crews Legal'}
            </span>
          </div>
          {showCrewList ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showCrewList && (
          <div className="p-4 pt-1 border-t border-[#1e293b] flex flex-col gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {sortedCrews.map((c) => {
                const isBreach = c.status === 'breached';
                const isWarning = c.status === 'warning';
                return (
                  <div
                    key={c.crew_id}
                    className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
                      isBreach
                        ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                        : isWarning
                        ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                        : 'bg-[#111827] border-[#1e293b] text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono font-bold text-white">{c.crew_id}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        isBreach ? 'bg-rose-900 text-rose-200' : isWarning ? 'bg-amber-900 text-amber-200' : 'bg-emerald-950 text-emerald-300'
                      }`}>
                        {c.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Aircraft: <strong className="text-slate-200 font-mono">{c.tail_id}</strong> (Base: {c.base})
                    </div>
                    <div className="text-[11px] mt-1 font-mono">
                      Duty: <strong className={isBreach ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-slate-200'}>{c.dutyUsedMinutes}m</strong> / {c.maxDutyMins}m
                    </div>
                    {isBreach && c.breachedFlightId && (
                      <div className="text-[10px] text-rose-400 mt-1">
                        Exceeded on flight {c.breachedFlightId}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

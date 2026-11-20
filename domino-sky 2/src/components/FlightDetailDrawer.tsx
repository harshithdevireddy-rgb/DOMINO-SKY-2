/**
 * DOMINO SKY - Flight Detail & Disruption Causal Chain Drawer (Dark Ops Theme)
 * Explains WHY a flight is delayed with a granular causal chain back to root disruption,
 * displays turnaround buffer absorption, and lists affected passenger connections.
 */

import React from 'react';
import { SimulatedFlight, ConnectionImpact } from '../engine/types';
import { Airport } from '../data/loader';
import { X, Plane, Clock, Users, ArrowRight, AlertTriangle, ShieldCheck, Link2, Sparkles, ArrowDown } from 'lucide-react';

interface FlightDetailDrawerProps {
  flight: SimulatedFlight | null;
  onClose: () => void;
  airports: Airport[];
  connections: ConnectionImpact[];
  onSelectFlight: (id: string) => void;
}

export const FlightDetailDrawer: React.FC<FlightDetailDrawerProps> = ({
  flight,
  onClose,
  airports,
  connections,
  onSelectFlight,
}) => {
  if (!flight) return null;

  const airportMap = new Map<string, Airport>();
  airports.forEach((a) => airportMap.set(a.id, a));

  const originAirport = airportMap.get(flight.origin);
  const destAirport = airportMap.get(flight.destination);

  const downstreamConnections = connections.filter((c) => c.from_flight === flight.flight_id);

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-[#111827] border-l border-[#1e293b] z-50 p-6 flex flex-col gap-5 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200 text-slate-100">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {flight.flight_id}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                flight.status === 'delayed'
                  ? flight.delayMinutes > 30
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                  : flight.status === 'cancelled'
                  ? 'bg-slate-900 text-slate-400 border border-slate-700'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {flight.status === 'delayed'
                ? `+${flight.delayMinutes}m DELAYED`
                : flight.status.toUpperCase()}
            </span>
          </div>

          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>Aircraft: <strong className="text-cyan-400 font-mono">{flight.tail_id}</strong></span>
            <span>•</span>
            <span>Rotation Leg #{flight.leg_order}</span>
            <span>•</span>
            <span>{flight.pax} Passengers</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#182235] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Route & Timing Comparison Card */}
      <div className="bg-[#080D18] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-white font-mono">{flight.origin}</div>
            <div className="text-xs text-slate-400">{originAirport?.city || flight.origin}</div>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 font-medium uppercase font-mono">{flight.block_minutes} mins</span>
            <div className="w-24 h-[1.5px] bg-[#1e293b] relative my-1">
              <Plane className="w-3.5 h-3.5 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
            </div>
            <span className="text-[11px] text-slate-300 font-semibold">{flight.pax} Passengers</span>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-white font-mono">{flight.destination}</div>
            <div className="text-xs text-slate-400">{destAirport?.city || flight.destination}</div>
          </div>
        </div>

        {/* Timetable Comparison */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e293b] text-xs">
          <div className="bg-[#111827] p-2.5 rounded-lg border border-[#1e293b]">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Departure</div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="font-mono text-slate-400">Sched: {flight.schedDep}</span>
              <span className={`font-mono font-bold ${flight.delayMinutes > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                Act: {flight.actualDep}
              </span>
            </div>
          </div>

          <div className="bg-[#111827] p-2.5 rounded-lg border border-[#1e293b]">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Arrival</div>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="font-mono text-slate-400">Sched: {flight.schedArr}</span>
              <span className={`font-mono font-bold ${flight.delayMinutes > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                Act: {flight.actualArr}
              </span>
            </div>
          </div>
        </div>

        {/* Slack Absorbed Badge */}
        {flight.slackAbsorbedMinutes > 0 && (
          <div className="text-[11px] text-emerald-300 bg-emerald-950/50 border border-emerald-800/80 p-2 rounded-lg flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Turnaround buffer absorbed <strong>{flight.slackAbsorbedMinutes} minutes</strong> of upstream delay at {flight.origin}.</span>
          </div>
        )}
      </div>

      {/* Disruption Causal Story */}
      {flight.cause ? (
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Why this flight is delayed:</span>
          </div>
          <p className="text-xs text-amber-100/90 leading-relaxed">
            {flight.cause.sentence}
          </p>
        </div>
      ) : (
        <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-4 flex items-center gap-2 text-xs text-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>This flight is operating strictly on schedule. No upstream disruptions have propagated to this aircraft rotation.</span>
        </div>
      )}

      {/* Causal Chain Tree */}
      {flight.cause && flight.cause.chain.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            DISRUPTION PROPAGATION CHAIN ({flight.cause.chain.length} STEPS)
          </span>

          <div className="flex flex-col gap-1.5">
            {flight.cause.chain.map((node, idx) => {
              const isLast = idx === flight.cause!.chain.length - 1;
              return (
                <React.Fragment key={idx}>
                  <div
                    className={`p-3 rounded-xl border text-xs flex flex-col gap-1 transition-colors ${
                      isLast
                        ? 'bg-amber-950/40 border-amber-700/80 text-amber-200'
                        : 'bg-[#080D18] border-[#1e293b] text-slate-300 hover:border-[#334155]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#182235] text-cyan-400 flex items-center justify-center font-mono font-bold text-[10px] border border-[#334155]">
                          {idx + 1}
                        </span>
                        <span className="font-mono font-bold text-white">
                          {node.flightId || node.type}
                        </span>
                        {node.route && (
                          <span className="text-[10px] text-slate-400">({node.route})</span>
                        )}
                      </div>

                      {node.delayMinutes > 0 && (
                        <span className="font-mono font-bold text-amber-400">
                          +{node.delayMinutes}m
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-300 pl-7 leading-normal">
                      {node.description}
                    </p>
                  </div>

                  {!isLast && (
                    <div className="flex justify-center py-0.5 text-slate-500">
                      <ArrowDown className="w-3.5 h-3.5 text-cyan-500/80" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Downstream Passenger Connections */}
      {downstreamConnections.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-[#1e293b]">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Downstream Connecting Flights ({downstreamConnections.length})</span>
          </span>

          <div className="flex flex-col gap-2">
            {downstreamConnections.map((cx) => (
              <div
                key={cx.connection_id}
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  cx.isBroken
                    ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                    : 'bg-[#080D18] border-[#1e293b] text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>{cx.connection_id}:</span>
                    <button
                      onClick={() => onSelectFlight(cx.to_flight)}
                      className="hover:text-cyan-400 underline decoration-slate-600 font-mono cursor-pointer"
                    >
                      {cx.to_flight}
                    </button>
                    <span className="text-[10px] font-normal text-slate-400">at {cx.airport}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Connect window: <span className="font-mono">{cx.actualConnectMinutes}m</span> (min required: {cx.min_connect_minutes}m)
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-mono font-bold ${cx.isBroken ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {cx.passengers} pax
                  </span>
                  <div className="text-[9px] text-slate-500">
                    {cx.isBroken ? 'MISSED CONNECTION' : 'VIABLE'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

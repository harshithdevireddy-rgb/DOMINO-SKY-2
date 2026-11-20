/**
 * DOMINO SKY - Airport Details Drawer
 * Displays operational capacity, incoming/outgoing flights, affected passengers,
 * and current disruption status when an airport is clicked on the network map.
 */

import React from 'react';
import { Airport } from '../data/loader';
import { AirportOperationalLoad, SimulatedFlight } from '../engine/types';
import { X, MapPin, Plane, Users, AlertTriangle, CheckCircle2, ShieldAlert, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface AirportDetailDrawerProps {
  airport: Airport | null;
  load: AirportOperationalLoad | null;
  flights: Record<string, SimulatedFlight>;
  onClose: () => void;
  onSelectFlight: (id: string) => void;
}

export const AirportDetailDrawer: React.FC<AirportDetailDrawerProps> = ({
  airport,
  load,
  flights,
  onClose,
  onSelectFlight,
}) => {
  if (!airport || !load) return null;

  const airportFlights = Object.values(flights).filter(
    (f) => f.origin === airport.id || f.destination === airport.id
  );

  const incomingFlights = airportFlights.filter((f) => f.destination === airport.id);
  const outgoingFlights = airportFlights.filter((f) => f.origin === airport.id);

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-[#111827] border-l border-[#1e293b] z-50 p-6 flex flex-col gap-5 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200 text-slate-100">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-white font-mono tracking-tight">
              {airport.id}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                load.status === 'closed'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : load.status === 'disrupted'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {load.status === 'closed'
                ? 'GROUND STOP CLOSED'
                : load.status === 'disrupted'
                ? 'DISRUPTED OPERATIONS'
                : 'NORMAL OPERATIONS'}
            </span>
          </div>

          <div className="text-sm font-semibold text-slate-200 mt-0.5">
            {airport.name}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>{airport.city}, India</span>
            <span>•</span>
            <span className="capitalize">{airport.tier.replace('_', ' ')}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#182235] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Capacity & Movement Scorecard */}
      <div className="grid grid-cols-2 gap-3">
        {/* Hourly Capacity */}
        <div className="bg-[#080D18] border border-[#1e293b] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400">Runway Capacity</span>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-cyan-300">{airport.capacity_per_hour}</span>
            <span className="text-[10px] text-slate-500 ml-1">slots / hr</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Peak load: <strong className="text-slate-300 font-mono">{load.peakHourMovements} / hr</strong>
          </span>
        </div>

        {/* Total Movements */}
        <div className="bg-[#080D18] border border-[#1e293b] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400">Total Scheduled Movements</span>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-white">{load.totalMovements}</span>
            <span className="text-[10px] text-slate-500 ml-1">flights</span>
          </div>
          <span className="text-[10px] text-slate-500">
            In: <strong className="text-slate-300 font-mono">{load.incomingCount}</strong> | Out: <strong className="text-slate-300 font-mono">{load.outgoingCount}</strong>
          </span>
        </div>

        {/* Affected Flights */}
        <div className="bg-[#080D18] border border-[#1e293b] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400">Affected Flights</span>
          <div className="my-1">
            <span className={`text-xl font-bold font-mono ${load.affectedFlightsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {load.affectedFlightsCount}
            </span>
            <span className="text-[10px] text-slate-500 ml-1">of {load.totalMovements}</span>
          </div>
          <span className="text-[10px] text-slate-500">
            {load.affectedFlightsCount > 0 ? 'Experiencing delays' : 'All legs on time'}
          </span>
        </div>

        {/* Affected Passengers */}
        <div className="bg-[#080D18] border border-[#1e293b] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400">Impacted Passengers</span>
          <div className="my-1">
            <span className={`text-xl font-bold font-mono ${load.affectedPaxCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {load.affectedPaxCount}
            </span>
            <span className="text-[10px] text-slate-500 ml-1">pax</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Delayed or held departures
          </span>
        </div>
      </div>

      {/* Flight Roster at this Airport */}
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Plane className="w-3.5 h-3.5 text-cyan-400" />
            <span>Connecting Flights ({airportFlights.length})</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {incomingFlights.length} Inbound • {outgoingFlights.length} Outbound
          </span>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px] pr-1">
          {airportFlights.map((flight) => {
            const isOutbound = flight.origin === airport.id;
            const otherAirport = isOutbound ? flight.destination : flight.origin;
            const isDelayed = flight.status === 'delayed';
            const isCancelled = flight.status === 'cancelled';

            return (
              <div
                key={flight.flight_id}
                onClick={() => onSelectFlight(flight.flight_id)}
                className="bg-[#080D18] border border-[#1e293b] hover:border-cyan-500/50 p-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${isOutbound ? 'bg-cyan-950 text-cyan-400' : 'bg-indigo-950 text-indigo-400'}`}>
                    {isOutbound ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {flight.flight_id}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isOutbound ? `To ${otherAirport}` : `From ${otherAirport}`}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">({flight.tail_id})</span>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      {isOutbound ? `Dep: ${flight.schedDep} → ${flight.actualDep}` : `Arr: ${flight.schedArr} → ${flight.actualArr}`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {isCancelled ? (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800">
                      CANCELLED
                    </span>
                  ) : isDelayed ? (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 font-mono">
                      +{flight.delayMinutes}m
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-emerald-400 font-mono">
                      On Time
                    </span>
                  )}
                  <div className="text-[9px] text-slate-500 mt-0.5">{flight.pax} pax</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

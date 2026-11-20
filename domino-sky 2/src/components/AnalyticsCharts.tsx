/**
 * DOMINO SKY - Visual Analytics & Disruption Propagation Charts
 * Visual analytics dashboard featuring delay distribution, aircraft delay accumulation,
 * airport impact ranking, and passenger disruption analysis.
 */

import React, { useMemo } from 'react';
import { SimulationResult } from '../engine/types';
import { Airport } from '../data/loader';
import { BarChart3, Clock, Plane, AlertTriangle, Users, MapPin, TrendingUp, ShieldAlert } from 'lucide-react';

interface AnalyticsChartsProps {
  result: SimulationResult;
  airports: Airport[];
  onSelectFlight: (id: string) => void;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  result,
  airports,
  onSelectFlight,
}) => {
  const { metrics, flights, timelines, connections } = result;

  // 1. Delay Distribution Buckets
  const delayDistribution = useMemo(() => {
    const buckets = [
      { label: '0m (On Time)', count: 0, color: '#10b981' },
      { label: '1–30m', count: 0, color: '#f59e0b' },
      { label: '31–60m', count: 0, color: '#f97316' },
      { label: '61–120m', count: 0, color: '#ef4444' },
      { label: '120m+', count: 0, color: '#b91c1c' },
    ];

    Object.values(flights).forEach((f) => {
      if (f.status === 'cancelled') return;
      if (f.delayMinutes === 0) buckets[0].count++;
      else if (f.delayMinutes <= 30) buckets[1].count++;
      else if (f.delayMinutes <= 60) buckets[2].count++;
      else if (f.delayMinutes <= 120) buckets[3].count++;
      else buckets[4].count++;
    });

    const maxCount = Math.max(...buckets.map((b) => b.count), 1);
    return { buckets, maxCount };
  }, [flights]);

  // 2. Delay Accumulation Across Aircraft Chains
  const aircraftDelays = useMemo(() => {
    return Object.values(timelines)
      .map((t) => {
        const delayedLegs = t.flights.filter((f) => f.delayMinutes > 0).length;
        const maxLegDelay = Math.max(...t.flights.map((f) => f.delayMinutes), 0);
        return {
          tailId: t.tail_id,
          totalDelay: t.totalDelayMinutes,
          delayedLegs,
          totalLegs: t.flights.length,
          maxLegDelay,
          spareReplacedBy: t.spareReplacedBy,
        };
      })
      .sort((a, b) => b.totalDelay - a.totalDelay);
  }, [timelines]);

  const maxTailDelay = Math.max(...aircraftDelays.map((a) => a.totalDelay), 1);

  // 3. Airport Disruption Impact Ranking
  const airportImpacts = useMemo(() => {
    const map = new Map<string, { airportId: string; delayedFlights: number; totalDelayMins: number; strandedPax: number }>();
    airports.forEach((a) => {
      map.set(a.id, { airportId: a.id, delayedFlights: 0, totalDelayMins: 0, strandedPax: 0 });
    });

    Object.values(flights).forEach((f) => {
      if (f.delayMinutes > 0) {
        const entry = map.get(f.origin);
        if (entry) {
          entry.delayedFlights++;
          entry.totalDelayMins += f.delayMinutes;
        }
      }
    });

    // Add stranded passengers
    Object.entries(metrics.strandedPax.byAirport).forEach(([airportId, pax]) => {
      const entry = map.get(airportId);
      if (entry) entry.strandedPax += pax;
    });

    return Array.from(map.values())
      .filter((a) => a.totalDelayMins > 0 || a.strandedPax > 0)
      .sort((a, b) => b.totalDelayMins - a.totalDelayMins);
  }, [airports, flights, metrics.strandedPax.byAirport]);

  const maxAirportDelay = Math.max(...airportImpacts.map((a) => a.totalDelayMins), 1);

  // 4. Broken Connections Breakdown
  const brokenConnections = useMemo(() => {
    return connections.filter((c) => c.isBroken);
  }, [connections]);

  return (
    <div className="flex flex-col gap-6 text-slate-100">
      {/* Top Disruption Summary Banner */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Network Analytics &amp; Ripple Propagation Metrics
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
              metrics.networkStatus === 'NORMAL'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : metrics.networkStatus === 'MINOR'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {metrics.networkStatus} NETWORK STATUS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical breakdown of delay distributions, aircraft rotation fatigue, and passenger connection bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[#080D18] px-4 py-2 rounded-xl border border-[#1e293b] text-xs">
          <div>
            <div className="text-slate-400 text-[10px]">Total Flights</div>
            <div className="font-mono font-bold text-white text-sm">{metrics.totalFlights}</div>
          </div>
          <div className="w-[1px] h-6 bg-[#1e293b]" />
          <div>
            <div className="text-slate-400 text-[10px]">Delayed Flights</div>
            <div className="font-mono font-bold text-amber-400 text-sm">{metrics.delayedCount}</div>
          </div>
          <div className="w-[1px] h-6 bg-[#1e293b]" />
          <div>
            <div className="text-slate-400 text-[10px]">Cancelled</div>
            <div className="font-mono font-bold text-rose-400 text-sm">{metrics.cancelledCount}</div>
          </div>
          <div className="w-[1px] h-6 bg-[#1e293b]" />
          <div>
            <div className="text-slate-400 text-[10px]">Total Delay</div>
            <div className="font-mono font-bold text-cyan-400 text-sm">{metrics.totalDelayMinutes}m</div>
          </div>
        </div>
      </div>

      {/* Grid: 2 Charts Top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Delay Distribution Histogram */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Flight Delay Duration Distribution</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Avg Delay: <strong className="text-white">{metrics.averageDelayMinutes}m</strong>
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Number of flights grouped by delay brackets. Unabsorbed rotational delays push flights into high severity brackets.
          </p>

          <div className="flex flex-col gap-3 mt-2">
            {delayDistribution.buckets.map((b) => {
              const pct = Math.round((b.count / delayDistribution.maxCount) * 100);
              return (
                <div key={b.label} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-300">{b.label}</span>
                    <span className="font-mono font-bold text-white">
                      {b.count} flight{b.count !== 1 ? 's' : ''} ({Math.round((b.count / metrics.totalFlights) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full h-3.5 bg-[#080D18] rounded-full overflow-hidden border border-[#1e293b]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(pct, b.count > 0 ? 4 : 0)}%`,
                        backgroundColor: b.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Top Disrupted Airports Ranking */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Airport Disruption Impact Ranking</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {airportImpacts.length} Airports Affected
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Accumulated delay minutes originating at each airport and count of stranded passengers.
          </p>

          <div className="flex flex-col gap-3 mt-1 max-h-[220px] overflow-y-auto pr-1">
            {airportImpacts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                All 16 airports operating normally with 0 delay minutes.
              </div>
            ) : (
              airportImpacts.slice(0, 6).map((a) => {
                const pct = Math.round((a.totalDelayMins / maxAirportDelay) * 100);
                const airportObj = airports.find((ap) => ap.id === a.airportId);
                return (
                  <div key={a.airportId} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white bg-[#182235] px-1.5 py-0.5 rounded border border-[#334155]">
                          {a.airportId}
                        </span>
                        <span className="text-slate-300">{airportObj?.city}</span>
                        {a.strandedPax > 0 && (
                          <span className="text-[10px] text-rose-400 bg-rose-950/60 px-1 rounded border border-rose-800">
                            {a.strandedPax} stranded
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-amber-400">
                        {a.totalDelayMins}m delay ({a.delayedFlights} flights)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-[#080D18] rounded-full overflow-hidden border border-[#1e293b]">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Grid: 2 Charts Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Delay Accumulation Across Aircraft Rotations */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Aircraft Rotation Delay Accumulation</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              16 Active Aircraft
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Total cumulative delay absorbed or compounded along each aircraft tail rotation.
          </p>

          <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-1">
            {aircraftDelays.map((ac) => {
              const pct = Math.round((ac.totalDelay / maxTailDelay) * 100);
              return (
                <div key={ac.tailId} className="flex items-center gap-3 text-xs">
                  <div className="w-20 font-mono font-bold text-slate-200 shrink-0 flex items-center gap-1">
                    <span>{ac.tailId}</span>
                    {ac.spareReplacedBy && (
                      <span className="text-[9px] text-cyan-400 bg-cyan-950 px-1 rounded">SPARE</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="w-full h-3 bg-[#080D18] rounded-full overflow-hidden border border-[#1e293b]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ac.totalDelay === 0
                            ? 'bg-emerald-500'
                            : ac.totalDelay > 120
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.max(pct, ac.totalDelay > 0 ? 5 : 2)}%` }}
                      />
                    </div>
                  </div>

                  <div className="w-28 text-right font-mono shrink-0">
                    {ac.totalDelay > 0 ? (
                      <span className="font-bold text-amber-300">
                        +{ac.totalDelay}m <span className="text-slate-500 text-[10px]">({ac.delayedLegs} legs)</span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium">On Schedule</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Broken Passenger Connections Analysis */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">Passenger Connection Integrity (21 Routes)</h3>
            </div>
            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
              brokenConnections.length === 0
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {brokenConnections.length} Broken / {connections.length} Total
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Connections broken when inbound flight arrival delay reduces connection buffer below minimum transfer time.
          </p>

          <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
            {brokenConnections.length === 0 ? (
              <div className="text-center py-10 text-xs text-emerald-400 flex flex-col items-center gap-1.5">
                <Users className="w-5 h-5 text-emerald-500" />
                <span>All 21 passenger connections are intact and viable.</span>
              </div>
            ) : (
              brokenConnections.map((cx) => (
                <div
                  key={cx.connection_id}
                  className="bg-[#080D18] border border-[#1e293b] hover:border-rose-800 p-2.5 rounded-xl flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800">
                      {cx.connection_id}
                    </span>
                    <div>
                      <div className="flex items-center gap-1 font-semibold text-slate-200">
                        <button
                          onClick={() => onSelectFlight(cx.from_flight)}
                          className="hover:text-cyan-400 underline decoration-slate-600 cursor-pointer"
                        >
                          {cx.from_flight}
                        </button>
                        <span className="text-slate-500">→</span>
                        <button
                          onClick={() => onSelectFlight(cx.to_flight)}
                          className="hover:text-cyan-400 underline decoration-slate-600 cursor-pointer"
                        >
                          {cx.to_flight}
                        </button>
                        <span className="text-[10px] text-slate-400 font-normal">at {cx.airport}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Actual buffer: <strong className="text-rose-400 font-mono">{cx.actualConnectMinutes}m</strong> vs required <span className="font-mono">{cx.min_connect_minutes}m</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-rose-400 text-sm">
                      {cx.passengers}
                    </span>
                    <div className="text-[10px] text-slate-500">stranded pax</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

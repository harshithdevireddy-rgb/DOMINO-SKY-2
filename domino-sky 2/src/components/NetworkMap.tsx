/**
 * DOMINO SKY - Interactive Airport Network Map (Dark Ops Control Center)
 * Displays all 16 Indian airports, curved flight routes with real-time delay coloring,
 * closure radar waves, in-flight moving planes, filter controls, and airport click inspector.
 */

import React, { useMemo, useState } from 'react';
import { Airport } from '../data/loader';
import { SimulatedFlight } from '../engine/types';
import { projectLatLng, getFlightArcPath, getPointOnArc } from './mapUtils';
import { AIRPORT_TIERS } from '../config/constants';
import { Plane, AlertTriangle, Clock, MapPin, Filter, Layers, CheckCircle2 } from 'lucide-react';

interface NetworkMapProps {
  airports: Airport[];
  flights: Record<string, SimulatedFlight>;
  closedAirportId: string | null;
  closureStart: string | null;
  closureEnd: string | null;
  selectedFlightId: string | null;
  onSelectFlight: (flightId: string) => void;
  onSelectAirport?: (airportId: string) => void;
  currentScrubberMins?: number | null;
}

type MapRouteFilter = 'ALL' | 'DELAYED' | 'ON_TIME' | 'CANCELLED';

export const NetworkMap: React.FC<NetworkMapProps> = ({
  airports,
  flights,
  closedAirportId,
  closureStart,
  closureEnd,
  selectedFlightId,
  onSelectFlight,
  onSelectAirport,
  currentScrubberMins = null,
}) => {
  const [hoveredFlightId, setHoveredFlightId] = useState<string | null>(null);
  const [hoveredAirportId, setHoveredAirportId] = useState<string | null>(null);
  const [routeFilter, setRouteFilter] = useState<MapRouteFilter>('ALL');

  // Projected airport positions
  const airportPoints = useMemo(() => {
    const map = new Map<string, { airport: Airport; x: number; y: number }>();
    airports.forEach((a) => {
      const pt = projectLatLng(a.lat, a.lng);
      map.set(a.id, { airport: a, x: pt.x, y: pt.y });
    });
    return map;
  }, [airports]);

  const allFlightList = useMemo(() => Object.values(flights), [flights]);

  // Filtered flights for the map visualization
  const visibleFlightList = useMemo(() => {
    return allFlightList.filter((f) => {
      if (routeFilter === 'DELAYED' && f.status !== 'delayed') return false;
      if (routeFilter === 'ON_TIME' && f.status !== 'on_time') return false;
      if (routeFilter === 'CANCELLED' && f.status !== 'cancelled') return false;
      return true;
    });
  }, [allFlightList, routeFilter]);

  // Active in-flight planes based on scrubber time
  const activePlanes = useMemo(() => {
    if (currentScrubberMins === null) return [];
    const active: Array<{ flight: SimulatedFlight; x: number; y: number; progress: number }> = [];

    allFlightList.forEach((f) => {
      if (f.status === 'cancelled') return;
      if (currentScrubberMins >= f.actualDepMins && currentScrubberMins <= f.actualArrMins) {
        const originPt = airportPoints.get(f.origin);
        const destPt = airportPoints.get(f.destination);
        if (originPt && destPt) {
          const totalDuration = f.actualArrMins - f.actualDepMins || 1;
          const progress = Math.max(0, Math.min(1, (currentScrubberMins - f.actualDepMins) / totalDuration));
          const pos = getPointOnArc({ x: originPt.x, y: originPt.y }, { x: destPt.x, y: destPt.y }, progress);
          active.push({ flight: f, x: pos.x, y: pos.y, progress });
        }
      }
    });

    return active;
  }, [allFlightList, currentScrubberMins, airportPoints]);

  const activeHoveredFlight = hoveredFlightId ? flights[hoveredFlightId] : null;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#080D18] rounded-2xl border border-[#1e293b] p-4 overflow-hidden select-none shadow-2xl min-h-[580px]">
      {/* Background Radar / Geographic Grid Glow */}
      <div className="absolute inset-0 bg-radial from-[#111827]/60 via-[#080D18] to-[#04070d] pointer-events-none" />

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 620 680"
        className="w-full h-full max-h-[640px] drop-shadow-md z-10"
      >
        <defs>
          {/* Node drop shadow for dark mode */}
          <filter id="nodeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.4" />
          </filter>
          <filter id="closedGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Geographic Grid Lines & Coordinates */}
        <g stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 5" opacity="0.6">
          <line x1="60" y1="180" x2="560" y2="180" />
          <line x1="60" y1="340" x2="560" y2="340" />
          <line x1="60" y1="500" x2="560" y2="500" />
          <line x1="200" y1="50" x2="200" y2="620" />
          <line x1="360" y1="50" x2="360" y2="620" />
          <line x1="500" y1="50" x2="500" y2="620" />
        </g>

        {/* 1. Flight Arcs */}
        <g className="flight-arcs">
          {visibleFlightList.map((flight) => {
            const p1 = airportPoints.get(flight.origin);
            const p2 = airportPoints.get(flight.destination);
            if (!p1 || !p2) return null;

            const isSelected = selectedFlightId === flight.flight_id;
            const isHovered = hoveredFlightId === flight.flight_id;
            const isOriginHovered = hoveredAirportId === flight.origin || hoveredAirportId === flight.destination;

            // Route color in dark operations room:
            let stroke = '#10b981'; // Normal: Emerald / Teal
            let strokeWidth = isSelected ? 3.5 : isHovered ? 2.8 : 1.5;
            let opacity = isSelected || isHovered ? 1 : isOriginHovered ? 0.95 : 0.35;

            if (flight.status === 'cancelled') {
              stroke = '#64748b'; // Cancelled: muted slate
              opacity = isSelected || isHovered ? 0.9 : 0.25;
            } else if (flight.delayMinutes > 45) {
              stroke = '#ef4444'; // Severe: Bright Red
              opacity = isSelected || isHovered ? 1 : 0.8;
            } else if (flight.delayMinutes > 0) {
              stroke = '#f59e0b'; // Delayed: Amber
              opacity = isSelected || isHovered ? 1 : 0.65;
            }

            if (isSelected) {
              stroke = '#06b6d4'; // Cyan for selected active flight
            }

            const pathD = getFlightArcPath({ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y });

            return (
              <g
                key={flight.flight_id}
                className="cursor-pointer transition-all duration-150"
                onClick={() => onSelectFlight(flight.flight_id)}
                onMouseEnter={() => setHoveredFlightId(flight.flight_id)}
                onMouseLeave={() => setHoveredFlightId(null)}
              >
                {/* Thick invisible hit target for smooth mouse interactions */}
                <path d={pathD} fill="none" stroke="transparent" strokeWidth="14" />

                {/* Visible Flight Arc */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeOpacity={opacity}
                  strokeDasharray={flight.status === 'cancelled' ? '5 5' : undefined}
                  className={flight.delayMinutes > 0 && isSelected ? 'animated-dash' : undefined}
                />
              </g>
            );
          })}
        </g>

        {/* 2. Active Moving Planes along Arcs */}
        <g className="active-planes pointer-events-none">
          {activePlanes.map(({ flight, x, y }) => (
            <g key={`plane-${flight.flight_id}`} transform={`translate(${x}, ${y})`}>
              <circle r="8" fill="#06b6d4" fillOpacity="0.25" className="animate-ping" />
              <circle r="4.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          ))}
        </g>

        {/* 3. Airports Nodes */}
        <g className="airports">
          {Array.from(airportPoints.values()).map(({ airport, x, y }) => {
            const isClosed = airport.id === closedAirportId;
            const isHovered = hoveredAirportId === airport.id;
            const tierConfig = AIRPORT_TIERS[airport.tier] || AIRPORT_TIERS.spoke;
            const radius = isClosed ? tierConfig.radius + 2 : tierConfig.radius;

            return (
              <g
                key={airport.id}
                className="cursor-pointer group"
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectAirport && onSelectAirport(airport.id)}
                onMouseEnter={() => setHoveredAirportId(airport.id)}
                onMouseLeave={() => setHoveredAirportId(null)}
              >
                {/* Closure Radar Pulse */}
                {isClosed && (
                  <circle
                    r="16"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    className="radar-ring origin-center"
                  />
                )}

                {/* Outer Glow Halo on Hover or Selection */}
                <circle
                  r={radius + 5}
                  fill={isClosed ? '#ef4444' : '#06b6d4'}
                  fillOpacity={isClosed ? 0.4 : isHovered ? 0.35 : 0.08}
                  className="transition-all duration-200"
                />

                {/* Airport Center Node */}
                <circle
                  r={radius}
                  fill={
                    isClosed
                      ? '#ef4444'
                      : airport.tier === 'mega_hub'
                      ? '#38bdf8'
                      : airport.tier === 'regional_hub'
                      ? '#06b6d4'
                      : '#94a3b8'
                  }
                  stroke="#080D18"
                  strokeWidth="2"
                  filter={isClosed ? 'url(#closedGlow)' : undefined}
                  className="transition-transform duration-200 group-hover:scale-125"
                />

                {/* Airport IATA Label */}
                <text
                  y={radius + 13}
                  textAnchor="middle"
                  fill={isClosed ? '#f87171' : isHovered ? '#38bdf8' : '#e2e8f0'}
                  fontSize={airport.tier === 'mega_hub' ? '11px' : '9.5px'}
                  fontWeight={airport.tier === 'mega_hub' || isClosed ? '700' : '600'}
                  className="pointer-events-none drop-shadow-md tracking-wider font-mono select-none"
                >
                  {airport.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Hover Card for Flight */}
      {activeHoveredFlight && (
        <div className="absolute bottom-4 left-4 bg-[#111827]/95 backdrop-blur-md border border-[#1e293b] rounded-xl p-3 shadow-2xl max-w-xs text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 z-30 pointer-events-none text-slate-100">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-bold text-white flex items-center gap-1 font-mono">
              <Plane className="w-3.5 h-3.5 text-cyan-400 rotate-45" />
              {activeHoveredFlight.flight_id} ({activeHoveredFlight.tail_id})
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                activeHoveredFlight.status === 'delayed'
                  ? activeHoveredFlight.delayMinutes > 30
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                  : activeHoveredFlight.status === 'cancelled'
                  ? 'bg-slate-900 text-slate-400 border border-slate-700'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {activeHoveredFlight.status === 'delayed'
                ? `+${activeHoveredFlight.delayMinutes}m`
                : activeHoveredFlight.status.toUpperCase()}
            </span>
          </div>

          <div className="text-slate-300 flex items-center gap-1.5 mb-1 font-medium">
            <span>{activeHoveredFlight.origin}</span>
            <span className="text-slate-500">→</span>
            <span>{activeHoveredFlight.destination}</span>
            <span className="text-cyan-400 ml-auto font-mono text-[11px]">
              {activeHoveredFlight.delayMinutes > 0
                ? `${activeHoveredFlight.schedDep} (${activeHoveredFlight.actualDep})`
                : activeHoveredFlight.schedDep}
            </span>
          </div>

          {activeHoveredFlight.cause && (
            <p className="text-[11px] text-amber-300/90 leading-tight border-t border-[#1e293b] pt-1.5 mt-1">
              {activeHoveredFlight.cause.sentence}
            </p>
          )}
        </div>
      )}

      {/* Top Left Status & Route Filter Bar */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-20">
        {/* Route Filter Tabs */}
        <div className="bg-[#111827]/90 backdrop-blur-md border border-[#1e293b] p-1 rounded-xl flex items-center text-xs">
          {(['ALL', 'DELAYED', 'ON_TIME', 'CANCELLED'] as MapRouteFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setRouteFilter(f)}
              className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer ${
                routeFilter === f
                  ? 'bg-[#182235] text-cyan-300 font-bold border border-[#334155]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f === 'ALL' ? 'All Routes' : f === 'DELAYED' ? 'Delayed' : f === 'ON_TIME' ? 'On Time' : 'Cancelled'}
            </button>
          ))}
        </div>

        {/* Airport Closure Alert Pill */}
        {closedAirportId && (
          <div className="bg-rose-950/80 backdrop-blur-md border border-rose-800 text-rose-300 px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>{closedAirportId} CLOSED ({closureStart}–{closureEnd} IST)</span>
          </div>
        )}
      </div>

      {/* Bottom Right Legend */}
      <div className="absolute bottom-4 right-4 bg-[#111827]/90 backdrop-blur-md border border-[#1e293b] rounded-xl px-3.5 py-2 text-[11px] text-slate-300 flex flex-wrap items-center gap-3.5 shadow-xl z-20">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>On Time</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>Delayed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Severe (&gt;45m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          <span>Cancelled</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 pl-2 border-l border-[#1e293b] text-[10px]">
          <span>Click airport/route to inspect</span>
        </div>
      </div>
    </div>
  );
};

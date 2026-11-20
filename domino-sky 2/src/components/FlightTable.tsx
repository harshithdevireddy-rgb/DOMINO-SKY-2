/**
 * DOMINO SKY - Detailed Flight Operations Table
 * Operations control center flight list with multi-column sorting,
 * multi-dimensional filtering, search, and instant causal chain access.
 */

import React, { useState, useMemo } from 'react';
import { SimulatedFlight } from '../engine/types';
import { Airport } from '../data/loader';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Plane, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Eye, 
  Download 
} from 'lucide-react';

interface FlightTableProps {
  flights: Record<string, SimulatedFlight>;
  airports: Airport[];
  onSelectFlight: (flightId: string) => void;
  selectedFlightId: string | null;
}

type SortField = 'flight_id' | 'tail_id' | 'origin' | 'destination' | 'schedDepMins' | 'actualDepMins' | 'schedArrMins' | 'actualArrMins' | 'delayMinutes' | 'pax' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'ALL' | 'ON_TIME' | 'DELAYED' | 'CANCELLED';

export const FlightTable: React.FC<FlightTableProps> = ({
  flights,
  airports,
  onSelectFlight,
  selectedFlightId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [airportFilter, setAirportFilter] = useState<string>('ALL');
  const [aircraftFilter, setAircraftFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('schedDepMins');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const airportMap = useMemo(() => {
    const map = new Map<string, Airport>();
    airports.forEach((a) => map.set(a.id, a));
    return map;
  }, [airports]);

  // Unique tail IDs
  const tailIds = useMemo(() => {
    const tails = new Set<string>();
    Object.values(flights).forEach((f) => tails.add(f.tail_id));
    return Array.from(tails).sort();
  }, [flights]);

  // Filter & Search
  const filteredFlights = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return Object.values(flights).filter((f) => {
      // 1. Status Filter
      if (statusFilter === 'ON_TIME' && f.status !== 'on_time') return false;
      if (statusFilter === 'DELAYED' && f.status !== 'delayed') return false;
      if (statusFilter === 'CANCELLED' && f.status !== 'cancelled') return false;

      // 2. Airport Filter
      if (airportFilter !== 'ALL' && f.origin !== airportFilter && f.destination !== airportFilter) {
        return false;
      }

      // 3. Aircraft Filter
      if (aircraftFilter !== 'ALL' && f.tail_id !== aircraftFilter) {
        return false;
      }

      // 4. Search Query
      if (q) {
        const originCity = airportMap.get(f.origin)?.city.toLowerCase() || '';
        const destCity = airportMap.get(f.destination)?.city.toLowerCase() || '';
        const matchesQuery =
          f.flight_id.toLowerCase().includes(q) ||
          f.tail_id.toLowerCase().includes(q) ||
          f.origin.toLowerCase().includes(q) ||
          f.destination.toLowerCase().includes(q) ||
          originCity.includes(q) ||
          destCity.includes(q) ||
          (f.cause?.sentence.toLowerCase() || '').includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [flights, searchQuery, statusFilter, airportFilter, aircraftFilter, airportMap]);

  // Sorting
  const sortedFlights = useMemo(() => {
    return [...filteredFlights].sort((a, b) => {
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        const comp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? comp : -comp;
      }

      const numA = Number(valA);
      const numB = Number(valB);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
  }, [filteredFlights, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const exportCSV = () => {
    const headers = [
      'Flight ID',
      'Aircraft',
      'Origin',
      'Destination',
      'Sched Dep',
      'Actual Dep',
      'Sched Arr',
      'Actual Arr',
      'Delay (mins)',
      'Passengers',
      'Status',
      'Delay Reason',
    ];

    const rows = sortedFlights.map((f) => [
      f.flight_id,
      f.tail_id,
      f.origin,
      f.destination,
      f.schedDep,
      f.actualDep,
      f.schedArr,
      f.actualArr,
      f.delayMinutes,
      f.pax,
      f.status,
      `"${(f.cause?.sentence || 'Normal scheduled operation').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `domino_sky_flights_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-5 flex flex-col gap-4 text-slate-100 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-cyan-400 rotate-45" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Flight Rotation Manifest &amp; Delay Status
            </h2>
            <span className="text-xs bg-[#182235] border border-[#334155] px-2.5 py-0.5 rounded-full font-mono text-cyan-300">
              {filteredFlights.length} of {Object.keys(flights).length} flights
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time schedule propagation, actual departure/arrival timestamps, passenger counts, and causal disruption links.
          </p>
        </div>

        {/* Quick CSV Export */}
        <button
          onClick={exportCSV}
          className="self-start lg:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#182235] hover:bg-[#1e293b] border border-[#334155] text-xs font-medium text-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search flight, aircraft, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#080D18] border border-[#1e293b] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center bg-[#080D18] p-1 rounded-xl border border-[#1e293b] text-xs">
          {(['ALL', 'ON_TIME', 'DELAYED', 'CANCELLED'] as StatusFilter[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`flex-1 py-1 text-center font-medium rounded-lg transition-colors cursor-pointer text-[11px] ${
                statusFilter === st
                  ? 'bg-[#182235] text-cyan-300 font-bold border border-[#334155]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'ON_TIME' ? 'On Time' : st === 'DELAYED' ? 'Delayed' : 'Cancelled'}
            </button>
          ))}
        </div>

        {/* Airport Filter Dropdown */}
        <div className="flex items-center gap-2 bg-[#080D18] px-3 py-1.5 rounded-xl border border-[#1e293b]">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={airportFilter}
            onChange={(e) => setAirportFilter(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
          >
            <option value="ALL" className="bg-[#111827]">All Airports (16)</option>
            {airports.map((a) => (
              <option key={a.id} value={a.id} className="bg-[#111827]">
                {a.id} — {a.city}
              </option>
            ))}
          </select>
        </div>

        {/* Aircraft Tail Filter Dropdown */}
        <div className="flex items-center gap-2 bg-[#080D18] px-3 py-1.5 rounded-xl border border-[#1e293b]">
          <Plane className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={aircraftFilter}
            onChange={(e) => setAircraftFilter(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none w-full cursor-pointer"
          >
            <option value="ALL" className="bg-[#111827]">All Aircraft ({tailIds.length})</option>
            {tailIds.map((tail) => (
              <option key={tail} value={tail} className="bg-[#111827]">
                {tail}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto border border-[#1e293b] rounded-xl bg-[#080D18]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#182235] text-slate-400 font-semibold border-b border-[#1e293b]">
              <th onClick={() => handleSort('flight_id')} className="p-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">
                  <span>Flight</span>
                  {sortField === 'flight_id' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th onClick={() => handleSort('tail_id')} className="p-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">
                  <span>Aircraft</span>
                  {sortField === 'tail_id' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th className="p-3">Route</th>
              <th onClick={() => handleSort('schedDepMins')} className="p-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">
                  <span>Departure (Sched → Act)</span>
                  {sortField === 'schedDepMins' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th onClick={() => handleSort('schedArrMins')} className="p-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">
                  <span>Arrival (Sched → Act)</span>
                  {sortField === 'schedArrMins' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th onClick={() => handleSort('delayMinutes')} className="p-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">
                  <span>Delay</span>
                  {sortField === 'delayMinutes' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th onClick={() => handleSort('pax')} className="p-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">
                  <span>Pax</span>
                  {sortField === 'pax' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th onClick={() => handleSort('status')} className="p-3 cursor-pointer hover:text-white transition-colors">
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  {sortField === 'status' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                </div>
              </th>
              <th className="p-3">Disruption Causal Reason</th>
              <th className="p-3 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]">
            {sortedFlights.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500">
                  No flights match the selected search or filter criteria.
                </td>
              </tr>
            ) : (
              sortedFlights.map((flight) => {
                const isSelected = selectedFlightId === flight.flight_id;
                const isDelayed = flight.status === 'delayed';
                const isCancelled = flight.status === 'cancelled';

                return (
                  <tr
                    key={flight.flight_id}
                    onClick={() => onSelectFlight(flight.flight_id)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-cyan-950/40 border-l-4 border-cyan-400'
                        : isCancelled
                        ? 'bg-rose-950/20 hover:bg-rose-950/30'
                        : isDelayed
                        ? 'bg-amber-950/15 hover:bg-amber-950/25'
                        : 'hover:bg-[#182235]/60'
                    }`}
                  >
                    {/* Flight ID */}
                    <td className="p-3 font-mono font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <span className={isSelected ? 'text-cyan-400' : ''}>{flight.flight_id}</span>
                        <span className="text-[10px] text-slate-500 font-normal">L{flight.leg_order}</span>
                      </div>
                    </td>

                    {/* Aircraft Tail */}
                    <td className="p-3 font-mono text-slate-300">
                      {flight.tail_id}
                    </td>

                    {/* Route */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200">{flight.origin}</span>
                        <span className="text-slate-500">→</span>
                        <span className="font-semibold text-slate-200">{flight.destination}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {airportMap.get(flight.origin)?.city || flight.origin} to {airportMap.get(flight.destination)?.city || flight.destination}
                      </div>
                    </td>

                    {/* Departure (Sched -> Actual) */}
                    <td className="p-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">{flight.schedDep}</span>
                        <span className="text-slate-600">→</span>
                        <span className={`font-semibold ${isDelayed ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {flight.actualDep}
                        </span>
                      </div>
                    </td>

                    {/* Arrival (Sched -> Actual) */}
                    <td className="p-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">{flight.schedArr}</span>
                        <span className="text-slate-600">→</span>
                        <span className={`font-semibold ${isDelayed ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {flight.actualArr}
                        </span>
                      </div>
                    </td>

                    {/* Delay Minutes */}
                    <td className="p-3 font-mono">
                      {isCancelled ? (
                        <span className="text-rose-400 font-semibold">—</span>
                      ) : flight.delayMinutes > 0 ? (
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          flight.delayMinutes > 60
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                        }`}>
                          +{flight.delayMinutes}m
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">0m</span>
                      )}
                    </td>

                    {/* Passengers */}
                    <td className="p-3 font-mono text-slate-300">
                      {flight.pax}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3">
                      {isCancelled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-900/40 text-rose-300 border border-rose-700/60">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          CANCELLED
                        </span>
                      ) : isDelayed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-900/40 text-amber-300 border border-amber-700/60">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          DELAYED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900/40 text-emerald-300 border border-emerald-700/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ON TIME
                        </span>
                      )}
                    </td>

                    {/* Delay Reason Preview */}
                    <td className="p-3 max-w-[280px]">
                      {flight.cause ? (
                        <div className="truncate text-slate-300 group-hover:text-white transition-colors" title={flight.cause.sentence}>
                          {flight.cause.sentence}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Operating on scheduled time</span>
                      )}
                    </td>

                    {/* Inspect Button */}
                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFlight(flight.flight_id);
                        }}
                        className="p-1 rounded bg-[#182235] hover:bg-cyan-950/80 border border-[#334155] text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                        title="View Causal Disruption Chain"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * DOMINO SKY - Gantt-Style Aircraft Rotation Timeline (Dark Ops Theme)
 * Visualizes aircraft rotations, scheduled vs actual flight bars,
 * turnaround slack absorption, in-flight scrubber, and rotational domino ripples.
 */

import React, { useMemo } from 'react';
import { AircraftTimeline as TimelineData } from '../engine/types';
import { Plane } from 'lucide-react';

interface AircraftTimelineProps {
  timelines: Record<string, TimelineData>;
  selectedFlightId: string | null;
  onSelectFlight: (flightId: string) => void;
  currentScrubberMins?: number | null;
}

const TIMELINE_START_MINS = 300; // 05:00
const TIMELINE_END_MINS = 1350;  // 22:30
const TOTAL_DURATION_MINS = TIMELINE_END_MINS - TIMELINE_START_MINS;

export const AircraftTimeline: React.FC<AircraftTimelineProps> = ({
  timelines,
  selectedFlightId,
  onSelectFlight,
  currentScrubberMins = null,
}) => {
  const tailIds = useMemo(() => Object.keys(timelines).sort(), [timelines]);

  const hourMarkers = useMemo(() => {
    const hours: Array<{ time: string; mins: number; leftPct: number }> = [];
    for (let m = 360; m <= 1320; m += 120) {
      const h = Math.floor(m / 60);
      const label = `${h.toString().padStart(2, '0')}:00`;
      const leftPct = ((m - TIMELINE_START_MINS) / TOTAL_DURATION_MINS) * 100;
      hours.push({ time: label, mins: m, leftPct });
    }
    return hours;
  }, []);

  const scrubberLeftPct = currentScrubberMins !== null
    ? Math.max(0, Math.min(100, ((currentScrubberMins - TIMELINE_START_MINS) / TOTAL_DURATION_MINS) * 100))
    : null;

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 flex flex-col gap-4 shadow-xl select-none text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e293b] pb-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plane className="w-4 h-4 text-cyan-400 rotate-45" />
            Aircraft Rotation Gantt Timeline (16 Fleet Aircraft)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Follow each tail&apos;s chronological legs. Observe how upstream delays propagate or get absorbed by scheduled turnaround buffers.
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span>On Time</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500" />
            <span>1–30m Late</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
            <span>&gt;30m Late</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-slate-600" />
            <span>Cancelled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-emerald-400 bg-emerald-950 flex items-center justify-center text-[8px] font-bold text-emerald-400">✓</span>
            <span>Slack Absorbed</span>
          </div>
        </div>
      </div>

      {/* Gantt Container */}
      <div className="relative overflow-x-auto border border-[#1e293b] rounded-xl bg-[#080D18] p-3">
        <div className="min-w-[860px]">
          {/* Time axis header */}
          <div className="relative h-7 border-b border-[#1e293b] text-[11px] text-slate-400 font-mono">
            <div className="absolute left-0 w-32 pl-2 font-sans font-bold text-slate-200">
              AIRCRAFT TAIL
            </div>
            <div className="absolute left-36 right-2 h-full">
              {hourMarkers.map((marker) => (
                <div
                  key={marker.time}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${marker.leftPct}%` }}
                >
                  <span className="font-semibold">{marker.time}</span>
                  <div className="w-[1px] h-2 bg-[#334155] mt-0.5" />
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Rows */}
          <div className="relative flex flex-col divide-y divide-[#1e293b]/60">
            {/* Scrubber vertical line indicator */}
            {scrubberLeftPct !== null && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 z-20 pointer-events-none shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                style={{ left: `calc(9rem + ${scrubberLeftPct * 0.82}%)` }}
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400 -translate-x-[3px] -translate-y-1 shadow-md" />
              </div>
            )}

            {tailIds.map((tailId) => {
              const timeline = timelines[tailId];
              const isTailDisrupted = timeline.totalDelayMinutes > 0;

              return (
                <div key={tailId} className="relative h-10 flex items-center hover:bg-[#182235]/40 transition-colors">
                  {/* Left Label */}
                  <div className="w-36 pl-2 flex items-center gap-1.5 shrink-0 z-10">
                    <span className="font-mono text-xs font-bold text-slate-200">{tailId}</span>
                    {timeline.spareReplacedBy && (
                      <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950 border border-cyan-800 px-1 rounded">
                        SPARE
                      </span>
                    )}
                    {isTailDisrupted && !timeline.spareReplacedBy && (
                      <span className="text-[10px] text-amber-400 font-mono font-semibold">
                        +{timeline.totalDelayMinutes}m
                      </span>
                    )}
                  </div>

                  {/* Flight Blocks Track */}
                  <div className="relative flex-1 h-full">
                    {timeline.flights.map((flight) => {
                      const leftPct = Math.max(0, ((flight.actualDepMins - TIMELINE_START_MINS) / TOTAL_DURATION_MINS) * 100);
                      const widthPct = Math.max(1.8, ((flight.actualArrMins - flight.actualDepMins) / TOTAL_DURATION_MINS) * 100);
                      const isSelected = selectedFlightId === flight.flight_id;

                      let blockBg = 'bg-emerald-600/90 hover:bg-emerald-500 border-emerald-500';
                      let textColor = 'text-white';

                      if (flight.status === 'cancelled') {
                        blockBg = 'bg-slate-700/80 hover:bg-slate-600 border-slate-600';
                        textColor = 'text-slate-300';
                      } else if (flight.delayMinutes > 30) {
                        blockBg = 'bg-rose-600/90 hover:bg-rose-500 border-rose-500 shadow-sm';
                      } else if (flight.delayMinutes > 0) {
                        blockBg = 'bg-amber-600/90 hover:bg-amber-500 border-amber-500';
                      }

                      return (
                        <div
                          key={flight.flight_id}
                          onClick={() => onSelectFlight(flight.flight_id)}
                          className={`absolute top-1.5 bottom-1.5 rounded-md px-1.5 flex items-center justify-between border cursor-pointer transition-all duration-150 ${blockBg} ${
                            isSelected ? 'ring-2 ring-cyan-400 scale-[1.03] z-10' : ''
                          }`}
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                          }}
                          title={`${flight.flight_id}: ${flight.origin} → ${flight.destination} (${flight.actualDep}–${flight.actualArr}) ${flight.delayMinutes > 0 ? `+${flight.delayMinutes}m delay` : ''}`}
                        >
                          <span className={`text-[10px] font-mono font-bold truncate ${textColor}`}>
                            {flight.flight_id}
                          </span>

                          {flight.slackAbsorbedMinutes > 0 && (
                            <span className="text-[9px] text-emerald-200 font-mono hidden xl:inline" title={`${flight.slackAbsorbedMinutes}m slack absorbed`}>
                              ✓{flight.slackAbsorbedMinutes}m
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

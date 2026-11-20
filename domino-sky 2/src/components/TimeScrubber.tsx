/**
 * DOMINO SKY - Time Scrubber & Ripple Controller (Dark Ops Theme)
 * Controls dynamic day playback, plane movements, and ripple timing with media-player precision.
 */

import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { formatMinutesToHHMM, parseHHMMToMinutes } from '../data/loader';

interface TimeScrubberProps {
  currentMins: number;
  onChangeMins: (mins: number | ((prev: number) => number)) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onChangeSpeed: (spd: number) => void;
  closureStart?: string | null;
  closureEnd?: string | null;
}

const START_MINS = 300; // 05:00
const END_MINS = 1350;  // 22:30

export const TimeScrubber: React.FC<TimeScrubberProps> = ({
  currentMins,
  onChangeMins,
  isPlaying,
  onTogglePlay,
  speed,
  onChangeSpeed,
  closureStart,
  closureEnd,
}) => {
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed > 40) {
        lastTimeRef.current = timestamp;
        onChangeMins((prev) => {
          const prevVal = typeof prev === 'number' ? prev : currentMins;
          const next = prevVal + speed;
          if (next >= END_MINS) {
            onTogglePlay();
            return START_MINS;
          }
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speed, onChangeMins, onTogglePlay, currentMins]);

  let closureStartPct: number | null = null;
  let closureWidthPct: number | null = null;

  if (closureStart && closureEnd) {
    try {
      const sMins = parseHHMMToMinutes(closureStart);
      const eMins = parseHHMMToMinutes(closureEnd);
      if (eMins > sMins) {
        closureStartPct = Math.max(0, ((sMins - START_MINS) / (END_MINS - START_MINS)) * 100);
        closureWidthPct = Math.min(100 - closureStartPct, ((eMins - sMins) / (END_MINS - START_MINS)) * 100);
      }
    } catch {
      // ignore
    }
  }

  const currentPct = ((currentMins - START_MINS) / (END_MINS - START_MINS)) * 100;

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-2xl px-5 py-3 flex flex-col md:flex-row items-center gap-4 shadow-xl select-none text-slate-100">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className="w-9 h-9 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center font-bold transition-all shadow-md cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play day simulation animation'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => onChangeMins(START_MINS)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#182235] transition-colors cursor-pointer"
          title="Reset to 05:00 IST"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Speed switchers */}
        <div className="flex items-center bg-[#080D18] p-0.5 rounded-lg border border-[#1e293b] text-[10px] font-mono">
          {[1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => onChangeSpeed(spd)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                speed === spd
                  ? 'bg-[#182235] text-cyan-300 font-bold border border-[#334155]'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Main Track */}
      <div className="flex-1 w-full flex flex-col gap-1">
        <div className="relative w-full h-5 flex items-center">
          {/* Track background */}
          <div className="w-full h-2 bg-[#080D18] rounded-full relative overflow-hidden border border-[#1e293b]">
            {/* Airport Closure Window Highlight */}
            {closureStartPct !== null && closureWidthPct !== null && (
              <div
                className="absolute top-0 bottom-0 bg-rose-500/30 border-x border-rose-500/60"
                style={{
                  left: `${closureStartPct}%`,
                  width: `${closureWidthPct}%`,
                }}
                title={`Closure Window: ${closureStart} to ${closureEnd}`}
              />
            )}

            {/* Elapsed Fill */}
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-75"
              style={{ width: `${currentPct}%` }}
            />
          </div>

          {/* Interactive Range Input */}
          <input
            type="range"
            min={START_MINS}
            max={END_MINS}
            step={5}
            value={currentMins}
            onChange={(e) => onChangeMins(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-ew-resize"
          />

          {/* Scrubber thumb marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-400 border-2 border-white rounded-full shadow-lg pointer-events-none transition-all duration-75 -ml-2"
            style={{ left: `${currentPct}%` }}
          />
        </div>

        {/* Time Labels */}
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>05:00</span>
          <span>08:00</span>
          <span>11:00</span>
          <span>14:00</span>
          <span>17:00</span>
          <span>20:00</span>
          <span>22:30</span>
        </div>
      </div>

      {/* Current Time Clock Display */}
      <div className="flex items-center gap-2 bg-[#080D18] px-3.5 py-1.5 rounded-xl border border-[#1e293b] shrink-0">
        <Clock className="w-4 h-4 text-cyan-400" />
        <div className="text-right">
          <div className="text-[10px] text-slate-400 font-semibold leading-none">TIME (IST)</div>
          <div className="text-base font-black text-white font-mono leading-tight tracking-tight">
            {formatMinutesToHHMM(currentMins)}
          </div>
        </div>
      </div>
    </div>
  );
};

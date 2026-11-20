/**
 * DOMINO SKY - Slide Options View Switcher (Dark Ops Theme)
 * Operations center navigation bar across Map, Manifest Table, Rotations, Analytics, Impact, and AI Dispatcher.
 */

import React from 'react';
import { Map, TableProperties, Clock, BarChart3, Users, Bot } from 'lucide-react';

export type ActiveSlideOption = 'map' | 'table' | 'timeline' | 'analytics' | 'impact' | 'dispatcher';

interface ViewSliderBarProps {
  activeSlide: ActiveSlideOption;
  onChangeSlide: (slide: ActiveSlideOption) => void;
  delayedCount: number;
  strandedPax: number;
  recommendationsCount: number;
  totalFlightsCount: number;
}

export const ViewSliderBar: React.FC<ViewSliderBarProps> = ({
  activeSlide,
  onChangeSlide,
  delayedCount,
  strandedPax,
  recommendationsCount,
  totalFlightsCount,
}) => {
  const options = [
    {
      id: 'map' as ActiveSlideOption,
      label: 'Network Map',
      icon: Map,
      badge: delayedCount > 0 ? `${delayedCount} late` : 'Normal',
      badgeColor: delayedCount > 0 ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800',
    },
    {
      id: 'table' as ActiveSlideOption,
      label: 'Flight Table',
      icon: TableProperties,
      badge: `${totalFlightsCount} flights`,
      badgeColor: 'bg-[#182235] text-slate-300 border border-[#334155]',
    },
    {
      id: 'timeline' as ActiveSlideOption,
      label: 'Rotations',
      icon: Clock,
      badge: '16 Tails',
      badgeColor: 'bg-[#182235] text-slate-300 border border-[#334155]',
    },
    {
      id: 'analytics' as ActiveSlideOption,
      label: 'Analytics',
      icon: BarChart3,
      badge: 'Charts',
      badgeColor: 'bg-cyan-950 text-cyan-300 border border-cyan-800',
    },
    {
      id: 'impact' as ActiveSlideOption,
      label: 'Passenger Impact',
      icon: Users,
      badge: strandedPax > 0 ? `${strandedPax} stranded` : '0 stranded',
      badgeColor: strandedPax > 0 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800',
    },
    {
      id: 'dispatcher' as ActiveSlideOption,
      label: 'AI Dispatcher',
      icon: Bot,
      badge: recommendationsCount > 0 ? `${recommendationsCount} plans` : 'Ready',
      badgeColor: 'bg-indigo-950 text-indigo-300 border border-indigo-800',
    },
  ];

  return (
    <div className="w-full flex items-center justify-center">
      <div className="bg-[#111827] p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl border border-[#1e293b] max-w-4xl w-full overflow-x-auto">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = activeSlide === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => onChangeSlide(opt.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 relative select-none cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#182235] text-white shadow-md font-bold border border-[#334155]'
                  : 'text-slate-400 hover:text-white hover:bg-[#182235]/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{opt.label}</span>

              {/* Status Badge */}
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-medium ${opt.badgeColor} hidden md:inline`}
              >
                {opt.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

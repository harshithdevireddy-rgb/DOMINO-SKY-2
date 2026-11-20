/**
 * DOMINO SKY - Configuration Constants & Assumptions (Light Theme)
 * Single source of truth for simulation rules, timing constraints, and presets.
 */

export const SIMULATION_CONFIG = {
  MIN_TURNAROUND_MINUTES: 30,
  MAX_CREW_DUTY_MINS: 600, // 10 hours legal duty limit
  CREW_DUTY_WARNING_THRESHOLD_MINS: 540, // 9 hours -> amber warning
  SEATS_PER_AIRCRAFT: 180,
  DEFAULT_DATASET_URL: '/data/flight_network.json',
  DAY_START_TIME: '05:00',
  DAY_END_TIME: '23:59',
} as const;

export interface AirportTierConfig {
  radius: number;
  label: string;
  badgeColor: string;
}

export const AIRPORT_TIERS: Record<'mega_hub' | 'regional_hub' | 'spoke', AirportTierConfig> = {
  mega_hub: {
    radius: 9,
    label: 'Mega Hub',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  regional_hub: {
    radius: 6.5,
    label: 'Regional Hub',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  spoke: {
    radius: 4.5,
    label: 'Spoke',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export interface DisruptionPreset {
  id: string;
  title: string;
  subtitle: string;
  airport: string;
  startTime: string;
  endTime: string;
  tag: 'Severe' | 'Moderate' | 'Local' | 'Test';
  description: string;
}

export const DISRUPTION_PRESETS: DisruptionPreset[] = [
  {
    id: 'bom-severe-storm',
    title: 'Mumbai Severe Storm',
    subtitle: '07:30 – 10:30 (3 hr ground stop)',
    airport: 'BOM',
    startTime: '07:30',
    endTime: '10:30',
    tag: 'Severe',
    description: 'Extended monsoon squall over CSMI Airport halting morning departure/arrival bank. Triggers massive domino cascade across 25 flights and 2 crew duty breaches.',
  },
  {
    id: 'bom-thunderstorm',
    title: 'Mumbai Morning Thunderstorm',
    subtitle: '09:00 – 10:30 (90 min squall)',
    airport: 'BOM',
    startTime: '09:00',
    endTime: '10:30',
    tag: 'Moderate',
    description: 'A 90-minute thunderstorm during the mid-morning peak. Delays 7 flights by 280 total minutes without crew duty breaches.',
  },
  {
    id: 'del-morning-fog',
    title: 'Delhi Dense Fog / Runway Work',
    subtitle: '08:00 – 10:00 (2 hr closure)',
    airport: 'DEL',
    startTime: '08:00',
    endTime: '10:00',
    tag: 'Moderate',
    description: 'Early morning CAT-III fog closure in northern India. Causes 500 min delay and strands 37 connecting passengers across 7 flights.',
  },
  {
    id: 'blr-afternoon-groundstop',
    title: 'Bengaluru Fog / Weather Stop',
    subtitle: '12:00 – 14:00 (2 hr closure)',
    airport: 'BLR',
    startTime: '12:00',
    endTime: '14:00',
    tag: 'Severe',
    description: 'Midday closure in Kempegowda International. Delays 8 flights by 415 minutes, breaks connections for 89 passengers, and breaches Crew CR06 (630 min).',
  },
  {
    id: 'hyd-short-closure',
    title: 'Hyderabad Runway Maintenance',
    subtitle: '13:00 – 15:00 (2 hr closure)',
    airport: 'HYD',
    startTime: '13:00',
    endTime: '15:00',
    tag: 'Local',
    description: 'Afternoon closure with minimal downstream traffic, delaying 1 flight by 25 minutes and 0 stranded passengers.',
  },
];

export const STATUS_COLORS = {
  onTime: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    hex: '#059669',
    label: 'On Time',
  },
  slightDelay: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    hex: '#d97706',
    label: 'Slight Delay (1-30m)',
  },
  severeDelay: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    hex: '#e11d48',
    label: 'Severe Delay (>30m)',
  },
  cancelled: {
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-500 line-through',
    hex: '#64748b',
    label: 'Cancelled',
  },
} as const;

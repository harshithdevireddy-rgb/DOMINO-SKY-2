/**
 * DOMINO SKY - Simulation Engine Types
 */

import { Airport, Flight, Connection, Crew, SpareAircraft, FlightNetworkDataset } from '../data/loader';

export type DelayCauseType =
  | 'AIRPORT_CLOSURE'
  | 'LATE_INBOUND_AIRCRAFT'
  | 'CREW_DUTY_LIMIT'
  | 'CANCELLED_UPSTREAM'
  | 'RECOVERY_CANCELLATION'
  | 'RECOVERY_HOLD';

export interface CauseChainNode {
  flightId?: string;
  tailId?: string;
  route?: string;
  delayMinutes: number;
  type: DelayCauseType;
  description: string;
}

export interface FlightDelayCause {
  type: DelayCauseType;
  upstreamFlightId: string | null;
  minutesContributed: number;
  totalDelay: number;
  sentence: string;
  chain: CauseChainNode[];
}

export type FlightStatus = 'on_time' | 'delayed' | 'cancelled';

export interface SimulatedFlight {
  flight_id: string;
  tail_id: string;
  leg_order: number;
  origin: string;
  destination: string;
  schedDep: string; // HH:MM
  schedArr: string; // HH:MM
  schedDepMins: number;
  schedArrMins: number;
  actualDep: string; // HH:MM
  actualArr: string; // HH:MM
  actualDepMins: number;
  actualArrMins: number;
  block_minutes: number;
  pax: number;
  turnaround_before_min: number | null;
  delayMinutes: number;
  status: FlightStatus;
  cause: FlightDelayCause | null;
  slackAbsorbedMinutes: number;
}

export interface ConnectionImpact {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  min_connect_minutes: number;
  fromArrivalMins: number;
  toDepartureMins: number;
  actualConnectMinutes: number;
  isBroken: boolean;
  reason?: 'missed_connection' | 'flight_cancelled';
}

export type CrewDutyStatus = 'ok' | 'warning' | 'breached';

export interface SimulatedCrew {
  crew_id: string;
  tail_id: string;
  base: string;
  duty_start: string;
  dutyStartMins: number;
  dutyEndMins: number;
  dutyEnd: string;
  dutyUsedMinutes: number;
  maxDutyMins: number;
  slackMinutes: number;
  status: CrewDutyStatus;
  breachedFlightId: string | null;
}

export interface StrandedPaxBreakdown {
  total: number;
  byReason: {
    cancelledFlights: number;
    missedConnections: number;
  };
  byAirport: Record<string, number>;
  brokenConnections: ConnectionImpact[];
  cancelledFlightsList: Array<{ flightId: string; origin: string; destination: string; pax: number; reason: string }>;
}

export interface AircraftTimeline {
  tail_id: string;
  baseAirport: string;
  totalDelayMinutes: number;
  flights: SimulatedFlight[];
  spareReplacedBy?: string;
}

export interface SimulationParams {
  closedAirport: string | null;
  closureStart: string | null; // HH:MM
  closureEnd: string | null;   // HH:MM
  cancelOnCrewBreach?: boolean; // Default false (reference table mode flags breaches only)
  appliedActions?: SimulationOverrides;
}

export interface SimulationOverrides {
  cancelledFlightIds?: string[];
  spareAircraftSwaps?: Array<{
    spareTailId: string; // VT-DS17 or VT-DS18
    targetTailId: string;
    fromFlightId: string;
  }>;
  flightHolds?: Array<{
    flightId: string;
    holdUntilMins: number;
  }>;
}

export type NetworkDisruptionLevel = 'NORMAL' | 'MINOR' | 'MAJOR' | 'CRITICAL';

export interface AirportOperationalLoad {
  airportId: string;
  name: string;
  city: string;
  capacityPerHour: number;
  incomingCount: number;
  outgoingCount: number;
  totalMovements: number;
  affectedFlightsCount: number;
  affectedPaxCount: number;
  peakHourMovements: number;
  status: 'normal' | 'disrupted' | 'closed';
}

export interface SimulationResult {
  params: SimulationParams;
  flights: Record<string, SimulatedFlight>;
  timelines: Record<string, AircraftTimeline>;
  crews: Record<string, SimulatedCrew>;
  connections: ConnectionImpact[];
  airportLoads: Record<string, AirportOperationalLoad>;
  metrics: {
    totalFlights: number;
    delayedCount: number;
    cancelledCount: number;
    onTimeCount: number;
    totalDelayMinutes: number;
    maxDelayMinutes: number;
    averageDelayMinutes: number;
    aircraftAffectedCount: number;
    paxDelayedCount: number;
    paxCancelledCount: number;
    paxMissedConnCount: number;
    totalImpactedPax: number;
    networkStatus: NetworkDisruptionLevel;
    strandedPax: StrandedPaxBreakdown;
    crewBreachesCount: number;
    crewWarningsCount: number;
  };
  causeGraph: {
    nodes: Array<{ id: string; label: string; type: string; delay: number }>;
    edges: Array<{ from: string; to: string; delayPassed: number }>;
  };
}

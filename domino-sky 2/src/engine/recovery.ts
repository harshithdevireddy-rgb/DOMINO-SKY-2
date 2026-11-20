/**
 * DOMINO SKY - Recovery Action Generator and Scorer
 * Generates candidate recovery actions and scores each by deterministic re-simulation.
 */

import { FlightNetworkDataset } from '../data/loader';
import { runSimulation } from './index';
import { SimulationParams, SimulationResult, SimulationOverrides } from './types';

export type ActionType =
  | 'SPARE_AIRCRAFT_SWAP'
  | 'CANCEL_FLIGHT'
  | 'HOLD_CONNECTION'
  | 'TAIL_SWAP';

export interface CandidateAction {
  id: string;
  type: ActionType;
  title: string;
  summary: string;
  overrides: SimulationOverrides;
  targetFlightId?: string;
  targetTailId?: string;
  spareTailId?: string;
  assumptions: string[];
  metricsAfter: {
    delayedCount: number;
    cancelledCount: number;
    totalDelayMinutes: number;
    maxDelayMinutes: number;
    strandedPax: number;
    crewBreaches: number;
  };
  delta: {
    delayMinutesSaved: number;
    strandedPaxSaved: number;
    cancelledChange: number;
    crewBreachesSaved: number;
    score: number;
  };
}

export function generateCandidateActions(
  dataset: FlightNetworkDataset,
  baseParams: SimulationParams,
  baseResult: SimulationResult
): CandidateAction[] {
  const candidates: CandidateAction[] = [];
  const baseMetrics = baseResult.metrics;

  // If no delays or disruption, no recovery actions needed
  if (baseMetrics.delayedCount === 0 && baseMetrics.strandedPax.total === 0 && baseMetrics.crewBreachesCount === 0) {
    return [];
  }

  // 1. Candidate Spare Aircraft Swaps
  // VT-DS17 (base BLR), VT-DS18 (base DEL)
  dataset.spare_aircraft.forEach((spare) => {
    // Find delayed aircraft that pass through spare's base airport
    Object.values(baseResult.flights).forEach((flight) => {
      // Must be at the spare base, delayed, and have downstream legs
      if (flight.origin === spare.base && (flight.delayMinutes > 20 || baseResult.crews[flight.tail_id]?.status === 'breached')) {
        const overrides: SimulationOverrides = {
          spareAircraftSwaps: [
            {
              spareTailId: spare.tail_id,
              targetTailId: flight.tail_id,
              fromFlightId: flight.flight_id,
            },
          ],
        };

        const simAfter = runSimulation(dataset, {
          ...baseParams,
          appliedActions: overrides,
        });

        const delaySaved = baseMetrics.totalDelayMinutes - simAfter.metrics.totalDelayMinutes;
        const paxSaved = baseMetrics.strandedPax.total - simAfter.metrics.strandedPax.total;
        const crewBreachesSaved = baseMetrics.crewBreachesCount - simAfter.metrics.crewBreachesCount;

        // Composite scoring formula favoring passenger strandedness and crew legality
        const score = delaySaved + paxSaved * 3 + crewBreachesSaved * 500;

        if (score > 0 || delaySaved > 0 || paxSaved > 0 || crewBreachesSaved > 0) {
          candidates.push({
            id: `swap-${spare.tail_id}-${flight.flight_id}`,
            type: 'SPARE_AIRCRAFT_SWAP',
            title: `Deploy Spare ${spare.tail_id} at ${spare.base}`,
            summary: `Deploy standby aircraft ${spare.tail_id} from ${spare.base} starting at flight ${flight.flight_id} (${flight.origin}→${flight.destination}) to reset aircraft rotation and relieve fatigued crew.`,
            overrides,
            targetFlightId: flight.flight_id,
            targetTailId: flight.tail_id,
            spareTailId: spare.tail_id,
            assumptions: [
              `Spare ${spare.tail_id} is stationed at ${spare.base} with 180 seats.`,
              'Spare comes with fresh standby crew whose duty clock starts at takeover.',
            ],
            metricsAfter: {
              delayedCount: simAfter.metrics.delayedCount,
              cancelledCount: simAfter.metrics.cancelledCount,
              totalDelayMinutes: simAfter.metrics.totalDelayMinutes,
              maxDelayMinutes: simAfter.metrics.maxDelayMinutes,
              strandedPax: simAfter.metrics.strandedPax.total,
              crewBreaches: simAfter.metrics.crewBreachesCount,
            },
            delta: {
              delayMinutesSaved: delaySaved,
              strandedPaxSaved: paxSaved,
              cancelledChange: simAfter.metrics.cancelledCount - baseMetrics.cancelledCount,
              crewBreachesSaved,
              score,
            },
          });
        }
      }
    });
  });

  // 2. Candidate Strategic Flight Cancellations
  // Identify severely delayed flights where cancellation stops the domino effect
  const sortedDelayed = Object.values(baseResult.flights)
    .filter((f) => f.delayMinutes >= 45)
    .sort((a, b) => b.delayMinutes - a.delayMinutes);

  sortedDelayed.slice(0, 4).forEach((flight) => {
    const overrides: SimulationOverrides = {
      cancelledFlightIds: [flight.flight_id],
    };

    const simAfter = runSimulation(dataset, {
      ...baseParams,
      appliedActions: overrides,
    });

    const delaySaved = baseMetrics.totalDelayMinutes - simAfter.metrics.totalDelayMinutes;
    const paxSaved = baseMetrics.strandedPax.total - simAfter.metrics.strandedPax.total;
    const crewBreachesSaved = baseMetrics.crewBreachesCount - simAfter.metrics.crewBreachesCount;

    // Cancellation adds stranded pax from this flight, so score weighs net delay savings
    const score = delaySaved * 0.8 - flight.pax * 1.5 + crewBreachesSaved * 300;

    candidates.push({
      id: `cancel-${flight.flight_id}`,
      type: 'CANCEL_FLIGHT',
      title: `Tactical Cancellation of ${flight.flight_id}`,
      summary: `Cancel flight ${flight.flight_id} (${flight.origin}→${flight.destination}, ${flight.pax} pax) to stop severe downstream cascading delays on aircraft ${flight.tail_id}.`,
      overrides,
      targetFlightId: flight.flight_id,
      targetTailId: flight.tail_id,
      assumptions: [
        `Cancelling flight ${flight.flight_id} strands its ${flight.pax} booked passengers.`,
        'Prevents cumulative turnaround delay from propagating to remaining legs.',
      ],
      metricsAfter: {
        delayedCount: simAfter.metrics.delayedCount,
        cancelledCount: simAfter.metrics.cancelledCount,
        totalDelayMinutes: simAfter.metrics.totalDelayMinutes,
        maxDelayMinutes: simAfter.metrics.maxDelayMinutes,
        strandedPax: simAfter.metrics.strandedPax.total,
        crewBreaches: simAfter.metrics.crewBreachesCount,
      },
      delta: {
        delayMinutesSaved: delaySaved,
        strandedPaxSaved: paxSaved,
        cancelledChange: simAfter.metrics.cancelledCount - baseMetrics.cancelledCount,
        crewBreachesSaved,
        score,
      },
    });
  });

  // 3. Candidate Flight Holds for Broken Connections
  baseResult.metrics.strandedPax.brokenConnections.forEach((conn) => {
    const fromF = baseResult.flights[conn.from_flight];
    const toF = baseResult.flights[conn.to_flight];
    if (fromF && toF && fromF.status !== 'cancelled' && toF.status !== 'cancelled') {
      const neededDepMins = fromF.actualArrMins + conn.min_connect_minutes;
      const additionalHoldMins = neededDepMins - toF.actualDepMins;

      // Only hold if reasonable (< 35 min) to avoid blowing up the next chain
      if (additionalHoldMins > 0 && additionalHoldMins <= 35) {
        const overrides: SimulationOverrides = {
          flightHolds: [
            {
              flightId: toF.flight_id,
              holdUntilMins: neededDepMins,
            },
          ],
        };

        const simAfter = runSimulation(dataset, {
          ...baseParams,
          appliedActions: overrides,
        });

        const delaySaved = baseMetrics.totalDelayMinutes - simAfter.metrics.totalDelayMinutes;
        const paxSaved = baseMetrics.strandedPax.total - simAfter.metrics.strandedPax.total;
        const crewBreachesSaved = baseMetrics.crewBreachesCount - simAfter.metrics.crewBreachesCount;
        const score = paxSaved * 4 + delaySaved + crewBreachesSaved * 300;

        if (paxSaved > 0) {
          candidates.push({
            id: `hold-${toF.flight_id}-for-${fromF.flight_id}`,
            type: 'HOLD_CONNECTION',
            title: `Hold ${toF.flight_id} by ${additionalHoldMins}m at ${conn.airport}`,
            summary: `Hold departure of flight ${toF.flight_id} at ${conn.airport} for ${additionalHoldMins}m so ${conn.passengers} passengers from arriving flight ${fromF.flight_id} make their connection.`,
            overrides,
            targetFlightId: toF.flight_id,
            targetTailId: toF.tail_id,
            assumptions: [
              `Target flight ${toF.flight_id} held until ${neededDepMins % 60}m past the hour.`,
              'Protects high-value connecting passengers at moderate downstream delay cost.',
            ],
            metricsAfter: {
              delayedCount: simAfter.metrics.delayedCount,
              cancelledCount: simAfter.metrics.cancelledCount,
              totalDelayMinutes: simAfter.metrics.totalDelayMinutes,
              maxDelayMinutes: simAfter.metrics.maxDelayMinutes,
              strandedPax: simAfter.metrics.strandedPax.total,
              crewBreaches: simAfter.metrics.crewBreachesCount,
            },
            delta: {
              delayMinutesSaved: delaySaved,
              strandedPaxSaved: paxSaved,
              cancelledChange: simAfter.metrics.cancelledCount - baseMetrics.cancelledCount,
              crewBreachesSaved,
              score,
            },
          });
        }
      }
    }
  });

  // Sort candidates by score descending
  return candidates.sort((a, b) => b.delta.score - a.delta.score);
}

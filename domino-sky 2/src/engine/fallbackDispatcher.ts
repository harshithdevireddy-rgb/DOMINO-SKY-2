/**
 * DOMINO SKY - Deterministic Rule-Based Fallback Dispatcher
 * Provides warm, calm, human-sounding flight operations recommendations
 * when no LLM API key is configured or during network timeouts.
 * Guarantees zero hallucinations and 100% mathematical fidelity.
 */

import { CandidateAction } from './recovery';
import { SimulationResult } from './types';

export interface DispatcherResponse {
  recommendations: Array<{
    actionId: string;
    rank: number;
    explanation: string;
  }>;
  summary: string;
  mode: 'ai_claude' | 'rule_based_fallback';
  rawInput?: unknown;
  rawOutput?: unknown;
}

export function generateFallbackDispatch(
  baseResult: SimulationResult,
  candidates: CandidateAction[]
): DispatcherResponse {
  const { metrics, params } = baseResult;

  if (candidates.length === 0) {
    return {
      mode: 'rule_based_fallback',
      summary: 'Flight operations are running completely on schedule with no cascading delays or stranded passengers detected.',
      recommendations: [],
    };
  }

  const topCandidates = candidates.slice(0, 3);
  const airportName = params.closedAirport || 'the affected hub';

  const recommendations = topCandidates.map((cand, idx) => {
    let explanation = '';
    const d = cand.delta;

    if (cand.type === 'SPARE_AIRCRAFT_SWAP') {
      explanation = `Deploying standby aircraft ${cand.spareTailId} cuts ${d.delayMinutesSaved} minutes of accumulated cascading delay and restores flight integrity for ${d.strandedPaxSaved} passengers${
        d.crewBreachesSaved > 0 ? `, while preventing ${d.crewBreachesSaved} crew duty breach` : ''
      }. The fresh flight crew takes over on schedule with zero duty fatigue.`;
    } else if (cand.type === 'HOLD_CONNECTION') {
      explanation = `Holding flight ${cand.targetFlightId} protects ${d.strandedPaxSaved} connecting passengers who would otherwise be stranded overnight, incurring only a modest ${Math.abs(d.delayMinutesSaved)}m downstream delay absorbed by upcoming turnaround slack.`;
    } else if (cand.type === 'CANCEL_FLIGHT') {
      explanation = `Tactically cancelling flight ${cand.targetFlightId} stops the domino effect across the aircraft's remaining rotation, saving ${d.delayMinutesSaved} minutes across the network at the cost of rebooking ${cand.assumptions[0].split(' ')[4] || 'affected'} passengers.`;
    } else {
      explanation = `Executing this intervention recovers ${d.delayMinutesSaved} minutes of schedule buffer and protects ${d.strandedPaxSaved} passengers across downstream airports.`;
    }

    return {
      actionId: cand.id,
      rank: idx + 1,
      explanation,
    };
  });

  const top = topCandidates[0];
  const summary = `Network disruption from ${airportName} is currently propagating across ${metrics.delayedCount} flights with ${metrics.totalDelayMinutes} minutes of total delay and ${metrics.strandedPax.total} stranded passengers. Our highest priority recovery action is "${top.title}", which recovers ${top.delta.delayMinutesSaved} minutes of delay and protects ${top.delta.strandedPaxSaved} passengers.`;

  return {
    mode: 'rule_based_fallback',
    summary,
    recommendations,
  };
}

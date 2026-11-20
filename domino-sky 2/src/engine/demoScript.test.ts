import { describe, it, expect, beforeAll } from 'vitest';
import { loadFlightNetwork, FlightNetworkDataset } from '../data/loader';
import { RAW_FLIGHT_NETWORK } from '../data/rawDataset';
import { runSimulation } from './index';
import { generateCandidateActions } from './recovery';
import { generateFallbackDispatch } from './fallbackDispatcher';
import { guardAIText, buildGroundTruthContext } from './numberGuard';

describe('Demo Script End-to-End Flow Verification', () => {
  let dataset: FlightNetworkDataset;

  beforeAll(() => {
    dataset = loadFlightNetwork(RAW_FLIGHT_NETWORK);
  });

  it('Step 1 & 2: Close Mumbai 07:30–10:30 and verify exact propagation metrics', () => {
    const sim = runSimulation(dataset, {
      closedAirport: 'BOM',
      closureStart: '07:30',
      closureEnd: '10:30',
    });

    expect(sim.metrics.delayedCount).toBe(25);
    expect(sim.metrics.totalDelayMinutes).toBe(2790);
    expect(sim.metrics.strandedPax.total).toBe(266);
    expect(sim.metrics.crewBreachesCount).toBe(2);
    expect(sim.crews['CR04'].status).toBe('breached');
    expect(sim.crews['CR12'].status).toBe('breached');
  });

  it('Step 3 & 4: Late flight in clear-weather city traces its cause back to Mumbai', () => {
    const sim = runSimulation(dataset, {
      closedAirport: 'BOM',
      closureStart: '07:30',
      closureEnd: '10:30',
    });

    // Pick flight DS0704 (BLR -> HYD), operating in Bengaluru & Hyderabad (clear skies)
    const f = sim.flights['DS0704'];
    expect(f).toBeDefined();
    expect(f.delayMinutes).toBeGreaterThan(0);
    expect(f.origin).toBe('BLR');
    expect(f.destination).toBe('HYD');

    // The flight must trace its cause back to BOM closure
    expect(f.cause).toBeDefined();
    const chain = f.cause!.chain;
    expect(chain.length).toBeGreaterThan(1);
    expect(chain[0].type).toBe('AIRPORT_CLOSURE');
    expect(chain[0].description).toContain('BOM');
  });

  it('Step 5: Ask Dispatcher, get recommendations, verify Number Guard validation', () => {
    const sim = runSimulation(dataset, {
      closedAirport: 'BOM',
      closureStart: '07:30',
      closureEnd: '10:30',
    });

    const candidates = generateCandidateActions(dataset, sim.params, sim);
    expect(candidates.length).toBeGreaterThan(0);

    const fallback = generateFallbackDispatch(sim, candidates);
    expect(fallback.recommendations.length).toBeGreaterThan(0);

    // Number Guard verification
    const topRec = fallback.recommendations[0];
    const topAction = candidates.find((c) => c.id === topRec.actionId)!;
    const context = buildGroundTruthContext(
      {
        totalDelayMinutes: sim.metrics.totalDelayMinutes,
        delayedCount: sim.metrics.delayedCount,
        cancelledCount: sim.metrics.cancelledCount,
        strandedPax: sim.metrics.strandedPax.total,
        crewBreaches: sim.metrics.crewBreachesCount,
      },
      topAction.metricsAfter
    );

    const guarded = guardAIText(topRec.explanation, context, topAction.id);
    expect(guarded.verifiedText).toBeDefined();
    expect(guarded.verifiedText.length).toBeGreaterThan(20);
  });

  it('Step 6: Apply top recommendation and verify Before vs After deltas', () => {
    const sim = runSimulation(dataset, {
      closedAirport: 'BOM',
      closureStart: '07:30',
      closureEnd: '10:30',
    });

    const candidates = generateCandidateActions(dataset, sim.params, sim);
    const topAction = candidates[0];

    const simAfter = runSimulation(dataset, {
      ...sim.params,
      appliedActions: topAction.overrides,
    });

    // Delays and stranded passengers are significantly reduced
    expect(simAfter.metrics.totalDelayMinutes).toBeLessThan(sim.metrics.totalDelayMinutes);
    expect(topAction.delta.delayMinutesSaved).toBe(
      sim.metrics.totalDelayMinutes - simAfter.metrics.totalDelayMinutes
    );
    expect(topAction.delta.strandedPaxSaved).toBe(
      sim.metrics.strandedPax.total - simAfter.metrics.strandedPax.total
    );
  });
});

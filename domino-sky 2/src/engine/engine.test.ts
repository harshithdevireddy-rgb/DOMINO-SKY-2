import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadFlightNetwork, FlightNetworkDataset } from '../data/loader';
import { runSimulation } from './index';

describe('Simulation Engine - Golden Reference Tests', () => {
  let dataset: FlightNetworkDataset;

  beforeAll(() => {
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../../data/flight_network.json'),
      'utf-8'
    );
    dataset = loadFlightNetwork(raw);
  });

  it('Scenario 1: Baseline (No closure) produces zero delays, zero stranded pax, zero crew breaches', () => {
    const res = runSimulation(dataset, {
      closedAirport: null,
      closureStart: null,
      closureEnd: null,
    });

    expect(res.metrics.delayedCount).toBe(0);
    expect(res.metrics.totalDelayMinutes).toBe(0);
    expect(res.metrics.maxDelayMinutes).toBe(0);
    expect(res.metrics.strandedPax.total).toBe(0);
    expect(res.metrics.crewBreachesCount).toBe(0);
    expect(res.metrics.cancelledCount).toBe(0);
    expect(res.metrics.onTimeCount).toBe(70);
  });

  it('Scenario 2: BOM 09:00–10:30 matches golden reference (7 delayed, 280 total, 80 max, 0 stranded, 0 crew breaches)', () => {
    const res = runSimulation(dataset, {
      closedAirport: 'BOM',
      closureStart: '09:00',
      closureEnd: '10:30',
    });

    expect(res.metrics.delayedCount).toBe(7);
    expect(res.metrics.totalDelayMinutes).toBe(280);
    expect(res.metrics.maxDelayMinutes).toBe(80);
    expect(res.metrics.strandedPax.total).toBe(0);
    expect(res.metrics.crewBreachesCount).toBe(0);
  });

  it('Scenario 3: DEL 08:00–10:00 matches golden reference (7 delayed, 500 total, 120 max, 37 stranded, 0 crew breaches)', () => {
    const res = runSimulation(dataset, {
      closedAirport: 'DEL',
      closureStart: '08:00',
      closureEnd: '10:00',
    });

    expect(res.metrics.delayedCount).toBe(7);
    expect(res.metrics.totalDelayMinutes).toBe(500);
    expect(res.metrics.maxDelayMinutes).toBe(120);
    expect(res.metrics.strandedPax.total).toBe(37);
    expect(res.metrics.strandedPax.byReason.missedConnections).toBe(37);
    expect(res.metrics.crewBreachesCount).toBe(0);
  });

  it('Scenario 4: BLR 12:00–14:00 matches golden reference (8 delayed, 415 total, 120 max, 89 stranded, CR06 breached at 630m)', () => {
    const res = runSimulation(dataset, {
      closedAirport: 'BLR',
      closureStart: '12:00',
      closureEnd: '14:00',
    });

    expect(res.metrics.delayedCount).toBe(8);
    expect(res.metrics.totalDelayMinutes).toBe(415);
    expect(res.metrics.maxDelayMinutes).toBe(120);
    expect(res.metrics.strandedPax.total).toBe(89);
    expect(res.metrics.strandedPax.byReason.missedConnections).toBe(89);
    expect(res.metrics.crewBreachesCount).toBe(1);

    const cr06 = res.crews['CR06'];
    expect(cr06).toBeDefined();
    expect(cr06.status).toBe('breached');
    expect(cr06.dutyUsedMinutes).toBe(630);
  });

  it('Scenario 5: HYD 13:00–15:00 matches golden reference (1 delayed, 25 total, 25 max, 0 stranded, 0 crew breaches)', () => {
    const res = runSimulation(dataset, {
      closedAirport: 'HYD',
      closureStart: '13:00',
      closureEnd: '15:00',
    });

    expect(res.metrics.delayedCount).toBe(1);
    expect(res.metrics.totalDelayMinutes).toBe(25);
    expect(res.metrics.maxDelayMinutes).toBe(25);
    expect(res.metrics.strandedPax.total).toBe(0);
    expect(res.metrics.crewBreachesCount).toBe(0);
  });

  it('Scenario 6: BOM 07:30–10:30 matches golden reference (25 delayed, 2790 total, 266 stranded, 2 crew breaches)', () => {
    const res = runSimulation(dataset, {
      closedAirport: 'BOM',
      closureStart: '07:30',
      closureEnd: '10:30',
    });

    expect(res.metrics.delayedCount).toBe(25);
    expect(res.metrics.totalDelayMinutes).toBe(2790);
    expect(res.metrics.strandedPax.total).toBe(266);
    expect(res.metrics.crewBreachesCount).toBe(2);

    const cr04 = res.crews['CR04'];
    const cr12 = res.crews['CR12'];
    expect(cr04.status).toBe('breached');
    expect(cr12.status).toBe('breached');
  });

  it('Engine is strictly deterministic: multiple runs produce identical outputs', () => {
    const run1 = runSimulation(dataset, {
      closedAirport: 'BOM',
      closureStart: '07:30',
      closureEnd: '10:30',
    });
    const run2 = runSimulation(dataset, {
      closedAirport: 'BOM',
      closureStart: '07:30',
      closureEnd: '10:30',
    });

    expect(run1.metrics).toEqual(run2.metrics);
    expect(JSON.stringify(run1.flights)).toBe(JSON.stringify(run2.flights));
  });

  it('Slack absorbs delay: checks turnaround buffer reduction along an aircraft chain', () => {
    const res = runSimulation(dataset, {
      closedAirport: 'BOM',
      closureStart: '09:00',
      closureEnd: '10:30',
    });

    // Check flight DS0702 (departs BOM at 09:10, delayed to 10:30 -> 80m delay)
    const f02 = res.flights['DS0702'];
    expect(f02).toBeDefined();
    expect(f02.delayMinutes).toBe(80);

    // DS0703 has scheduled turnaround 70 min (40 min buffer over 30 min minimum)
    // Sched dep 11:45, act arr of DS0702 was 11:55, so earliest dep = 11:55 + 30 = 12:25 (delay = 40m)
    // Delay absorbed: 80 - 40 = 40 min buffer absorbed!
    const f03 = res.flights['DS0703'];
    expect(f03).toBeDefined();
    expect(f03.delayMinutes).toBe(40);
    expect(f03.slackAbsorbedMinutes).toBe(40);
  });

  it('Cause chain accurately traces every delayed flight back to root cause', () => {
    const res = runSimulation(dataset, {
      closedAirport: 'BOM',
      closureStart: '09:00',
      closureEnd: '10:30',
    });

    const f04 = res.flights['DS0704'];
    expect(f04).toBeDefined();
    expect(f04.cause).toBeDefined();
    expect(f04.cause?.chain.length).toBeGreaterThanOrEqual(2);
    // Root of chain was airport closure
    expect(f04.cause?.chain[0].type).toBe('AIRPORT_CLOSURE');
  });

  it('Handles edge cases gracefully without crashing', () => {
    // Start time after end time
    const res1 = runSimulation(dataset, {
      closedAirport: 'BOM',
      closureStart: '10:00',
      closureEnd: '08:00',
    });
    expect(res1.metrics.totalDelayMinutes).toBe(0);

    // Airport with no flights
    const res2 = runSimulation(dataset, {
      closedAirport: 'NONEXISTENT',
      closureStart: '08:00',
      closureEnd: '12:00',
    });
    expect(res2.metrics.totalDelayMinutes).toBe(0);

    // Closure covering entire day
    const res3 = runSimulation(dataset, {
      closedAirport: 'DEL',
      closureStart: '00:00',
      closureEnd: '23:59',
    });
    expect(res3.metrics.delayedCount).toBeGreaterThan(0);
  });
});

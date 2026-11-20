import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  loadFlightNetwork,
  validateFlightNetwork,
  parseHHMMToMinutes,
  formatMinutesToHHMM,
} from './loader';

describe('Data Loader and Validation', () => {
  it('parses and formats HH:MM times accurately', () => {
    expect(parseHHMMToMinutes('00:00')).toBe(0);
    expect(parseHHMMToMinutes('06:30')).toBe(390);
    expect(parseHHMMToMinutes('21:45')).toBe(1305);
    expect(formatMinutesToHHMM(390)).toBe('06:30');
    expect(formatMinutesToHHMM(1305)).toBe('21:45');
    expect(() => parseHHMMToMinutes('25:00')).toThrow();
    expect(() => parseHHMMToMinutes('12:60')).toThrow();
    expect(() => parseHHMMToMinutes('invalid')).toThrow();
  });

  it('loads and strictly validates the actual flight_network.json dataset', () => {
    const filePath = path.resolve(__dirname, '../../data/flight_network.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    const dataset = loadFlightNetwork(content);

    expect(dataset.airports).toHaveLength(16);
    expect(dataset.flights).toHaveLength(70);
    expect(dataset.connections).toHaveLength(21);
    expect(dataset.crews).toHaveLength(16);
    expect(dataset.spare_aircraft).toHaveLength(2);

    // Total pax across all 70 flights
    const totalPax = dataset.flights.reduce((sum, f) => sum + f.pax, 0);
    expect(totalPax).toBe(10394);

    // Spare aircraft verification
    expect(dataset.spare_aircraft.map((s) => s.tail_id)).toEqual(['VT-DS17', 'VT-DS18']);
  });

  it('reports validation errors when data is corrupt or invalid', () => {
    const invalidData = {
      meta: { operating_day: 'today', min_turnaround_minutes: -5, seats_per_aircraft: 180 },
      airports: [{ id: 'DEL', name: 'Delhi', city: 'Delhi', lat: 200, lng: 77, tier: 'invalid_tier', capacity_per_hour: 40 }],
      flights: [{ flight_id: 'DS9999', tail_id: 'VT-XX', leg_order: 1, origin: 'DEL', destination: 'UNKNOWN', dep: '08:00', arr: '09:00', block_minutes: 60, pax: 100 }],
      connections: [],
      crews: [],
      spare_aircraft: [],
    };

    const result = validateFlightNetwork(invalidData);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('min_turnaround_minutes'))).toBe(true);
    expect(result.errors.some((e) => e.includes('invalid lat'))).toBe(true);
    expect(result.errors.some((e) => e.includes('invalid tier'))).toBe(true);
    expect(result.errors.some((e) => e.includes('unknown destination airport'))).toBe(true);
  });
});

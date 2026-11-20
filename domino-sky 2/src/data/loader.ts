/**
 * DOMINO SKY - Typed Dataset Loader & Schema Validator
 * Validates the flight network dataset with granular error reporting.
 */

export type AirportTier = 'mega_hub' | 'regional_hub' | 'spoke';

export interface MetaData {
  dataset?: string;
  operating_day: string;
  min_turnaround_minutes: number;
  seats_per_aircraft: number;
  notes?: string[];
}

export interface Airport {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  tier: AirportTier;
  capacity_per_hour: number;
}

export interface Flight {
  flight_id: string;
  tail_id: string;
  leg_order: number;
  origin: string;
  destination: string;
  dep: string; // HH:MM
  arr: string; // HH:MM
  block_minutes: number;
  pax: number;
  turnaround_before_min: number | null;
}

export interface Connection {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  min_connect_minutes: number;
}

export interface Crew {
  crew_id: string;
  tail_id: string;
  base: string;
  duty_start: string; // HH:MM
  max_duty_mins: number;
  flight_ids: string[];
}

export interface SpareAircraft {
  tail_id: string;
  base: string;
  available_from: string; // HH:MM
  seats: number;
}

export interface FlightNetworkDataset {
  meta: MetaData;
  airports: Airport[];
  flights: Flight[];
  connections: Connection[];
  crews: Crew[];
  spare_aircraft: SpareAircraft[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  dataset?: FlightNetworkDataset;
}

export function parseHHMMToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid time format '${timeStr}', expected 'HH:MM'`);
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time components in '${timeStr}' (hours 0-23, minutes 0-59)`);
  }
  return hours * 60 + minutes;
}

export function formatMinutesToHHMM(totalMinutes: number): string {
  const normalized = Math.max(0, totalMinutes);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function validateFlightNetwork(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Dataset must be a non-null object'], warnings };
  }

  const raw = data as Record<string, unknown>;

  // 1. Meta validation
  if (!raw.meta || typeof raw.meta !== 'object') {
    errors.push('Missing or invalid "meta" object');
  } else {
    const meta = raw.meta as Record<string, unknown>;
    if (typeof meta.min_turnaround_minutes !== 'number' || meta.min_turnaround_minutes <= 0) {
      errors.push('meta.min_turnaround_minutes must be a positive number');
    }
    if (typeof meta.seats_per_aircraft !== 'number' || meta.seats_per_aircraft <= 0) {
      errors.push('meta.seats_per_aircraft must be a positive number');
    }
  }

  // 2. Airports validation
  const airportMap = new Map<string, Airport>();
  if (!Array.isArray(raw.airports)) {
    errors.push('Missing or invalid "airports" array');
  } else {
    raw.airports.forEach((item, idx) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Airport at index ${idx} is not an object`);
        return;
      }
      const a = item as Partial<Airport>;
      if (!a.id || typeof a.id !== 'string') {
        errors.push(`Airport at index ${idx} is missing a string "id"`);
      } else if (airportMap.has(a.id)) {
        errors.push(`Duplicate airport ID: ${a.id}`);
      }
      if (!a.name || typeof a.name !== 'string') {
        errors.push(`Airport ${a.id || idx} missing name`);
      }
      if (!a.city || typeof a.city !== 'string') {
        errors.push(`Airport ${a.id || idx} missing city`);
      }
      if (typeof a.lat !== 'number' || a.lat < -90 || a.lat > 90) {
        errors.push(`Airport ${a.id || idx} invalid lat: ${a.lat}`);
      }
      if (typeof a.lng !== 'number' || a.lng < -180 || a.lng > 180) {
        errors.push(`Airport ${a.id || idx} invalid lng: ${a.lng}`);
      }
      if (!['mega_hub', 'regional_hub', 'spoke'].includes(a.tier as string)) {
        errors.push(`Airport ${a.id || idx} invalid tier: ${a.tier}`);
      }
      if (typeof a.capacity_per_hour !== 'number' || a.capacity_per_hour <= 0) {
        errors.push(`Airport ${a.id || idx} invalid capacity_per_hour: ${a.capacity_per_hour}`);
      }
      if (a.id) {
        airportMap.set(a.id, a as Airport);
      }
    });
  }

  // 3. Flights validation
  const flightMap = new Map<string, Flight>();
  const aircraftChains = new Map<string, Flight[]>();

  if (!Array.isArray(raw.flights)) {
    errors.push('Missing or invalid "flights" array');
  } else {
    raw.flights.forEach((item, idx) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Flight at index ${idx} is not an object`);
        return;
      }
      const f = item as Partial<Flight>;
      if (!f.flight_id || typeof f.flight_id !== 'string') {
        errors.push(`Flight at index ${idx} missing flight_id`);
      } else if (flightMap.has(f.flight_id)) {
        errors.push(`Duplicate flight ID: ${f.flight_id}`);
      }

      if (!f.tail_id || typeof f.tail_id !== 'string') {
        errors.push(`Flight ${f.flight_id || idx} missing tail_id`);
      }
      if (typeof f.leg_order !== 'number' || f.leg_order < 1) {
        errors.push(`Flight ${f.flight_id || idx} invalid leg_order: ${f.leg_order}`);
      }
      if (!f.origin || !airportMap.has(f.origin)) {
        errors.push(`Flight ${f.flight_id || idx} references unknown origin airport: ${f.origin}`);
      }
      if (!f.destination || !airportMap.has(f.destination)) {
        errors.push(`Flight ${f.flight_id || idx} references unknown destination airport: ${f.destination}`);
      }
      if (f.origin && f.destination && f.origin === f.destination) {
        errors.push(`Flight ${f.flight_id || idx} origin and destination are identical: ${f.origin}`);
      }

      let depMins = -1;
      let arrMins = -1;
      try {
        depMins = parseHHMMToMinutes(f.dep || '');
      } catch (e: unknown) {
        errors.push(`Flight ${f.flight_id || idx} invalid dep time '${f.dep}': ${(e as Error).message}`);
      }
      try {
        arrMins = parseHHMMToMinutes(f.arr || '');
      } catch (e: unknown) {
        errors.push(`Flight ${f.flight_id || idx} invalid arr time '${f.arr}': ${(e as Error).message}`);
      }

      if (typeof f.block_minutes !== 'number' || f.block_minutes <= 0) {
        errors.push(`Flight ${f.flight_id || idx} invalid block_minutes: ${f.block_minutes}`);
      } else if (depMins >= 0 && arrMins >= 0) {
        if (arrMins - depMins !== f.block_minutes) {
          errors.push(`Flight ${f.flight_id || idx} arr (${f.arr}) - dep (${f.dep}) does not equal block_minutes (${f.block_minutes})`);
        }
      }

      if (typeof f.pax !== 'number' || f.pax < 0) {
        errors.push(`Flight ${f.flight_id || idx} invalid pax: ${f.pax}`);
      }

      if (f.flight_id) {
        const fullFlight = f as Flight;
        flightMap.set(f.flight_id, fullFlight);
        if (f.tail_id) {
          if (!aircraftChains.has(f.tail_id)) {
            aircraftChains.set(f.tail_id, []);
          }
          aircraftChains.get(f.tail_id)!.push(fullFlight);
        }
      }
    });

    // Check aircraft continuity
    aircraftChains.forEach((chain, tailId) => {
      chain.sort((a, b) => a.leg_order - b.leg_order);
      chain.forEach((leg, idx) => {
        if (leg.leg_order !== idx + 1) {
          errors.push(`Aircraft ${tailId} leg orders are not contiguous 1..N (expected ${idx + 1}, got ${leg.leg_order})`);
        }
        if (idx === 0) {
          if (leg.turnaround_before_min !== null) {
            warnings.push(`Flight ${leg.flight_id} is first leg of ${tailId} but turnaround_before_min is not null`);
          }
        } else {
          const prevLeg = chain[idx - 1];
          if (leg.origin !== prevLeg.destination) {
            errors.push(`Aircraft ${tailId} continuity break: flight ${leg.flight_id} departs ${leg.origin} but prev flight ${prevLeg.flight_id} arrived at ${prevLeg.destination}`);
          }
          const prevArrMins = parseHHMMToMinutes(prevLeg.arr);
          const currDepMins = parseHHMMToMinutes(leg.dep);
          const gap = currDepMins - prevArrMins;
          if (gap < 30) {
            errors.push(`Aircraft ${tailId} scheduled turnaround between ${prevLeg.flight_id} and ${leg.flight_id} is ${gap} min (below min 30m)`);
          }
          if (leg.turnaround_before_min !== gap) {
            errors.push(`Flight ${leg.flight_id} turnaround_before_min is ${leg.turnaround_before_min} but scheduled gap is ${gap} min`);
          }
        }
      });
    });
  }

  // 4. Connections validation
  const connectionMap = new Map<string, Connection>();
  if (!Array.isArray(raw.connections)) {
    errors.push('Missing or invalid "connections" array');
  } else {
    raw.connections.forEach((item, idx) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Connection at index ${idx} is not an object`);
        return;
      }
      const c = item as Partial<Connection>;
      if (!c.connection_id) {
        errors.push(`Connection at index ${idx} missing connection_id`);
      } else if (connectionMap.has(c.connection_id)) {
        errors.push(`Duplicate connection ID: ${c.connection_id}`);
      }
      if (!c.airport || !airportMap.has(c.airport)) {
        errors.push(`Connection ${c.connection_id || idx} invalid airport: ${c.airport}`);
      }
      const fromF = c.from_flight ? flightMap.get(c.from_flight) : undefined;
      const toF = c.to_flight ? flightMap.get(c.to_flight) : undefined;
      if (!fromF) {
        errors.push(`Connection ${c.connection_id || idx} references unknown from_flight: ${c.from_flight}`);
      }
      if (!toF) {
        errors.push(`Connection ${c.connection_id || idx} references unknown to_flight: ${c.to_flight}`);
      }
      if (fromF && toF) {
        if (fromF.destination !== c.airport) {
          errors.push(`Connection ${c.connection_id} from_flight destination (${fromF.destination}) does not match airport ${c.airport}`);
        }
        if (toF.origin !== c.airport) {
          errors.push(`Connection ${c.connection_id} to_flight origin (${toF.origin}) does not match airport ${c.airport}`);
        }
        const fromArr = parseHHMMToMinutes(fromF.arr);
        const toDep = parseHHMMToMinutes(toF.dep);
        const connectTime = toDep - fromArr;
        if (typeof c.min_connect_minutes !== 'number' || c.min_connect_minutes <= 0) {
          errors.push(`Connection ${c.connection_id} invalid min_connect_minutes`);
        } else if (connectTime < c.min_connect_minutes) {
          errors.push(`Connection ${c.connection_id} scheduled connect time ${connectTime} min is less than required ${c.min_connect_minutes} min`);
        }
      }
      if (typeof c.passengers !== 'number' || c.passengers <= 0) {
        errors.push(`Connection ${c.connection_id || idx} invalid passengers count: ${c.passengers}`);
      }
      if (c.connection_id) {
        connectionMap.set(c.connection_id, c as Connection);
      }
    });
  }

  // 5. Crews validation
  const crewMap = new Map<string, Crew>();
  if (!Array.isArray(raw.crews)) {
    errors.push('Missing or invalid "crews" array');
  } else {
    raw.crews.forEach((item, idx) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Crew at index ${idx} is not an object`);
        return;
      }
      const cr = item as Partial<Crew>;
      if (!cr.crew_id) {
        errors.push(`Crew at index ${idx} missing crew_id`);
      } else if (crewMap.has(cr.crew_id)) {
        errors.push(`Duplicate crew ID: ${cr.crew_id}`);
      }
      if (!cr.tail_id) {
        errors.push(`Crew ${cr.crew_id || idx} missing tail_id`);
      }
      if (!cr.base || !airportMap.has(cr.base)) {
        errors.push(`Crew ${cr.crew_id || idx} invalid base airport: ${cr.base}`);
      }
      let dutyStartMins = -1;
      try {
        dutyStartMins = parseHHMMToMinutes(cr.duty_start || '');
      } catch (e: unknown) {
        errors.push(`Crew ${cr.crew_id || idx} invalid duty_start '${cr.duty_start}': ${(e as Error).message}`);
      }
      if (typeof cr.max_duty_mins !== 'number' || cr.max_duty_mins <= 0) {
        errors.push(`Crew ${cr.crew_id || idx} invalid max_duty_mins: ${cr.max_duty_mins}`);
      }
      if (!Array.isArray(cr.flight_ids) || cr.flight_ids.length === 0) {
        errors.push(`Crew ${cr.crew_id || idx} has empty or non-array flight_ids`);
      } else {
        cr.flight_ids.forEach((fId) => {
          if (!flightMap.has(fId)) {
            errors.push(`Crew ${cr.crew_id} references unknown flight_id: ${fId}`);
          }
        });
        if (dutyStartMins >= 0 && cr.max_duty_mins) {
          const lastFlightId = cr.flight_ids[cr.flight_ids.length - 1];
          const lastF = flightMap.get(lastFlightId);
          if (lastF) {
            const scheduledEndMins = parseHHMMToMinutes(lastF.arr);
            const totalScheduledDuty = scheduledEndMins - dutyStartMins;
            if (totalScheduledDuty > cr.max_duty_mins) {
              errors.push(`Crew ${cr.crew_id} scheduled duty ${totalScheduledDuty} min exceeds limit ${cr.max_duty_mins} min`);
            }
          }
        }
      }
      if (cr.crew_id) {
        crewMap.set(cr.crew_id, cr as Crew);
      }
    });
  }

  // 6. Spare aircraft validation
  const spareMap = new Map<string, SpareAircraft>();
  if (!Array.isArray(raw.spare_aircraft)) {
    errors.push('Missing or invalid "spare_aircraft" array');
  } else {
    raw.spare_aircraft.forEach((item, idx) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Spare aircraft at index ${idx} is not an object`);
        return;
      }
      const s = item as Partial<SpareAircraft>;
      if (!s.tail_id) {
        errors.push(`Spare aircraft at index ${idx} missing tail_id`);
      }
      if (!s.base || !airportMap.has(s.base)) {
        errors.push(`Spare aircraft ${s.tail_id || idx} invalid base: ${s.base}`);
      }
      try {
        parseHHMMToMinutes(s.available_from || '');
      } catch (e: unknown) {
        errors.push(`Spare aircraft ${s.tail_id || idx} invalid available_from: ${(e as Error).message}`);
      }
      if (typeof s.seats !== 'number' || s.seats <= 0) {
        errors.push(`Spare aircraft ${s.tail_id || idx} invalid seats: ${s.seats}`);
      }
      if (s.tail_id) {
        spareMap.set(s.tail_id, s as SpareAircraft);
      }
    });
  }

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    warnings,
    dataset: valid ? (raw as unknown as FlightNetworkDataset) : undefined,
  };
}

/**
 * Loads flight network dataset from a JSON string or parsed object
 */
export function loadFlightNetwork(source: string | unknown): FlightNetworkDataset {
  let parsed: unknown;
  if (typeof source === 'string') {
    try {
      parsed = JSON.parse(source);
    } catch (e: unknown) {
      throw new Error(`Failed to parse flight network JSON: ${(e as Error).message}`);
    }
  } else {
    parsed = source;
  }

  const result = validateFlightNetwork(parsed);
  if (!result.valid || !result.dataset) {
    throw new Error(`Flight network validation failed:\n  - ${result.errors.join('\n  - ')}`);
  }
  return result.dataset;
}

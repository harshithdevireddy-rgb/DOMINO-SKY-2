/**
 * DOMINO SKY - Pure Deterministic Simulation Engine
 * Framework-independent aviation disruption propagation simulator.
 * Strictly calculates delay ripples, turnaround slack absorption, crew duty limits,
 * passenger strandedness, and explicit cause trees.
 */

import {
  FlightNetworkDataset,
  parseHHMMToMinutes,
  formatMinutesToHHMM,
  Flight,
  Airport,
} from '../data/loader';
import { SIMULATION_CONFIG } from '../config/constants';
import {
  SimulationParams,
  SimulationResult,
  SimulatedFlight,
  SimulatedCrew,
  ConnectionImpact,
  AircraftTimeline,
  FlightDelayCause,
  CauseChainNode,
  StrandedPaxBreakdown,
} from './types';

export function runSimulation(
  dataset: FlightNetworkDataset,
  params: SimulationParams
): SimulationResult {
  const {
    closedAirport,
    closureStart,
    closureEnd,
    cancelOnCrewBreach = false,
    appliedActions = {},
  } = params;

  // 1. Parse closure window safely
  let startMins = -1;
  let endMins = -1;
  let hasActiveClosure = false;

  if (closedAirport && closureStart && closureEnd) {
    try {
      startMins = parseHHMMToMinutes(closureStart);
      endMins = parseHHMMToMinutes(closureEnd);
      if (endMins > startMins) {
        hasActiveClosure = true;
      }
    } catch {
      hasActiveClosure = false;
    }
  }

  const airportMap = new Map<string, Airport>();
  dataset.airports.forEach((a) => airportMap.set(a.id, a));

  // 2. Index flights by aircraft
  const flightsByTail = new Map<string, Flight[]>();
  dataset.flights.forEach((f) => {
    if (!flightsByTail.has(f.tail_id)) {
      flightsByTail.set(f.tail_id, []);
    }
    flightsByTail.get(f.tail_id)!.push(f);
  });

  const cancelledSet = new Set<string>(appliedActions.cancelledFlightIds || []);
  const spareSwaps = new Map<string, { spareTailId: string; fromFlightId: string }>();
  if (appliedActions.spareAircraftSwaps) {
    appliedActions.spareAircraftSwaps.forEach((swap) => {
      spareSwaps.set(swap.targetTailId, swap);
    });
  }

  const flightHolds = new Map<string, number>();
  if (appliedActions.flightHolds) {
    appliedActions.flightHolds.forEach((hold) => {
      flightHolds.set(hold.flightId, hold.holdUntilMins);
    });
  }

  const flightResults: Record<string, SimulatedFlight> = {};
  const timelines: Record<string, AircraftTimeline> = {};

  // 3. First pass: Propagate flight delays along each aircraft chain
  flightsByTail.forEach((chain, tailId) => {
    const sortedChain = [...chain].sort((a, b) => a.leg_order - b.leg_order);
    let prevActualArrMins: number | null = null;
    let prevFlightResult: SimulatedFlight | null = null;
    let isTailReplacedBySpare = false;
    let spareReplacementTailId: string | undefined = undefined;

    const simulatedLegs: SimulatedFlight[] = [];

    for (let i = 0; i < sortedChain.length; i++) {
      const flight = sortedChain[i];
      const schedDepMins = parseHHMMToMinutes(flight.dep);
      const schedArrMins = parseHHMMToMinutes(flight.arr);

      // Check if spare aircraft took over from this flight onwards
      const swapConfig = spareSwaps.get(tailId);
      if (swapConfig && swapConfig.fromFlightId === flight.flight_id) {
        isTailReplacedBySpare = true;
        spareReplacementTailId = swapConfig.spareTailId;
        // The spare aircraft starts fresh at the origin of this flight
        prevActualArrMins = null;
        prevFlightResult = null;
      }

      const activeTailId = isTailReplacedBySpare && spareReplacementTailId ? spareReplacementTailId : tailId;

      // Check if flight is manually cancelled
      if (cancelledSet.has(flight.flight_id)) {
        const simFlight: SimulatedFlight = {
          flight_id: flight.flight_id,
          tail_id: activeTailId,
          leg_order: flight.leg_order,
          origin: flight.origin,
          destination: flight.destination,
          schedDep: flight.dep,
          schedArr: flight.arr,
          schedDepMins,
          schedArrMins,
          actualDep: flight.dep,
          actualArr: flight.arr,
          actualDepMins: schedDepMins,
          actualArrMins: schedArrMins,
          block_minutes: flight.block_minutes,
          pax: flight.pax,
          turnaround_before_min: flight.turnaround_before_min,
          delayMinutes: 0,
          status: 'cancelled',
          cause: {
            type: 'RECOVERY_CANCELLATION',
            upstreamFlightId: null,
            minutesContributed: 0,
            totalDelay: 0,
            sentence: `Flight ${flight.flight_id} cancelled as part of network recovery action to protect downstream schedule`,
            chain: [
              {
                flightId: flight.flight_id,
                tailId: activeTailId,
                route: `${flight.origin} → ${flight.destination}`,
                delayMinutes: 0,
                type: 'RECOVERY_CANCELLATION',
                description: `Cancelled deliberately by dispatcher recovery intervention`,
              },
            ],
          },
          slackAbsorbedMinutes: 0,
        };
        flightResults[flight.flight_id] = simFlight;
        simulatedLegs.push(simFlight);
        prevActualArrMins = null;
        prevFlightResult = simFlight;
        continue;
      }

      // If earlier flight in chain was cancelled and spare was not swapped in, upstream cancellation propagates
      if (prevFlightResult && prevFlightResult.status === 'cancelled' && !isTailReplacedBySpare) {
        const simFlight: SimulatedFlight = {
          flight_id: flight.flight_id,
          tail_id: activeTailId,
          leg_order: flight.leg_order,
          origin: flight.origin,
          destination: flight.destination,
          schedDep: flight.dep,
          schedArr: flight.arr,
          schedDepMins,
          schedArrMins,
          actualDep: flight.dep,
          actualArr: flight.arr,
          actualDepMins: schedDepMins,
          actualArrMins: schedArrMins,
          block_minutes: flight.block_minutes,
          pax: flight.pax,
          turnaround_before_min: flight.turnaround_before_min,
          delayMinutes: 0,
          status: 'cancelled',
          cause: {
            type: 'CANCELLED_UPSTREAM',
            upstreamFlightId: prevFlightResult.flight_id,
            minutesContributed: 0,
            totalDelay: 0,
            sentence: `Cancelled because earlier incoming leg ${prevFlightResult.flight_id} was cancelled`,
            chain: [
              ...(prevFlightResult.cause ? prevFlightResult.cause.chain : []),
              {
                flightId: flight.flight_id,
                tailId: activeTailId,
                route: `${flight.origin} → ${flight.destination}`,
                delayMinutes: 0,
                type: 'CANCELLED_UPSTREAM',
                description: `Cancelled because incoming flight ${prevFlightResult.flight_id} did not operate`,
              },
            ],
          },
          slackAbsorbedMinutes: 0,
        };
        flightResults[flight.flight_id] = simFlight;
        simulatedLegs.push(simFlight);
        prevActualArrMins = null;
        prevFlightResult = simFlight;
        continue;
      }

      // Compute earliest departure considering minimum turnaround
      let earliestDepMins = schedDepMins;
      let slackAbsorbed = 0;

      if (prevActualArrMins !== null) {
        const turnaroundRequiredDep = prevActualArrMins + SIMULATION_CONFIG.MIN_TURNAROUND_MINUTES;
        if (turnaroundRequiredDep > earliestDepMins) {
          earliestDepMins = turnaroundRequiredDep;
        }

        // Calculate turnaround slack absorbed
        if (prevFlightResult && prevFlightResult.delayMinutes > 0) {
          const scheduledTurnaround = flight.turnaround_before_min ?? SIMULATION_CONFIG.MIN_TURNAROUND_MINUTES;
          const scheduledBuffer = Math.max(0, scheduledTurnaround - SIMULATION_CONFIG.MIN_TURNAROUND_MINUTES);
          slackAbsorbed = Math.min(prevFlightResult.delayMinutes, scheduledBuffer);
        }
      }

      // Check applied flight holds
      if (flightHolds.has(flight.flight_id)) {
        const holdMins = flightHolds.get(flight.flight_id)!;
        if (holdMins > earliestDepMins) {
          earliestDepMins = holdMins;
        }
      }

      // Check closure restrictions at Origin & Destination
      let actualDepMins = earliestDepMins;
      let closureHoldMins = 0;
      let directClosureHit = false;
      let closureReasonText = '';

      if (hasActiveClosure) {
        // 1. Origin airport closed during departure window [start, end)
        if (flight.origin === closedAirport) {
          if (actualDepMins >= startMins && actualDepMins < endMins) {
            closureHoldMins = endMins - actualDepMins;
            actualDepMins = endMins;
            directClosureHit = true;
            closureReasonText = `Held at origin ${flight.origin} because airport is closed until ${closureEnd}`;
          }
        }

        // 2. Destination airport closed during arrival window [start, end)
        // Flight is held at origin so that it lands at reopening time
        if (flight.destination === closedAirport) {
          const estArrival = actualDepMins + flight.block_minutes;
          if (estArrival >= startMins && estArrival < endMins) {
            const requiredDepForReopen = endMins - flight.block_minutes;
            if (requiredDepForReopen > actualDepMins) {
              closureHoldMins = Math.max(closureHoldMins, requiredDepForReopen - actualDepMins);
              actualDepMins = requiredDepForReopen;
              directClosureHit = true;
              closureReasonText = `Held at origin ${flight.origin} to prevent landing at closed destination ${flight.destination} before ${closureEnd}`;
            }
          }
        }
      }

      const actualArrMins = actualDepMins + flight.block_minutes;
      const delayMinutes = Math.max(0, actualDepMins - schedDepMins);
      const isDelayed = delayMinutes > 0;

      // Construct granular cause chain and human story
      let cause: FlightDelayCause | null = null;

      if (isDelayed) {
        if (directClosureHit) {
          const chainNode: CauseChainNode = {
            flightId: flight.flight_id,
            tailId: activeTailId,
            route: `${flight.origin} → ${flight.destination}`,
            delayMinutes,
            type: 'AIRPORT_CLOSURE',
            description: `${flight.flight_id} held at ${flight.origin}: ${closureReasonText}`,
          };

          cause = {
            type: 'AIRPORT_CLOSURE',
            upstreamFlightId: null,
            minutesContributed: delayMinutes,
            totalDelay: delayMinutes,
            sentence: `Flight ${flight.flight_id} delayed ${delayMinutes}m because ${flight.origin === closedAirport ? flight.origin : flight.destination} was closed from ${closureStart} to ${closureEnd}.`,
            chain: [chainNode],
          };
        } else if (prevFlightResult && prevFlightResult.delayMinutes > 0) {
          // Late inbound aircraft from upstream flight
          const upstreamDelay = prevFlightResult.delayMinutes;
          const chainNode: CauseChainNode = {
            flightId: flight.flight_id,
            tailId: activeTailId,
            route: `${flight.origin} → ${flight.destination}`,
            delayMinutes,
            type: 'LATE_INBOUND_AIRCRAFT',
            description: `${flight.flight_id} departing ${flight.origin} delayed ${delayMinutes}m waiting for aircraft ${activeTailId} from flight ${prevFlightResult.flight_id}`,
          };

          const parentChain = prevFlightResult.cause ? prevFlightResult.cause.chain : [];
          cause = {
            type: 'LATE_INBOUND_AIRCRAFT',
            upstreamFlightId: prevFlightResult.flight_id,
            minutesContributed: Math.max(0, delayMinutes - (prevFlightResult.delayMinutes - slackAbsorbed)),
            totalDelay: delayMinutes,
            sentence: `Flight ${flight.flight_id} delayed ${delayMinutes}m departing ${flight.origin} because plane ${activeTailId} arrived ${prevFlightResult.delayMinutes}m late on flight ${prevFlightResult.flight_id}${
              slackAbsorbed > 0 ? ` (absorbing ${slackAbsorbed}m of scheduled buffer)` : ''
            }.`,
            chain: [...parentChain, chainNode],
          };
        } else if (flightHolds.has(flight.flight_id)) {
          cause = {
            type: 'RECOVERY_HOLD',
            upstreamFlightId: null,
            minutesContributed: delayMinutes,
            totalDelay: delayMinutes,
            sentence: `Flight ${flight.flight_id} intentionally held for ${delayMinutes}m to protect passenger connections.`,
            chain: [
              {
                flightId: flight.flight_id,
                tailId: activeTailId,
                route: `${flight.origin} → ${flight.destination}`,
                delayMinutes,
                type: 'RECOVERY_HOLD',
                description: `Held to protect connection`,
              },
            ],
          };
        }
      }

      const simFlight: SimulatedFlight = {
        flight_id: flight.flight_id,
        tail_id: activeTailId,
        leg_order: flight.leg_order,
        origin: flight.origin,
        destination: flight.destination,
        schedDep: flight.dep,
        schedArr: flight.arr,
        schedDepMins,
        schedArrMins,
        actualDep: formatMinutesToHHMM(actualDepMins),
        actualArr: formatMinutesToHHMM(actualArrMins),
        actualDepMins,
        actualArrMins,
        block_minutes: flight.block_minutes,
        pax: flight.pax,
        turnaround_before_min: flight.turnaround_before_min,
        delayMinutes,
        status: isDelayed ? 'delayed' : 'on_time',
        cause,
        slackAbsorbedMinutes: slackAbsorbed,
      };

      flightResults[flight.flight_id] = simFlight;
      simulatedLegs.push(simFlight);
      prevActualArrMins = actualArrMins;
      prevFlightResult = simFlight;
    }

    const firstLegOrigin = sortedChain[0]?.origin || 'DEL';
    timelines[tailId] = {
      tail_id: tailId,
      baseAirport: firstLegOrigin,
      totalDelayMinutes: simulatedLegs.reduce((sum, f) => sum + f.delayMinutes, 0),
      flights: simulatedLegs,
      spareReplacedBy: isTailReplacedBySpare ? spareReplacementTailId : undefined,
    };
  });

  // 4. Crew duty evaluation & breach tracking
  const simulatedCrews: Record<string, SimulatedCrew> = {};
  const breachedCrewsList: SimulatedCrew[] = [];

  dataset.crews.forEach((crew) => {
    const dutyStartMins = parseHHMMToMinutes(crew.duty_start);

    // If spare aircraft swapped in, check if this crew was relieved
    const swapConfig = spareSwaps.get(crew.tail_id);
    let crewFlights = crew.flight_ids;
    if (swapConfig) {
      const cutIdx = crew.flight_ids.indexOf(swapConfig.fromFlightId);
      if (cutIdx >= 0) {
        crewFlights = crew.flight_ids.slice(0, cutIdx);
      }
    }

    let dutyEndMins = dutyStartMins;
    let breachedFlightId: string | null = null;

    if (crewFlights.length > 0) {
      const lastFlightId = crewFlights[crewFlights.length - 1];
      const lastFlight = flightResults[lastFlightId];
      if (lastFlight && lastFlight.status !== 'cancelled') {
        dutyEndMins = lastFlight.actualArrMins;
      }
    }

    const dutyUsedMinutes = Math.max(0, dutyEndMins - dutyStartMins);
    const slackMinutes = crew.max_duty_mins - dutyUsedMinutes;

    let status: 'ok' | 'warning' | 'breached' = 'ok';
    if (dutyUsedMinutes > crew.max_duty_mins) {
      status = 'breached';
      // Find the specific flight where duty exceeded max limit
      for (const fId of crewFlights) {
        const f = flightResults[fId];
        if (f && f.actualArrMins - dutyStartMins > crew.max_duty_mins) {
          breachedFlightId = fId;
          break;
        }
      }
    } else if (dutyUsedMinutes >= SIMULATION_CONFIG.CREW_DUTY_WARNING_THRESHOLD_MINS) {
      status = 'warning';
    }

    const simCrew: SimulatedCrew = {
      crew_id: crew.crew_id,
      tail_id: crew.tail_id,
      base: crew.base,
      duty_start: crew.duty_start,
      dutyStartMins,
      dutyEndMins,
      dutyEnd: formatMinutesToHHMM(dutyEndMins),
      dutyUsedMinutes,
      maxDutyMins: crew.max_duty_mins,
      slackMinutes,
      status,
      breachedFlightId,
    };

    simulatedCrews[crew.crew_id] = simCrew;
    if (status === 'breached') {
      breachedCrewsList.push(simCrew);
    }
  });

  // 5. Optional: Enforce crew duty cancellations if enabled
  if (cancelOnCrewBreach && breachedCrewsList.length > 0) {
    breachedCrewsList.forEach((breachedCrew) => {
      const chain = flightsByTail.get(breachedCrew.tail_id) || [];
      const sorted = [...chain].sort((a, b) => a.leg_order - b.leg_order);
      let cancelRest = false;

      sorted.forEach((flight) => {
        const simFlight = flightResults[flight.flight_id];
        if (!simFlight) return;

        if (flight.flight_id === breachedCrew.breachedFlightId) {
          cancelRest = true;
          simFlight.status = 'cancelled';
          simFlight.cause = {
            type: 'CREW_DUTY_LIMIT',
            upstreamFlightId: null,
            minutesContributed: 0,
            totalDelay: 0,
            sentence: `Flight ${flight.flight_id} cancelled because crew ${breachedCrew.crew_id} reached legal duty limit of ${breachedCrew.maxDutyMins}m`,
            chain: [
              ...(simFlight.cause ? simFlight.cause.chain : []),
              {
                flightId: flight.flight_id,
                tailId: flight.tail_id,
                route: `${flight.origin} → ${flight.destination}`,
                delayMinutes: 0,
                type: 'CREW_DUTY_LIMIT',
                description: `Cancelled due to crew duty limit breach (${breachedCrew.dutyUsedMinutes}m / ${breachedCrew.maxDutyMins}m)`,
              },
            ],
          };
        } else if (cancelRest) {
          simFlight.status = 'cancelled';
          simFlight.cause = {
            type: 'CANCELLED_UPSTREAM',
            upstreamFlightId: breachedCrew.breachedFlightId,
            minutesContributed: 0,
            totalDelay: 0,
            sentence: `Cancelled because earlier leg ${breachedCrew.breachedFlightId} on aircraft ${flight.tail_id} was cancelled due to crew duty breach`,
            chain: [
              {
                flightId: flight.flight_id,
                tailId: flight.tail_id,
                route: `${flight.origin} → ${flight.destination}`,
                delayMinutes: 0,
                type: 'CANCELLED_UPSTREAM',
                description: `Cancelled following crew duty breach on ${breachedCrew.breachedFlightId}`,
              },
            ],
          };
        }
      });
    });
  }

  // 6. Connections & Stranded Passenger Calculation
  const connectionImpacts: ConnectionImpact[] = [];
  const brokenConnections: ConnectionImpact[] = [];
  const strandedByAirport: Record<string, number> = {};
  const cancelledFlightsList: Array<{ flightId: string; origin: string; destination: string; pax: number; reason: string }> = [];

  let strandedCancelledPax = 0;
  let strandedMissedConnPax = 0;

  // Track cancelled flight passengers
  Object.values(flightResults).forEach((f) => {
    if (f.status === 'cancelled') {
      strandedCancelledPax += f.pax;
      strandedByAirport[f.origin] = (strandedByAirport[f.origin] || 0) + f.pax;
      cancelledFlightsList.push({
        flightId: f.flight_id,
        origin: f.origin,
        destination: f.destination,
        pax: f.pax,
        reason: f.cause?.sentence || 'Flight cancelled',
      });
    }
  });

  // Evaluate all 21 connections
  dataset.connections.forEach((conn) => {
    const fromF = flightResults[conn.from_flight];
    const toF = flightResults[conn.to_flight];

    if (!fromF || !toF) return;

    let isBroken = false;
    let reason: 'missed_connection' | 'flight_cancelled' | undefined = undefined;

    if (fromF.status === 'cancelled' || toF.status === 'cancelled') {
      isBroken = true;
      reason = 'flight_cancelled';
      // Passengers on cancelled flights are already counted under cancelledPax to prevent double counting
    } else {
      const actualConnectMins = toF.actualDepMins - fromF.actualArrMins;
      if (actualConnectMins < conn.min_connect_minutes) {
        isBroken = true;
        reason = 'missed_connection';
        strandedMissedConnPax += conn.passengers;
        strandedByAirport[conn.airport] = (strandedByAirport[conn.airport] || 0) + conn.passengers;
      }
    }

    const impact: ConnectionImpact = {
      connection_id: conn.connection_id,
      airport: conn.airport,
      from_flight: conn.from_flight,
      to_flight: conn.to_flight,
      passengers: conn.passengers,
      min_connect_minutes: conn.min_connect_minutes,
      fromArrivalMins: fromF.actualArrMins,
      toDepartureMins: toF.actualDepMins,
      actualConnectMinutes: toF.actualDepMins - fromF.actualArrMins,
      isBroken,
      reason,
    };

    connectionImpacts.push(impact);
    if (isBroken && reason === 'missed_connection') {
      brokenConnections.push(impact);
    }
  });

  const totalStrandedPax = strandedCancelledPax + strandedMissedConnPax;

  // 7. Aggregate metrics
  const allFlightsList = Object.values(flightResults);
  const delayedFlights = allFlightsList.filter((f) => f.status === 'delayed');
  const cancelledFlights = allFlightsList.filter((f) => f.status === 'cancelled');
  const onTimeFlights = allFlightsList.filter((f) => f.status === 'on_time');

  const totalDelayMinutes = delayedFlights.reduce((sum, f) => sum + f.delayMinutes, 0);
  const maxDelayMinutes = delayedFlights.reduce((max, f) => Math.max(max, f.delayMinutes), 0);
  const averageDelayMinutes = delayedFlights.length > 0 ? Math.round(totalDelayMinutes / delayedFlights.length) : 0;

  const crewBreachesCount = Object.values(simulatedCrews).filter((c) => c.status === 'breached').length;
  const crewWarningsCount = Object.values(simulatedCrews).filter((c) => c.status === 'warning').length;

  // 7. Calculate Airport Operational Loads & Capacity Utilization
  const airportLoads: Record<string, import('./types').AirportOperationalLoad> = {};
  dataset.airports.forEach((airport) => {
    let incoming = 0;
    let outgoing = 0;
    let affectedFlights = 0;
    let affectedPax = 0;
    const hourlyMovements: number[] = new Array(24).fill(0);

    allFlightsList.forEach((f) => {
      if (f.origin === airport.id) {
        outgoing++;
        const depHour = Math.floor(f.actualDepMins / 60);
        if (depHour >= 0 && depHour < 24) hourlyMovements[depHour]++;
        if (f.status !== 'on_time') {
          affectedFlights++;
          affectedPax += f.pax;
        }
      }
      if (f.destination === airport.id) {
        incoming++;
        const arrHour = Math.floor(f.actualArrMins / 60);
        if (arrHour >= 0 && arrHour < 24) hourlyMovements[arrHour]++;
        if (f.status !== 'on_time') {
          affectedFlights++;
          affectedPax += f.pax;
        }
      }
    });

    const peakHourMovements = Math.max(...hourlyMovements);
    let status: 'normal' | 'disrupted' | 'closed' = 'normal';
    if (closedAirport === airport.id && hasActiveClosure) {
      status = 'closed';
    } else if (affectedFlights > 0) {
      status = 'disrupted';
    }

    airportLoads[airport.id] = {
      airportId: airport.id,
      name: airport.name,
      city: airport.city,
      capacityPerHour: airport.capacity_per_hour,
      incomingCount: incoming,
      outgoingCount: outgoing,
      totalMovements: incoming + outgoing,
      affectedFlightsCount: affectedFlights,
      affectedPaxCount: affectedPax,
      peakHourMovements,
      status,
    };
  });

  // 8. Aggregate metrics & Disruption Status Level
  const paxDelayedCount = delayedFlights.reduce((sum, f) => sum + f.pax, 0);
  const paxCancelledCount = cancelledFlights.reduce((sum, f) => sum + f.pax, 0);
  const paxMissedConnCount = strandedMissedConnPax;
  const totalImpactedPax = paxDelayedCount + paxCancelledCount + paxMissedConnCount;

  const affectedTails = new Set<string>();
  allFlightsList.forEach((f) => {
    if (f.status !== 'on_time') {
      affectedTails.add(f.tail_id);
    }
  });
  const aircraftAffectedCount = affectedTails.size;

  let networkStatus: import('./types').NetworkDisruptionLevel = 'NORMAL';
  if (delayedFlights.length === 0 && cancelledFlights.length === 0) {
    networkStatus = 'NORMAL';
  } else if (totalDelayMinutes < 200 && crewBreachesCount === 0 && cancelledFlights.length === 0) {
    networkStatus = 'MINOR';
  } else if (totalDelayMinutes < 800 && crewBreachesCount < 2) {
    networkStatus = 'MAJOR';
  } else {
    networkStatus = 'CRITICAL';
  }

  // 9. Build Cause Graph (nodes & edges for interactive ripple visualization)
  const graphNodes: Array<{ id: string; label: string; type: string; delay: number }> = [];
  const graphEdges: Array<{ from: string; to: string; delayPassed: number }> = [];

  delayedFlights.forEach((f) => {
    graphNodes.push({
      id: f.flight_id,
      label: `${f.flight_id} (${f.origin}→${f.destination})`,
      type: f.cause?.type || 'LATE_INBOUND_AIRCRAFT',
      delay: f.delayMinutes,
    });

    if (f.cause?.upstreamFlightId) {
      graphEdges.push({
        from: f.cause.upstreamFlightId,
        to: f.flight_id,
        delayPassed: f.delayMinutes,
      });
    }
  });

  return {
    params,
    flights: flightResults,
    timelines,
    crews: simulatedCrews,
    connections: connectionImpacts,
    airportLoads,
    metrics: {
      totalFlights: allFlightsList.length,
      delayedCount: delayedFlights.length,
      cancelledCount: cancelledFlights.length,
      onTimeCount: onTimeFlights.length,
      totalDelayMinutes,
      maxDelayMinutes,
      averageDelayMinutes,
      aircraftAffectedCount,
      paxDelayedCount,
      paxCancelledCount,
      paxMissedConnCount,
      totalImpactedPax,
      networkStatus,
      strandedPax: {
        total: totalStrandedPax,
        byReason: {
          cancelledFlights: strandedCancelledPax,
          missedConnections: strandedMissedConnPax,
        },
        byAirport: strandedByAirport,
        brokenConnections,
        cancelledFlightsList,
      },
      crewBreachesCount,
      crewWarningsCount,
    },
    causeGraph: {
      nodes: graphNodes,
      edges: graphEdges,
    },
  };
}

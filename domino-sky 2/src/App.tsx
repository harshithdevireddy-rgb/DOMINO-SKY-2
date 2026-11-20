/**
 * DOMINO SKY - Airline Disruption Intelligence Simulator
 * Full-stack Production Application
 * Operations Control Center with Deterministic Simulation,
 * Causal Chain Explanations, Number Guard Audited AI Recovery, and Visual Analytics.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { loadFlightNetwork, FlightNetworkDataset } from './data/loader';
import { RAW_FLIGHT_NETWORK } from './data/rawDataset';
import { runSimulation } from './engine/index';
import { generateCandidateActions, CandidateAction } from './engine/recovery';
import { requestDispatcherRecommendations, DispatcherClientResult } from './api/dispatcherClient';
import { SimulationResult } from './engine/types';
import { DISRUPTION_PRESETS, DisruptionPreset } from './config/constants';

// UI Components
import { Navbar } from './components/Navbar';
import { ScenarioQuickBar } from './components/ScenarioQuickBar';
import { ViewSliderBar, ActiveSlideOption } from './components/ViewSliderBar';
import { NetworkMap } from './components/NetworkMap';
import { FlightTable } from './components/FlightTable';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { ImpactDashboard } from './components/ImpactDashboard';
import { AircraftTimeline } from './components/AircraftTimeline';
import { TimeScrubber } from './components/TimeScrubber';
import { FlightDetailDrawer } from './components/FlightDetailDrawer';
import { AirportDetailDrawer } from './components/AirportDetailDrawer';
import { DispatcherCard } from './components/DispatcherCard';
import { BeforeAfterView } from './components/BeforeAfterView';
import { AssumptionsModal } from './components/AssumptionsModal';
import { ScenarioManagerModal, SavedScenario } from './components/ScenarioManagerModal';
import { DebugPanel } from './components/DebugPanel';
import { DisruptionDrawer } from './components/DisruptionDrawer';
import { IntroModal } from './components/IntroModal';
import { Plane, AlertTriangle, Users, Clock, ShieldCheck, Activity } from 'lucide-react';

export function App() {
  // 1. Dataset state
  const dataset: FlightNetworkDataset = useMemo(() => {
    return loadFlightNetwork(RAW_FLIGHT_NETWORK);
  }, []);

  // 2. Disruption Parameters (default to Mumbai Severe Storm: BOM 07:30–10:30)
  const [closedAirport, setClosedAirport] = useState<string>('BOM');
  const [startTime, setStartTime] = useState<string>('07:30');
  const [endTime, setEndTime] = useState<string>('10:30');
  const [activePresetId, setActivePresetId] = useState<string | null>('bom-severe-storm');

  // 3. UI Navigation & Selection
  const [activeSlide, setActiveSlide] = useState<ActiveSlideOption>('map');
  const [activeView, setActiveView] = useState<'simulator' | 'before_after'>('simulator');
  const [isDisruptionDrawerOpen, setIsDisruptionDrawerOpen] = useState<boolean>(false);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [selectedAirportId, setSelectedAirportId] = useState<string | null>(null);

  // 4. Modals
  const [isIntroOpen, setIsIntroOpen] = useState<boolean>(false);
  const [isAssumptionsOpen, setIsAssumptionsOpen] = useState<boolean>(false);
  const [isScenarioManagerOpen, setIsScenarioManagerOpen] = useState<boolean>(false);

  // 5. Scrubber & Animation
  const [currentScrubberMins, setCurrentScrubberMins] = useState<number>(450); // 07:30 IST
  const [isPlayingScrubber, setIsPlayingScrubber] = useState<boolean>(false);
  const [scrubberSpeed, setScrubberSpeed] = useState<number>(2);

  // 6. Simulation & Recovery State
  const [appliedAction, setAppliedAction] = useState<CandidateAction | null>(null);
  const [dispatcherResult, setDispatcherResult] = useState<DispatcherClientResult | null>(null);
  const [isConsultingDispatcher, setIsConsultingDispatcher] = useState<boolean>(false);

  // Pure deterministic baseline simulation
  const baseResult: SimulationResult = useMemo(() => {
    return runSimulation(dataset, {
      closedAirport: closedAirport || null,
      closureStart: startTime || null,
      closureEnd: endTime || null,
    });
  }, [dataset, closedAirport, startTime, endTime]);

  // Candidate recovery actions scored by engine
  const candidateActions: CandidateAction[] = useMemo(() => {
    return generateCandidateActions(dataset, baseResult.params, baseResult);
  }, [dataset, baseResult]);

  // Recovered simulation result
  const recoveredResult: SimulationResult = useMemo(() => {
    if (!appliedAction) return baseResult;
    return runSimulation(dataset, {
      ...baseResult.params,
      appliedActions: appliedAction.overrides,
    });
  }, [dataset, baseResult, appliedAction]);

  const currentResult = appliedAction ? recoveredResult : baseResult;

  // Preset selector
  const handleSelectPreset = useCallback((preset: DisruptionPreset) => {
    setActivePresetId(preset.id);
    setClosedAirport(preset.airport);
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
    setAppliedAction(null);
    setDispatcherResult(null);

    // Sync scrubber with disruption start
    const [h, m] = preset.startTime.split(':').map(Number);
    setCurrentScrubberMins(h * 60 + m);
  }, []);

  // Reset to normal baseline schedule
  const handleReset = useCallback(() => {
    setActivePresetId(null);
    setClosedAirport('');
    setStartTime('07:00');
    setEndTime('07:00');
    setAppliedAction(null);
    setDispatcherResult(null);
    setSelectedFlightId(null);
    setSelectedAirportId(null);
    setCurrentScrubberMins(360); // 06:00
  }, []);

  // Consult Dispatcher handler
  const handleConsultDispatcher = useCallback(async () => {
    setIsConsultingDispatcher(true);
    try {
      const res = await requestDispatcherRecommendations(baseResult, candidateActions);
      setDispatcherResult(res);
    } catch (err) {
      console.error('Failed to get dispatcher advice:', err);
    } finally {
      setIsConsultingDispatcher(false);
    }
  }, [baseResult, candidateActions]);

  // Apply recovery action handler
  const handleApplyAction = useCallback((action: CandidateAction) => {
    setAppliedAction(action);
    setActiveView('before_after');
  }, []);

  // Load saved scenario from modal
  const handleLoadScenario = useCallback((scenario: SavedScenario) => {
    setClosedAirport(scenario.closedAirport || '');
    setStartTime(scenario.closureStart || '07:00');
    setEndTime(scenario.closureEnd || '07:00');
    setActivePresetId(null);
    setSelectedFlightId(null);
    setSelectedAirportId(null);

    if (scenario.appliedActionId) {
      const found = candidateActions.find((c) => c.id === scenario.appliedActionId);
      if (found) {
        setAppliedAction(found);
      }
    } else {
      setAppliedAction(null);
    }
  }, [candidateActions]);

  const selectedFlight = selectedFlightId ? currentResult.flights[selectedFlightId] || null : null;
  const selectedAirportObj = selectedAirportId ? dataset.airports.find((a) => a.id === selectedAirportId) || null : null;
  const selectedAirportLoad = selectedAirportId ? currentResult.airportLoads[selectedAirportId] || null : null;

  // Current closure description
  const currentClosureText = closedAirport
    ? `${closedAirport} Ground Stop (${startTime} – ${endTime} IST)`
    : 'Normal Operations (Clear Skies across 16 Airports)';

  return (
    <div className="min-h-screen bg-[#080D18] text-slate-100 flex flex-col font-sans selection:bg-cyan-900 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenAssumptions={() => setIsAssumptionsOpen(true)}
        onOpenIntro={() => setIsIntroOpen(true)}
        onOpenScenarios={() => setIsScenarioManagerOpen(true)}
        hasRecoveryApplied={appliedAction !== null}
        onReset={handleReset}
        networkStatus={currentResult.metrics.networkStatus}
        totalDelayMinutes={currentResult.metrics.totalDelayMinutes}
        delayedCount={currentResult.metrics.delayedCount}
      />

      {/* Main Operations Control Center Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {activeView === 'before_after' && appliedAction ? (
          <BeforeAfterView
            beforeResult={baseResult}
            afterResult={recoveredResult}
            appliedAction={appliedAction}
            airports={dataset.airports}
            onSelectFlight={setSelectedFlightId}
            selectedFlightId={selectedFlightId}
            onClose={() => setActiveView('simulator')}
          />
        ) : (
          <>
            {/* 1. Quick Scenario Selector Bar */}
            <ScenarioQuickBar
              activePresetId={activePresetId}
              onSelectPreset={handleSelectPreset}
              onResetToNormal={handleReset}
              onOpenCustomizer={() => setIsDisruptionDrawerOpen(true)}
              currentClosureText={currentClosureText}
            />

            {/* 2. Slide Options Control */}
            <ViewSliderBar
              activeSlide={activeSlide}
              onChangeSlide={setActiveSlide}
              delayedCount={currentResult.metrics.delayedCount}
              strandedPax={currentResult.metrics.strandedPax.total}
              recommendationsCount={candidateActions.length}
              totalFlightsCount={dataset.flights.length}
            />

            {/* 3. Slide Content Area */}

            {/* SLIDE A: Live Network Map */}
            {activeSlide === 'map' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                {/* Operations Overview Scorecards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-3 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Delayed Flights</span>
                      <div className="text-xl font-black text-amber-400 font-mono">
                        {currentResult.metrics.delayedCount} <span className="text-xs text-slate-500 font-normal">/ {currentResult.metrics.totalFlights}</span>
                      </div>
                    </div>
                    <Plane className="w-5 h-5 text-amber-400" />
                  </div>

                  <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-3 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Cumulative Delay</span>
                      <div className="text-xl font-black text-cyan-300 font-mono">
                        {currentResult.metrics.totalDelayMinutes} <span className="text-xs text-slate-500 font-normal">m</span>
                      </div>
                    </div>
                    <Clock className="w-5 h-5 text-cyan-400" />
                  </div>

                  <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-3 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Impacted Pax</span>
                      <div className="text-xl font-black text-white font-mono">
                        {currentResult.metrics.totalImpactedPax}
                      </div>
                    </div>
                    <Users className="w-5 h-5 text-cyan-400" />
                  </div>

                  <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-3 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Stranded Pax</span>
                      <div className="text-xl font-black text-rose-400 font-mono">
                        {currentResult.metrics.strandedPax.total}
                      </div>
                    </div>
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  </div>

                  <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-3 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Tails Affected</span>
                      <div className="text-xl font-black text-indigo-300 font-mono">
                        {currentResult.metrics.aircraftAffectedCount} <span className="text-xs text-slate-500 font-normal">/ 16</span>
                      </div>
                    </div>
                    <Plane className="w-5 h-5 text-indigo-400 rotate-45" />
                  </div>

                  <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-3 flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Crew Breaches</span>
                      <div className={`text-xl font-black font-mono ${currentResult.metrics.crewBreachesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {currentResult.metrics.crewBreachesCount}
                      </div>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>

                {/* Hero Network Map Canvas */}
                <div className="h-[620px] w-full">
                  <NetworkMap
                    airports={dataset.airports}
                    flights={currentResult.flights}
                    closedAirportId={closedAirport || null}
                    closureStart={closedAirport ? startTime : null}
                    closureEnd={closedAirport ? endTime : null}
                    selectedFlightId={selectedFlightId}
                    onSelectFlight={setSelectedFlightId}
                    onSelectAirport={setSelectedAirportId}
                    currentScrubberMins={currentScrubberMins}
                  />
                </div>

                {/* Day Playback Scrubber */}
                <TimeScrubber
                  currentMins={currentScrubberMins}
                  onChangeMins={setCurrentScrubberMins}
                  isPlaying={isPlayingScrubber}
                  onTogglePlay={() => setIsPlayingScrubber(!isPlayingScrubber)}
                  speed={scrubberSpeed}
                  onChangeSpeed={setScrubberSpeed}
                  closureStart={closedAirport ? startTime : null}
                  closureEnd={closedAirport ? endTime : null}
                />
              </div>
            )}

            {/* SLIDE B: Flight Table Manifest */}
            {activeSlide === 'table' && (
              <div className="animate-in fade-in duration-200">
                <FlightTable
                  flights={currentResult.flights}
                  airports={dataset.airports}
                  onSelectFlight={setSelectedFlightId}
                  selectedFlightId={selectedFlightId}
                />
              </div>
            )}

            {/* SLIDE C: Aircraft Rotations Timeline */}
            {activeSlide === 'timeline' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <AircraftTimeline
                  timelines={currentResult.timelines}
                  selectedFlightId={selectedFlightId}
                  onSelectFlight={setSelectedFlightId}
                  currentScrubberMins={currentScrubberMins}
                />

                <TimeScrubber
                  currentMins={currentScrubberMins}
                  onChangeMins={setCurrentScrubberMins}
                  isPlaying={isPlayingScrubber}
                  onTogglePlay={() => setIsPlayingScrubber(!isPlayingScrubber)}
                  speed={scrubberSpeed}
                  onChangeSpeed={setScrubberSpeed}
                  closureStart={closedAirport ? startTime : null}
                  closureEnd={closedAirport ? endTime : null}
                />
              </div>
            )}

            {/* SLIDE D: Visual Analytics */}
            {activeSlide === 'analytics' && (
              <div className="animate-in fade-in duration-200">
                <AnalyticsCharts
                  result={currentResult}
                  airports={dataset.airports}
                  onSelectFlight={setSelectedFlightId}
                />
              </div>
            )}

            {/* SLIDE E: Impact Dashboard & Passenger Breakdown */}
            {activeSlide === 'impact' && (
              <div className="animate-in fade-in duration-200">
                <ImpactDashboard
                  result={currentResult}
                  onOpenAssumptions={() => setIsAssumptionsOpen(true)}
                  onSelectFlight={setSelectedFlightId}
                />
              </div>
            )}

            {/* SLIDE F: AI Dispatcher & Recovery Center */}
            {activeSlide === 'dispatcher' && (
              <div className="animate-in fade-in duration-200">
                <DispatcherCard
                  dispatcherResult={dispatcherResult}
                  isLoading={isConsultingDispatcher}
                  onConsultDispatcher={handleConsultDispatcher}
                  onApplyAction={handleApplyAction}
                  appliedActionId={appliedAction?.id || null}
                />
              </div>
            )}
          </>
        )}

        {/* Collapsible Number Guard Technical Audit Panel */}
        <DebugPanel
          simulationResult={currentResult}
          dispatcherResult={dispatcherResult}
        />
      </main>

      {/* Slide-out Flight Detail Causal Chain Drawer */}
      <FlightDetailDrawer
        flight={selectedFlight}
        onClose={() => setSelectedFlightId(null)}
        airports={dataset.airports}
        connections={currentResult.connections}
        onSelectFlight={setSelectedFlightId}
      />

      {/* Slide-out Airport Detail Drawer */}
      <AirportDetailDrawer
        airport={selectedAirportObj}
        load={selectedAirportLoad}
        flights={currentResult.flights}
        onClose={() => setSelectedAirportId(null)}
        onSelectFlight={setSelectedFlightId}
      />

      {/* Slide-out Disruption Configuration Drawer */}
      <DisruptionDrawer
        isOpen={isDisruptionDrawerOpen}
        onClose={() => setIsDisruptionDrawerOpen(false)}
        airports={dataset.airports}
        selectedAirport={closedAirport}
        startTime={startTime}
        endTime={endTime}
        onChangeAirport={(apt) => {
          setClosedAirport(apt);
          setActivePresetId(null);
        }}
        onChangeStartTime={(st) => {
          setStartTime(st);
          setActivePresetId(null);
        }}
        onChangeEndTime={(et) => {
          setEndTime(et);
          setActivePresetId(null);
        }}
        onRunSimulation={() => {
          setAppliedAction(null);
          setDispatcherResult(null);
        }}
        onReset={handleReset}
        isLoading={false}
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
      />

      {/* Assumptions & Logic Modal */}
      <AssumptionsModal
        isOpen={isAssumptionsOpen}
        onClose={() => setIsAssumptionsOpen(false)}
      />

      {/* Scenario Manager & Comparison Modal */}
      <ScenarioManagerModal
        isOpen={isScenarioManagerOpen}
        onClose={() => setIsScenarioManagerOpen(false)}
        currentResult={currentResult}
        appliedAction={appliedAction}
        onLoadScenario={handleLoadScenario}
      />

      {/* Intro Modal on First Launch */}
      <IntroModal
        isOpen={isIntroOpen}
        onClose={() => setIsIntroOpen(false)}
        onStartDemo={() => {
          setIsIntroOpen(false);
          const preset = DISRUPTION_PRESETS[0]; // Mumbai Severe Storm
          handleSelectPreset(preset);
          setActiveSlide('map');
        }}
      />
    </div>
  );
}

export default App;

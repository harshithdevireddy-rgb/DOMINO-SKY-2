# Domino Sky — Airline Disruption Intelligence Simulator

> **A 90-minute thunderstorm in Mumbai can cancel a flight from Bengaluru to Kolkata five hours later.**
> Domino Sky is a production-grade, interactive airline operations intelligence platform. It simulates cascading network disruptions, explains **why** each flight is delayed via traceable causal chains, identifies stranded passengers and crew duty violations, and empowers flight dispatchers with mathematically verified AI and rule-based recovery strategies.

---

## 🌟 The Golden Deterministic Principle

> **All delay minutes, passenger counts, crew duty hours, and recovery outcomes are computed by a deterministic simulation engine. The AI never calculates or invents numbers. Every number stated by the AI is audited by the Number Guard against simulator ground truth.**

### Architectural Integrity
1. **Deterministic TypeScript Simulation Engine (`/src/engine/index.ts`):** Framework-independent mathematical simulator computing aircraft rotation chains, turnaround slack absorption, arrival/departure airport closures, hourly airport capacities, passenger connections, and crew duty limits with zero randomness.
2. **AI Dispatcher Isolation (`/src/api/dispatcherClient.ts` & `/api/dispatcher.ts`):** The LLM never calculates. It receives a structured JSON scenario payload, assesses operational trade-offs, and recommends prioritized recovery strategies.
3. **Number Guard (`/src/engine/numberGuard.ts`):** All generated text passes through an auditing filter that verifies every number against the simulator ground truth. Any discrepancy is corrected and logged in the **Debug Panel** with the **"Verified by simulator"** badge.
4. **Deterministic Fallback Dispatcher (`/src/engine/fallbackDispatcher.ts`):** If no API key is provided or during network timeouts, Domino Sky automatically uses the rule-based dispatcher labeled **"Rule-based Dispatcher"** with 100% mathematical fidelity.

---

## ✈️ Dataset Specification

Domino Sky operates strictly on the provided `flight_network.json` dataset:
- **16 Indian Airports:** 4 Mega Hubs (DEL, BOM, BLR, HYD), 4 Regional Hubs (MAA, CCU, AMD, COK), and 8 Spokes (GOI, PNQ, JAI, GAU, LKO, IXC, BBI, TRV).
- **70 Scheduled Flights:** Operated across 16 aircraft (`VT-DS01` through `VT-DS16`), each flying 4–5 legs, carrying 10,394 total passengers between 06:00 and 21:45 IST.
- **21 Passenger Connections:** Hub transfer windows with strict minimum connection times (40m or 45m).
- **16 Assigned Flight Crews:** 10-hour (600 min) maximum legal duty limits under DGCA FDTL.
- **2 Standby Aircraft:** `VT-DS17` (stationed at Kempegowda International, BLR) and `VT-DS18` (stationed at Indira Gandhi International, DEL), available from 05:00 with fresh standby crew.
- **Airport Hourly Capacity:** Runway movement limits per hour (e.g. DEL: 40/hr, BOM: 32/hr, BLR: 34/hr, Spokes: 8–10/hr).

---

## 🎨 Operations Control Center Design

Designed to feel like an authentic Airline Operations Control Center (AOCC):
- **Dark Foundation:** `#080D18` background, `#111827` surface, `#182235` elevated cards, subtle `#1e293b` slate borders.
- **Consistent Aviation Palette:** Teal/Emerald (`#10b981`) for normal operations, Amber (`#f59e0b`) for moderate delays, Crimson (`#ef4444`) for severe disruptions/closures, Cyan (`#06b6d4`) for recovery interventions.
- **Information Density:** Clean Bloomberg-style operational density, interactive India projection map, Gantt rotation timeline, multi-column manifest table, and visual analytics.

---

## 🔬 Simulation Engine Mechanics

### 1. Flight Departure & Arrival Calculation
$$\text{actualDeparture} = \max(\text{scheduledDeparture}, \text{prevLegArrival} + \text{minTurnaround}, \text{closureReopenTime})$$
$$\text{actualArrival} = \text{actualDeparture} + \text{blockMinutes}$$
$$\text{delayMinutes} = \max(0, \text{actualDeparture} - \text{scheduledDeparture})$$

### 2. Dual Airport Closure Semantics
- **Departures:** Flights scheduled to depart from the closed airport during $[start, end)$ are held on the ground until reopening time.
- **Arrivals:** Flights scheduled to land at the closed airport during the window are held at their origin airport so they touch down safely at reopening time.

### 3. Turnaround Buffer & Slack Absorption
When scheduled turnaround exceeds the 30-minute minimum requirement (e.g., 70-minute scheduled turnaround gives a 40-minute buffer), upstream delays are naturally absorbed by the buffer, causing the cascading domino effect to dissipate across downstream legs.

### 4. Passenger Impact Accounting
A passenger is classified as stranded if:
1. Their flight is cancelled (counts flight `pax`).
2. Their connecting flight departure occurs before inbound arrival + `min_connect_minutes`.
*Connecting passengers on cancelled flights are deduplicated to prevent double-counting.*

### 5. Crew Legal Duty Limits (DGCA FDTL)
$$\text{dutyUsedMinutes} = \text{actualArrivalOfLastLeg} - \text{dutyStart}$$
A violation is flagged whenever $\text{dutyUsedMinutes} > 600 \text{ minutes}$ (10 hours), with a warning threshold at 540 minutes (9 hours).

---

## 📊 Golden Reference Unit Tests

Verified via Vitest in `src/engine/engine.test.ts` & `src/engine/comprehensive.test.ts`:

| Scenario | Delayed Flights | Cumulative Delay | Max Delay | Stranded Pax | Crew Breaches |
|---|---|---|---|---|---|
| **Baseline (Clear Skies)** | 0 | 0 min | 0 min | 0 | 0 (All legal) |
| **BOM 09:00–10:30** | 7 | 280 min | 80 min | 0 | 0 |
| **DEL 08:00–10:00** | 7 | 500 min | 120 min | 37 (connections) | 0 |
| **BLR 12:00–14:00** | 8 | 415 min | 120 min | 89 (connections) | 1 (CR06 @ 630m) |
| **HYD 13:00–15:00** | 1 | 25 min | 25 min | 0 | 0 |
| **BOM 07:30–10:30** | 25 | 2,790 min | 170 min | 266 | 2 (CR04 & CR12) |

---

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript + Vite 6
- **Styling:** Tailwind CSS (Dark Operations Control Center theme)
- **Icons:** Lucide React
- **Testing:** Vitest (34 unit & integration tests)
- **Data Persistence:** LocalStorage (Scenario Management)

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Optional: Configure AI Dispatcher API Key
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your Gemini or Anthropic API key:
```env
GEMINI_API_KEY=your_gemini_key_here
# or
ANTHROPIC_API_KEY=your_anthropic_key_here
```
*(If left unset, Domino Sky runs with 100% mathematical fidelity in deterministic rule-based dispatcher mode).*

### 4. Run Development Server
```bash
npm run dev
# or
pnpm dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 5. Run Automated Tests
```bash
npm test
# or
pnpm test
```

### 6. Production Build
```bash
npm run build
# or
pnpm build
```

---

## 🚢 Vercel Deployment

Domino Sky is production-ready for zero-configuration Vercel deployment:
1. Push repository to GitHub/GitLab.
2. Import project into Vercel.
3. Build command: `tsc && vite build`
4. Output directory: `dist`
5. Optional environment variables in Vercel project settings:
   - `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`
6. `vercel.json` and `/api/dispatcher.ts` handle SPA routing and serverless AI dispatcher endpoints automatically.

---

## 📁 Project Architecture

```
domino-sky/
├── api/
│   └── dispatcher.ts             # Vercel serverless function for AI Dispatcher
├── data/
│   └── flight_network.json       # Source-of-truth dataset
├── public/
│   └── data/flight_network.json  # Public static dataset asset
├── src/
│   ├── api/
│   │   └── dispatcherClient.ts   # Dispatcher client with Number Guard integration
│   ├── config/
│   │   └── constants.ts          # Constants, tiers, presets, styling colors
│   ├── data/
│   │   ├── loader.ts             # Dataset parser and schema validator
│   │   ├── loader.test.ts        # Dataset loading & corrupt data tests
│   │   └── rawDataset.ts         # Bundled raw dataset
│   ├── engine/
│   │   ├── types.ts              # Engine TypeScript data models
│   │   ├── index.ts              # Deterministic simulation engine
│   │   ├── recovery.ts           # Recovery action generator and scoring
│   │   ├── fallbackDispatcher.ts # Deterministic rule-based dispatcher
│   │   ├── numberGuard.ts        # Number Guard auditor
│   │   ├── engine.test.ts        # Golden reference unit tests
│   │   ├── comprehensive.test.ts # Prompt Section 19 verification test suite
│   │   ├── numberGuard.test.ts   # Number Guard unit tests
│   │   └── demoScript.test.ts    # End-to-end demo script test
│   ├── components/
│   │   ├── Navbar.tsx            # Operations navbar with network disruption badge
│   │   ├── ScenarioQuickBar.tsx  # Quick one-click disruption scenarios
│   │   ├── ViewSliderBar.tsx     # 6-view switcher (Map, Table, Timeline, Analytics, Impact, AI)
│   │   ├── NetworkMap.tsx        # Interactive SVG map with flight arcs & planes
│   │   ├── FlightTable.tsx       # Flight manifest with search, sort, filter, & CSV export
│   │   ├── AnalyticsCharts.tsx   # Delay distribution, airport impact & connection charts
│   │   ├── ImpactDashboard.tsx   # Summary metrics, passenger breakdown, crew meter
│   │   ├── AircraftTimeline.tsx  # Gantt-style rotation timeline & slack absorption
│   │   ├── TimeScrubber.tsx      # Interactive 24h timeline scrubber
│   │   ├── FlightDetailDrawer.tsx# Granular causal chain drawer
│   │   ├── AirportDetailDrawer.tsx# Airport capacity & flight manifest drawer
│   │   ├── DispatcherCard.tsx    # AI / Rule-Based Dispatcher recommendations
│   │   ├── BeforeAfterView.tsx   # Side-by-side recovery comparison view
│   │   ├── ScenarioManagerModal.tsx # Scenario save, load, rename, compare, export
│   │   ├── AssumptionsModal.tsx  # Mathematical method documentation
│   │   ├── IntroModal.tsx        # First-launch problem story guide
│   │   └── DebugPanel.tsx        # Raw JSON logs & Number Guard audits
│   ├── App.tsx                   # Main application coordinator
│   └── main.tsx                  # Application bootstrap
├── vercel.json                   # Vercel deployment configuration
├── vite.config.ts                # Vite config with dev API proxy
├── tsconfig.json                 # Strict TypeScript configuration
├── package.json
└── README.md
```

---

## 🎬 Operational Walkthrough

1. **Airport Ground Stop:** Click **"Mumbai Monsoon"** on the quick bar or open **Custom Disruption** to choose any of the 16 airports with duration presets (30m, 60m, 90m, 120m, 180m).
2. **Observe Network Cascades:** Watch the interactive India network map pulse red at BOM. Arcs to BLR, HYD, DEL turn amber and crimson as sequential aircraft legs inherit delay.
3. **Trace Causal Roots:** Open the **Flight Table** or click any delayed route (e.g. flight DS0704 from Bengaluru to Hyderabad). Read the step-by-step causal chain showing how BOM closure delayed DS0702, which caused VT-DS07 to arrive late at BLR, pushing back DS0703 and DS0704.
4. **Inspect Airport Capacity:** Click Mumbai or Delhi on the map to inspect runway hourly capacity, incoming vs outgoing flights, and passenger impact.
5. **Analyze Analytics:** Switch to **Analytics** to view the delay distribution histogram, top impacted airports, and broken connection passenger counts.
6. **Consult AI Dispatcher:** Open the **AI Dispatcher** panel. Review prioritized recovery plans (such as deploying standby aircraft `VT-DS17` at Bengaluru or holding a connecting flight) with Number Guard verification.
7. **Execute Recovery:** Click **"Apply & Re-Simulate"** to re-run the deterministic engine and open the **Before vs After** view showcasing exact recovered minutes and protected passengers.
8. **Manage Scenarios:** Open **Scenarios** in the top navbar to save current parameters to LocalStorage, compare two scenarios side-by-side, or export results to JSON/CSV.

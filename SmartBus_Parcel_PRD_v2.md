# PRD — SmartBus Parcel v2
## Intelligent Mobility & Logistics Optimization Platform for Kopargaon

**Document Type:** Product Requirements Document
**Version:** 2.0
**Status:** Hackathon MVP
**Primary Goal:** Use existing public bus capacity to move parcels faster and cheaper, with real-time visibility and measurable optimization.

---

## 1. Product Vision

SmartBus Parcel is a data-driven logistics platform that uses existing public bus routes and available cargo/luggage capacity to transport eligible parcels within and around Kopargaon.

The product must **optimize existing mobility infrastructure rather than create a parallel delivery fleet**.

### Core value proposition

> Turn unused capacity in buses already on the road into an affordable, trackable parcel-delivery network.

### Success criteria

The MVP must demonstrate, using realistic or simulated data:

- Higher utilization of existing bus capacity.
- Lower parcel delivery cost compared with a baseline delivery method.
- Reduced delivery time where route alignment allows.
- Real-time visibility of bus and parcel status.
- Transparent explanation of why a bus was selected.
- A reproducible baseline-vs-optimized comparison.

---

## 2. Problem Definition

### 2.1 Current problems

1. Public buses carry unused luggage and cargo capacity on every trip.
2. Parcel delivery requires separate dedicated vehicles for small shipments.
3. Parcel transport, bus movement, and capacity data are disconnected.
4. Customers have no simple visibility into parcel progress.
5. Transport decisions use fixed rules instead of combining route, capacity, ETA, and cost.

### 2.2 Product response

The platform must:

1. Accept a parcel request with origin, destination, weight, dimensions, and priority.
2. Identify candidate buses whose routes cover both pickup and destination stops.
3. Check route compatibility and available cargo capacity.
4. Calculate estimated cost and ETA using distance and bus schedule data.
5. Rank candidates using a configurable weighted optimization score.
6. Recommend the highest-scoring valid bus.
7. Assign the parcel and reduce that bus's available capacity immediately.
8. Track the assigned journey via simulated GPS.
9. Measure and display utilization improvement and cost savings.

---

## 3. Product Scope

### 3.1 MVP — Must Have

**Customer**
- Create parcel request (pickup, destination, weight, dimensions, priority).
- View recommended bus with score explanation.
- See estimated cost and ETA before confirming.
- Confirm or reject the booking.
- Track parcel status on a live map.

**Admin / Operations**
- View all active buses with current location and available capacity.
- View route definitions and stop sequences.
- View all parcel assignments and their current status.
- Monitor live deliveries on the operations map.
- View KPI cards: utilization %, active buses, active parcels, cost saved, average ETA.
- Compare baseline vs. optimized results on charts.

**Optimization engine**
- Filter invalid buses before scoring (capacity, route, status).
- Calculate per-bus: route match score, capacity fit score, ETA score, cost score.
- Compute weighted overall score.
- Return ranked candidate list with factor breakdown.
- Recommend top-scoring candidate.
- Update bus capacity on assignment.
- Recalculate metrics for the analytics dashboard.

**Simulation**
- Simulated GPS movement for every assigned bus.
- Bus position updates broadcast via WebSocket.
- Parcel status auto-updates as bus progresses through stops.
- Simulation speed controls: 1x, 2x, 5x.
- Demo reset: return all buses to start, clear assignments, reload demo dataset.

### 3.2 Nice to Have

- Multi-parcel consolidation on the same bus.
- Demand forecasting for route planning.
- Dynamic pricing based on capacity utilization.
- SMS or push notification system.
- QR code-based parcel handoff at stops.
- Driver/conductor mobile interface.
- Historical analytics with date filters.
- Carbon emission estimation per delivery.

### 3.3 Out of Scope for Hackathon MVP

- Actual payment gateway integration.
- Production-grade government MSRTC API integration.
- Physical fleet telematics hardware.
- Automated physical parcel handling.
- Guaranteed real-world delivery SLAs.
- Complex ML models requiring large proprietary datasets.

---

## 4. Product Rules

### Rule 1 — Existing Infrastructure First

The system must always recommend buses that already operate on scheduled routes.

**Never model the main solution as creating a dedicated delivery fleet.**

### Rule 2 — Capacity Safety (Hard Block)

A bus must never be assigned a parcel when:

```
parcel_weight_kg > bus.available_capacity_kg
```

This check runs before scoring. Buses that fail it are excluded from the candidate list entirely, not downscored.

Optional v2 addition:

```
parcel_volume_m3 > bus.available_volume_m3
```

### Rule 3 — Route Compatibility

A bus is a valid candidate only when its route includes **both** the pickup stop and the destination stop **in the correct sequence** (pickup comes before destination in the stop order).

```python
# Pseudocode
def is_route_compatible(bus, pickup_stop, dest_stop):
    stops = bus.route.stops  # ordered list
    pickup_idx = stops.index(pickup_stop)   # raises if not found
    dest_idx   = stops.index(dest_stop)     # raises if not found
    return pickup_idx < dest_idx            # direction must be correct
```

### Rule 4 — No Impossible Routing

Do not assign a parcel when any of these conditions are true:

- The bus has already passed the pickup stop in the current run.
- The ETA to pickup stop is greater than the parcel's time window (if set).
- The bus status is not `active` or `scheduled`.

### Rule 5 — Explainable Decisions

Every recommendation must display the factor breakdown:

```
Route match:     95 / 100
Capacity fit:    88 / 100
ETA score:       76 / 100
Cost score:      82 / 100
──────────────────────────
Overall score:   87 / 100

Estimated ETA:   2h 10m
Estimated cost:  ₹65
```

### Rule 6 — Optimization Must Be Measurable

Every demo run must produce side-by-side baseline and optimized metrics covering at minimum:

- Total delivery cost (₹).
- Estimated delivery time (hours).
- Bus capacity utilization (%).
- Number of separate vehicle trips required.

### Rule 7 — Real-Time Data Can Be Simulated

GPS movement may be simulated using preloaded route coordinates. The UI must label simulated data clearly. Simulation data must be deterministic and resettable.

### Rule 8 — External APIs Are Supporting Services

Maps and routing APIs support the product. The core value is in the platform's own matching and optimization logic, which must work without an external API via cached route data.

### Rule 9 — API Failure Tolerance

If OSRM or any external routing API is unavailable, the system falls back to:

1. Cached route polylines stored in the database.
2. Preloaded straight-line distance approximations for Kopargaon demo routes.

The demo must complete without errors even when all external APIs are down.

### Rule 10 — Privacy by Default

Collect only data required for the demo. Do not expose customer personal information on the admin dashboard. Never log PII to the console.

---

## 5. User Roles

### 5.1 Customer

Can:
- Submit a parcel request.
- View the quote and optimization explanation.
- Confirm or cancel the booking.
- Track their parcel's live location and status.
- View estimated arrival time.

Cannot:
- View other customers' parcels.
- Access bus capacity or operations data.
- Modify or delete a confirmed assignment.

### 5.2 Operations Admin

Can:
- Manage bus records and route definitions.
- View capacity of every active bus.
- Monitor all active parcel assignments.
- Inspect the optimization score breakdown for any assignment.
- View the analytics dashboard and baseline comparison.
- Trigger demo reset.
- Control GPS simulation speed.

### 5.3 System / Optimization Engine

Automatically:
- Filters candidate buses using hard rules (capacity, route, status).
- Scores remaining candidates using the weighted formula.
- Returns ranked list and top recommendation.
- Updates bus capacity on confirmed assignment.
- Recalculates dashboard metrics after each assignment.
- Broadcasts GPS updates via WebSocket.

---

## 6. Core User Journey

```
Customer submits parcel request
         │
         ▼
   Input validation
   (weight, stops exist, pickup ≠ destination)
         │
         ▼
 Query active buses on eligible routes
         │
         ▼
 Hard filter: capacity, route direction, bus status
         │
    ┌────┴────┐
    │No match │
    │         ▼
    │  Return "no bus available"
    │  with reason and suggestions
    │
    ▼ (candidates found)
 Score each candidate:
   route_match × 0.40
   capacity_fit × 0.25
   eta_score × 0.20
   cost_score × 0.15
         │
         ▼
 Return ranked list, top recommendation
         │
         ▼
   Customer reviews quote + explanation
         │
    ┌────┴────┐
    │ Cancel  │ Confirm
    │         ▼
    │  Create assignment record
    │  Decrement bus.available_capacity_kg
    │  Set parcel status → "assigned"
    │  Start GPS simulation for this bus
    │
    ▼ (if cancelled)
  Parcel stays in "pending", no assignment
         │
         ▼ (after confirm)
   Live tracking screen
   (map, stop progress, ETA updates via WebSocket)
         │
         ▼
   Bus reaches destination stop
   Parcel status → "delivered"
         │
         ▼
   Dashboard metrics updated
   (savings, utilization delta shown)
```

---

## 7. System Architecture

```
                    USERS
              /               \
             ▼                 ▼
      Customer UI          Admin UI
      (React, mobile-       (React, desktop-
       friendly)             first)
             \                 /
              \               /
               ▼             ▼
              FRONTEND
       React + Vite + Tailwind + TanStack Query
               │
         REST + WebSocket
               │
               ▼
            BACKEND
        FastAPI Application
               │
       ┌───────┬────────┬────────────────┐
       │       │        │                │
       ▼       ▼        ▼                ▼
   Parcel   Bus/Route  Optimizer     Analytics
   Service   Service    Service       Service
       │       │        │                │
       └───────┴────────┴────────────────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
    Supabase       OSRM
   PostgreSQL    (with fallback
                 to cached routes)
        │
        ▼
   GPS Simulator
   (async background task)
```

### Technology stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Server state | TanStack Query |
| Global state | Zustand (minimal) |
| Maps | Leaflet + OpenStreetMap |
| Routing distance | OSRM (with cached fallback) |
| Backend | FastAPI |
| Database | Supabase / PostgreSQL |
| Real-time | WebSocket (FastAPI native) |
| Optimization | Python (custom scoring, no heavy ML needed) |
| Charts | Recharts |
| Frontend deployment | Vercel |
| Backend deployment | Render |

**Why no OR-Tools for MVP?** OR-Tools adds complexity and a large dependency for what is fundamentally a single-parcel-to-bus matching problem. The custom weighted scoring formula is faster, easier to explain to judges, and sufficient for the hackathon scope. OR-Tools can be added in v2 for multi-parcel route optimization.

---

## 8. Frontend Design

### 8.1 Design Principles

The UI should feel like a **modern mobility command center**.

- Map-first layouts where tracking is relevant.
- Strong visual hierarchy with large KPI cards.
- Clear status badges (color + label).
- Minimal form fields with inline validation.
- Fast primary actions — one tap to confirm booking.
- Mobile-friendly customer flow.
- Desktop-first operations dashboard.
- All simulation data labeled `[DEMO DATA]` in the UI.

### 8.2 Main Screens

**A. Landing Page**

Sections (in order):
1. Hero: "Deliver More With the Buses Already on the Road."
2. Problem: 3-stat block (unused capacity %, avg parcel cost, avg delivery time).
3. How it works: 4-step visual flow.
4. Live impact numbers (reset on demo reset).
5. Network map showing Kopargaon routes.
6. Call to action: "Book a Parcel" button.

**B. Parcel Booking Form**

Fields:
- Pickup stop (dropdown from known stops)
- Destination stop (dropdown, excludes pickup selection)
- Weight (kg, numeric, max 30 kg for MVP)
- Dimensions (cm: L × W × H, optional in MVP)
- Priority (Standard / Express)

Primary action: `Find best bus`

Validation errors shown inline before submission. Do not allow form submit if pickup equals destination.

**C. Smart Match Result**

Display per candidate (top result highlighted):
- Bus number and route name
- Available capacity after this parcel
- ETA to pickup stop and ETA to destination
- Estimated cost (labeled "Prototype Estimated Fare")
- Score breakdown (route match, capacity fit, ETA score, cost score)
- Overall score badge

Actions:
- `Confirm booking` (primary)
- `Try different parcel` (ghost)

Show maximum 3 candidates. If zero candidates, show the specific reason (no capacity / no route match / no active buses).

**D. Live Tracking**

Map elements:
- Bus marker with bus number label
- Route polyline (full route in gray, completed segment in accent color)
- Pickup stop marker (pickup icon)
- Destination stop marker (destination icon)
- Current parcel status badge

Side panel:
- Stop-by-stop progress list
- ETA to destination (updates via WebSocket)
- Parcel status history

**E. Operations Dashboard**

KPI row:
- Active buses
- Active parcels
- Total available capacity (kg)
- Fleet utilization %
- Average ETA (min)
- Estimated cost saved (₹) vs baseline

Charts:
- Baseline vs. optimized: cost comparison bar chart
- Capacity utilization over time (line chart, per bus or fleet total)
- Delivery time distribution (bar chart)
- Parcels by route (horizontal bar chart)

Admin controls:
- GPS simulation speed selector: 1x | 2x | 5x
- Demo reset button (with confirmation dialog)

---

## 9. Backend Design

### 9.1 Service structure

```
backend/
├── main.py
├── config.py
│
├── routers/
│   ├── parcels.py
│   ├── buses.py
│   ├── routes.py
│   ├── tracking.py
│   └── analytics.py
│
├── services/
│   ├── matching.py        # candidate filtering
│   ├── optimization.py    # scoring and ranking
│   ├── routing.py         # OSRM + fallback
│   ├── pricing.py         # cost estimation
│   └── tracking.py        # status updates
│
├── models/
│   ├── parcel.py
│   ├── bus.py
│   ├── route.py
│   └── assignment.py
│
├── db/
│   └── supabase.py
│
└── simulation/
    └── gps_simulator.py   # async background task per bus
```

### 9.2 Key design decisions

**Capacity decrement is atomic.** When an assignment is confirmed, the `available_capacity_kg` decrement and the assignment record insert happen inside a single database transaction. If either fails, neither is committed.

**GPS simulator is a background task, not a cron job.** Each active bus runs an `asyncio` task that advances position every N seconds and broadcasts via WebSocket. Tasks are tracked in a registry so they can be paused, resumed, or reset by the admin.

**Optimization logic is stateless.** The scoring function takes buses + parcel as input and returns a ranked list. It reads from the database but does not modify state. Assignment is handled by a separate endpoint.

---

## 10. API Endpoints

### Parcel

| Method | Path | Description |
|---|---|---|
| POST | /api/parcels | Create parcel, return tracking ID |
| GET | /api/parcels/{id} | Get parcel details and current status |
| GET | /api/parcels | List parcels (admin only) |

### Bus

| Method | Path | Description |
|---|---|---|
| GET | /api/buses | List buses with current capacity and location |
| GET | /api/buses/{id} | Get single bus details |
| GET | /api/buses/{id}/location | Get current simulated location |

### Optimization

| Method | Path | Description |
|---|---|---|
| POST | /api/optimize/match | Return ranked candidate buses for a parcel request |
| POST | /api/optimize/assign | Confirm assignment: decrement capacity, create record |

### Tracking

| Method | Path | Description |
|---|---|---|
| GET | /api/tracking/{parcel_id} | Get full journey record |
| WS | /ws/tracking/{parcel_id} | Stream live GPS and status updates |

### Analytics

| Method | Path | Description |
|---|---|---|
| GET | /api/analytics/dashboard | Return KPI metrics |
| GET | /api/analytics/baseline-vs-optimized | Return comparison dataset |

### Simulation (Admin)

| Method | Path | Description |
|---|---|---|
| POST | /api/simulation/speed | Set simulation speed multiplier |
| POST | /api/simulation/reset | Reset all buses and parcels to demo baseline |

---

## 11. Data Model

### users

```
id              uuid, PK
name            text
email           text, unique
role            enum: customer | admin
created_at      timestamptz
```

### routes

```
id              uuid, PK
route_name      text
stops           jsonb   -- ordered array of stop objects [{id, name, lat, lng}]
distance_km     numeric
estimated_duration_min  integer
polyline        text    -- encoded route path for map display
```

### buses

```
id              uuid, PK
bus_number      text
route_id        uuid, FK → routes.id
total_capacity_kg       numeric
available_capacity_kg   numeric   -- decremented on assignment
current_lat     numeric
current_lng     numeric
current_stop_index  integer  -- index into route.stops, advances during simulation
status          enum: scheduled | active | completed | inactive
updated_at      timestamptz
```

### parcels

```
id              uuid, PK
tracking_id     text, unique  -- human-readable (e.g. SBP-20240829-001)
customer_id     uuid, FK → users.id
pickup_stop_id  text    -- references stop id within a route
destination_stop_id text
weight_kg       numeric
volume_m3       numeric, nullable
priority        enum: standard | express
status          enum: pending | assigned | in_transit | delivered | failed
assigned_bus_id uuid, nullable, FK → buses.id
created_at      timestamptz
updated_at      timestamptz
```

### assignments

```
id              uuid, PK
parcel_id       uuid, FK → parcels.id
bus_id          uuid, FK → buses.id
overall_score   numeric
route_match_score   numeric
capacity_score  numeric
eta_score       numeric
cost_score      numeric
estimated_cost_inr  numeric
estimated_eta_min   integer
created_at      timestamptz
```

### gps_events

```
id              uuid, PK
bus_id          uuid, FK → buses.id
lat             numeric
lng             numeric
stop_index      integer
timestamp       timestamptz
```

**Note:** `gps_events` is append-only. The frontend receives only the latest position via WebSocket. Avoid loading the full GPS history into browser memory.

---

## 12. Optimization Logic

### Step 1 — Hard filter (eliminates invalid buses before scoring)

Reject a bus if any condition is true:

```python
def is_valid_candidate(bus, parcel):
    if bus.status not in ("active", "scheduled"):
        return False, "bus not active"
    if bus.available_capacity_kg < parcel.weight_kg:
        return False, "insufficient capacity"
    stops = bus.route.stops
    stop_ids = [s.id for s in stops]
    if parcel.pickup_stop_id not in stop_ids:
        return False, "pickup stop not on route"
    if parcel.destination_stop_id not in stop_ids:
        return False, "destination stop not on route"
    pickup_idx = stop_ids.index(parcel.pickup_stop_id)
    dest_idx   = stop_ids.index(parcel.destination_stop_id)
    if pickup_idx >= dest_idx:
        return False, "wrong direction"
    if pickup_idx < bus.current_stop_index:
        return False, "bus already passed pickup stop"
    return True, None
```

### Step 2 — Normalize scoring factors (all factors normalized 0–100)

```python
def route_match_score(bus, parcel):
    # Proportion of parcel sub-route covered by bus route
    # Simple: if both stops on route and direction correct → high score
    # Reduce score if bus must travel many extra stops beyond destination
    extra_stops = len(bus.route.stops) - 1 - dest_idx
    total_stops = len(bus.route.stops) - 1
    return round(100 * (1 - 0.3 * extra_stops / max(total_stops, 1)))

def capacity_fit_score(bus, parcel):
    # Prefer buses where the parcel uses 20–70% of remaining capacity
    # Very tight fit = low score (risk of no room), very loose = medium score
    fill_ratio = parcel.weight_kg / bus.available_capacity_kg
    if fill_ratio > 1.0:  # should never reach here after hard filter
        return 0
    if fill_ratio > 0.9:
        return 40  # dangerously close to limit
    return round(100 * min(fill_ratio * 1.5, 1.0))  # sweet spot ~0.4–0.7 fill

def eta_score(bus, parcel, osrm_client):
    # Lower ETA = higher score; normalize against worst-case ETA in candidate set
    eta_min = osrm_client.duration(bus.current_location, pickup_stop) + \
              osrm_client.duration(pickup_stop, destination_stop)
    # Normalized outside this function against max ETA in candidate set
    return eta_min  # raw value; normalization happens at ranking step

def cost_score(estimated_cost_inr, max_cost_in_set):
    # Lower cost = higher score
    return round(100 * (1 - estimated_cost_inr / max_cost_in_set))
```

### Step 3 — Weighted overall score

```python
WEIGHTS = {
    "route_match": 0.40,
    "capacity_fit": 0.25,
    "eta": 0.20,
    "cost": 0.15,
}

def overall_score(factors):
    return round(
        WEIGHTS["route_match"] * factors["route_match"]
      + WEIGHTS["capacity_fit"] * factors["capacity_fit"]
      + WEIGHTS["eta"]          * factors["eta_normalized"]
      + WEIGHTS["cost"]         * factors["cost"]
    )
```

**Weights must be stored in config, not hardcoded.** Judges will ask if they can be adjusted.

### Step 4 — Rank and return

Sort candidates by `overall_score` descending. Return top 3 (or fewer if fewer candidates pass the hard filter). The first candidate is the recommendation.

### Step 5 — Explain

Return factor breakdown in the API response so the frontend can display it without further calculation.

---

## 13. Pricing Logic

MVP pricing is transparent and simple.

```python
BASE_CHARGE_INR    = 20.0
PER_KG_RATE_INR    = 4.0
PER_KM_RATE_INR    = 2.5
EXPRESS_SURCHARGE  = 15.0

def estimate_cost(weight_kg, distance_km, priority):
    cost = BASE_CHARGE_INR
    cost += weight_kg * PER_KG_RATE_INR
    cost += distance_km * PER_KM_RATE_INR
    if priority == "express":
        cost += EXPRESS_SURCHARGE
    return round(cost, 2)
```

Label all costs in the UI as **"Prototype Estimated Fare"**. Do not claim these are official MSRTC rates.

**Baseline cost model (for comparison):**

```python
DEDICATED_VEHICLE_BASE_INR = 80.0
DEDICATED_VEHICLE_PER_KM   = 12.0

def baseline_cost(distance_km):
    return DEDICATED_VEHICLE_BASE_INR + distance_km * DEDICATED_VEHICLE_PER_KM
```

---

## 14. Baseline vs. Optimized Evaluation

This is the most important proof point for judges.

### Baseline model

Represents conventional dedicated parcel delivery:
- One dedicated two-wheeler or auto per parcel.
- Full door-to-door distance at ₹12/km plus ₹80 base.
- No shared capacity.
- Utilization: 0% (vehicle carries only one parcel per trip).

### Optimized model

Represents SmartBus Parcel:
- Parcel rides an existing bus.
- Cost calculated per the pricing logic above.
- Capacity utilization = parcel weight / bus total capacity.
- Bus is already running (no extra vehicle dispatched).

### Dashboard comparison display

```
                    BASELINE        OPTIMIZED
Cost (₹)              ₹180            ₹65
ETA (hours)           4.5 h           2.8 h
Capacity util.        0%              62%
Extra vehicles        1 dedicated     0
```

Label the entire comparison block: `[DEMO DATA — Simulation]`.

The comparison must update when a new parcel is assigned (cumulative savings shown on dashboard).

---

## 15. State Management

### Frontend

Use React state for short-lived UI state:
- Form fields, selected bus, active map view, modal visibility.

Use Zustand for cross-component state that doesn't warrant a full fetch:
- Current user role.
- Simulation speed setting.
- Demo reset trigger.

Use TanStack Query for all server state:
- Bus list, parcel details, dashboard metrics, assignment results.
- Configure `staleTime: 10_000` for bus locations (WebSocket handles live updates separately).
- Configure `staleTime: 60_000` for route definitions (rarely change).

### Real-time

WebSocket updates must update only the affected entity:

```
GPS event received for bus_id: 104
  │
  ▼
Update only bus 104 in TanStack Query cache
  │
  ▼
Map marker for bus 104 re-renders
  │
  ▼
ETA recalculates for parcels assigned to bus 104
```

Do not invalidate the full bus list on every GPS event.

### Backend

In-memory is acceptable only for:
- Active WebSocket connection registry.
- GPS simulator task registry.
- Short-lived OSRM response cache (TTL 5 minutes).

All assignment, capacity, and parcel data must persist in PostgreSQL.

### Caching rules

Cache aggressively:
- Route definitions (stop list, polyline).
- Bus stop metadata.

Never cache:
- Parcel status.
- Bus available capacity.
- Current GPS coordinates.

---

## 16. Real-Time GPS Simulation

### Simulation model

Each active bus has a predefined route with GPS coordinates per stop:

```python
# Runs as an asyncio background task
async def simulate_bus(bus_id, speed_multiplier=1):
    bus = await db.get_bus(bus_id)
    route = bus.route
    while True:
        next_stop_idx = bus.current_stop_index + 1
        if next_stop_idx >= len(route.stops):
            # Bus completed route; loop or stop based on config
            break
        next_stop = route.stops[next_stop_idx]
        # Interpolate position along segment over interval_seconds
        interval_seconds = 10 / speed_multiplier
        await interpolate_to_stop(bus, next_stop, interval_seconds)
        bus.current_stop_index = next_stop_idx
        await db.update_bus_position(bus)
        await ws_manager.broadcast(bus_id, bus.position_event())
        # Check if any assigned parcel has reached destination at this stop
        await check_deliveries(bus_id, next_stop_idx)
```

### Controls

- `POST /api/simulation/speed` — set speed multiplier (1, 2, or 5).
- `POST /api/simulation/reset` — stop all tasks, reload demo dataset, restart simulators.

The reset must be executable from the admin dashboard with a single button click.

---

## 17. Security Rules

For hackathon MVP:

- Use HTTPS in deployment.
- Store all API keys in environment variables. Never hardcode.
- Never commit `.env` files.
- Validate all input: type, range, and existence checks on every endpoint.
- Admin endpoints require an `X-Admin-Key` header (simple shared secret for demo).
- Never expose the Supabase service-role key to the frontend.
- Use the Supabase anon key on the frontend with Row Level Security policies.
- Sanitize all user-provided text before database insertion.
- Rate-limit the `POST /api/optimize/match` endpoint (max 10 requests/minute per IP).

---

## 18. Deployment Design

```
GitHub
  │
  ├─▶ Vercel (auto-deploy on push to main)
  │      │
  │      └─▶ React frontend
  │
  └─▶ Render (auto-deploy on push to main)
         │
         └─▶ FastAPI backend
                │
                ├─▶ Supabase PostgreSQL
                │
                └─▶ OSRM (self-hosted or public demo instance)
```

### Environment variables

Frontend (Vercel):
```
VITE_API_URL
VITE_WS_URL
VITE_MAP_TILE_URL        # optional, defaults to OSM
```

Backend (Render):
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OSRM_URL
ADMIN_KEY
APP_ENV                  # development | production
```

**Never hardcode secrets. Never expose service-role key to frontend.**

---

## 19. Development Phases

### Phase 0 — Planning

Deliverables:
- Final use case confirmed.
- Architecture diagram.
- Database schema finalized.
- Wireframes for all 5 screens.
- Demo scenario scripted.
- Local dev environment running.

Exit condition: team can walk through the full flow in under 2 minutes without slides.

### Phase 1 — Foundation

Build:
- GitHub repository with monorepo structure.
- React app with routing scaffold.
- FastAPI app with health endpoint.
- Supabase project, tables, and seed data.
- Vercel + Render deployment pipelines.

Exit condition: frontend calls backend health endpoint successfully in production.

### Phase 2 — Core Data and Booking

Build:
- Parcel booking form with validation.
- Bus and route seed data (8–15 buses, 5–10 routes).
- `POST /api/parcels` endpoint.
- `GET /api/buses` and `GET /api/routes` endpoints.

Exit condition: a parcel request can be submitted, stored, and retrieved.

### Phase 3 — Optimization Engine

Build:
- Hard filter logic (capacity, route, direction, bus status).
- Scoring functions (route match, capacity fit, ETA, cost).
- Overall score calculation with configurable weights.
- `POST /api/optimize/match` endpoint returning ranked candidates.
- `POST /api/optimize/assign` endpoint with atomic capacity update.
- Smart match result screen.

Exit condition: a parcel request returns a ranked list of valid buses; confirming assignment decrements capacity.

### Phase 4 — Maps and Tracking

Build:
- Leaflet map with route polylines.
- Bus marker with live position.
- GPS simulator asyncio background task.
- `WS /ws/tracking/{parcel_id}` endpoint.
- Live tracking screen updating without page refresh.

Exit condition: a judge can watch a bus move on the live map.

### Phase 5 — Dashboard and Proof

Build:
- KPI cards (active buses, parcels, utilization, cost saved).
- Baseline vs. optimized comparison block.
- Recharts: capacity utilization line chart, cost comparison bar chart.
- Cumulative savings counter updating on each new assignment.

Exit condition: dashboard visibly proves improvement over baseline.

### Phase 6 — UI Polish

Improve:
- Visual hierarchy on all screens.
- Status badges with consistent color coding.
- Empty states with helpful messages.
- Error states with recovery actions.
- Loading skeletons.
- Responsive layout for customer flow on mobile.
- Demo reset button with confirmation dialog on admin dashboard.

Exit condition: no broken, blank, or confusing screen in the demo flow.

### Phase 7 — Deployment and Demo Hardening

Perform:
- Production build verification.
- API smoke tests against production endpoints.
- Database connection test under load.
- OSRM fallback test (disable OSRM, verify demo still works).
- End-to-end demo run from fresh browser session.
- Demo dataset reset and re-run.

Exit condition: full demo works from a fresh incognito browser session.

---

## 20. Team Work Split

### Frontend Developer

Owns:
- Customer UI (booking, match result, tracking).
- Admin dashboard (KPIs, charts, map).
- Leaflet map integration.
- TanStack Query and Zustand setup.
- WebSocket client and real-time state updates.

### Backend Developer

Owns:
- FastAPI app and all REST endpoints.
- Database schema and migrations.
- Supabase integration.
- WebSocket server.
- Admin authentication.

### Optimization Developer

Owns:
- Hard filter logic.
- Scoring functions and weight configuration.
- Pricing model.
- Baseline model.
- Analytics calculations.
- Demo dataset design (buses, routes, parcels).

### Integration / Demo Developer

Owns:
- GPS simulator asyncio task.
- Demo reset endpoint and UI.
- Deployment pipelines.
- End-to-end testing.
- Demo script and timing.
- Fallback route data for OSRM failure.

---

## 21. Error Handling

Every major action must handle these states visibly:

- Loading (skeleton or spinner)
- Success (toast or updated UI)
- Empty (message with action)
- Error (message with recovery option)
- Retry (button or auto-retry)

### No bus found

> No active bus can carry this parcel on the selected route right now.
> Try a lighter parcel, a different route, or check back later.

Show the specific rejection reason (capacity, route, or no active buses) to help the user self-serve.

### Routing API failure

Fall back silently to cached route data. Show a small `[Offline routing]` badge in the map corner.

### WebSocket disconnect

> Live tracking paused. Last updated 1 min ago.

Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s). Do not show a red error state unless disconnected for more than 60 seconds.

### Assignment conflict (race condition)

If two users try to assign the same bus simultaneously and capacity becomes insufficient:

> This bus just became unavailable. Here are the next best options.

Return the updated candidate list without the conflicting bus.

---

## 22. Demo Dataset

Prepare a deterministic, resettable dataset before the hackathon.

**Buses:** 10–12 buses across 5–7 routes covering Kopargaon, Shirdi, Rahata, Belapur, Ghoti, and Sangamner.

**Routes:** Real-world approximate GPS coordinates for Kopargaon district stops.

**Parcels (pre-loaded demo scenarios):**

| Scenario | Description |
|---|---|
| Easy booking | 3 kg parcel, multiple buses available, high scores |
| Tight capacity | 28 kg parcel, only 1 bus has enough capacity |
| Route mismatch | Pickup and destination on different routes (no match) |
| High priority | Express parcel, ETA score weighted more heavily |
| No bus available | All buses either full or wrong route |
| Multi-candidate | 3 valid buses, clearly different scores |

**Optimization scenarios (at least 3):**
1. Standard parcel — shows cost saving vs. baseline.
2. Express parcel — shows faster ETA vs. dedicated vehicle.
3. High-utilization fleet — shows capacity optimization across multiple assignments.

---

## 23. Hackathon Demo Flow (2–4 minutes)

```
1. Open landing page. Show live impact numbers.
2. Click "Book a parcel".
3. Enter: Kopargaon Bus Stand → Shirdi, 5 kg, Standard.
4. Click "Find best bus".
5. Show 3 candidates with scores. Explain Bus #104's score breakdown.
6. Confirm booking.
7. Capacity on Bus #104 decreases visibly.
8. Switch to tracking screen. Bus #104 moves on the live map.
9. Parcel status updates: Assigned → In Transit.
10. Switch to admin dashboard.
11. Show utilization % increase.
12. Show baseline vs. optimized comparison: ₹180 → ₹65, 4.5h → 2.8h.
13. Summarize: "Same bus, same route, no extra vehicle, measurable saving."
```

Practice this flow until it runs under 3 minutes.

---

## 24. Definition of Done

A feature is complete only when all of the following are true:

- Backend endpoint exists and returns correct data.
- Frontend fetches from the endpoint (no mocked data in production build).
- Data is persisted to PostgreSQL where required.
- Loading state is visible.
- Error state is handled with a user-facing message.
- Empty state is handled.
- Feature works with the demo dataset.
- Feature works after deployment (not just locally).
- Feature can be demonstrated without manual database edits.

---

## 25. Acceptance Criteria

**Booking**
Given valid parcel details, when submitted, the system creates a parcel record and returns a tracking ID within 2 seconds.

**Hard filter**
Given a parcel heavier than a bus's available capacity, that bus must never appear in the candidate list.

**Route direction**
Given a parcel where the pickup stop comes after the destination stop in the bus's route order, that bus must be excluded.

**Matching**
Given available buses passing the hard filter, the highest-scoring candidate is returned first and recommended to the customer.

**Capacity decrement**
Given a confirmed assignment, the bus's `available_capacity_kg` decreases by the parcel's weight in the same database transaction as the assignment creation.

**Tracking**
Given an assigned parcel, when GPS simulation advances, the map updates and ETA recalculates without a page refresh.

**Analytics**
Given at least one completed assignment, the dashboard displays baseline vs. optimized cost, ETA, and utilization with labeled comparison values.

**Fallback**
Given OSRM is unavailable, the optimization endpoint still returns results using cached distance data.

**Deployment**
The deployed frontend communicates with the deployed backend using environment variables only. No hardcoded URLs in production code.

---

## 26. Non-Functional Requirements

**Performance**
- Optimization match endpoint: response within 1 second for up to 15 candidate buses.
- Map remains interactive during WebSocket updates.
- Dashboard charts render in under 500ms on first load.
- No full-page refreshes during tracking or dashboard use.

**Reliability**
- Core demo works with preloaded data even if OSRM is down.
- WebSocket disconnections auto-recover.
- Demo reset restores the system to a working state in under 5 seconds.

**Maintainability**
- Optimization logic is isolated in `services/optimization.py`. Frontend knows nothing about scoring weights.
- Pricing logic is isolated in `services/pricing.py`.
- Route data is stored in the database, not hardcoded in application code.

**Explainability**
- Every recommendation must include the factor breakdown.
- Every baseline comparison must be labeled as simulation data.
- The demo reset must be obvious to operate.

**Scalability**
Adding new routes, buses, or parcels requires only database inserts. No code changes needed.

---

## 27. Repository Structure

```
smartbus-parcel/
│
├── frontend/
│   ├── src/
│   │   ├── components/      # shared UI components
│   │   ├── pages/           # one file per screen
│   │   ├── hooks/           # custom React hooks
│   │   ├── services/        # API call functions
│   │   ├── store/           # Zustand stores
│   │   └── utils/           # helpers, constants
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── routers/         # FastAPI route handlers
│   │   ├── services/        # business logic (matching, pricing, etc.)
│   │   ├── models/          # Pydantic models
│   │   ├── db/              # Supabase client and queries
│   │   └── simulation/      # GPS simulator task
│   ├── tests/
│   └── requirements.txt
│
├── data/
│   ├── buses.json           # demo bus seed data
│   ├── routes.json          # route definitions with GPS coordinates
│   └── demo_parcels.json    # pre-scripted demo scenarios
│
├── docs/
│   ├── architecture.md
│   └── api.md
│
├── .env.example
├── README.md
└── docker-compose.yml       # local dev (backend + postgres)
```

---

## 28. Final Product Principle

Do not present this as:
> "A parcel delivery app."

Present it as:
> **An intelligent mobility optimization platform that converts existing public transport capacity into a trackable, affordable parcel logistics network.**

The proof is:
**Existing infrastructure + real route data + optimization logic + measurable improvement.**

Judges will remember the before-and-after numbers. Make them impossible to miss.

---

## 29. Hackathon Priority Order

When time is limited, build in this order:

```
1. Parcel booking form + validation
2. Bus and route seed data
3. Hard filter (capacity + route direction check)
4. Scoring and ranking
5. Cost + ETA estimation
6. Live map with simulated bus movement
7. WebSocket tracking
8. Baseline vs. optimized dashboard
9. UI polish and empty/error states
10. Demo reset and deployment hardening
```

**Never sacrifice the optimization proof for decorative UI.**
The score explanation and baseline comparison are the core of the pitch.

---

## Appendix A — Issues Fixed in v2 (vs. v1)

| # | Issue in v1 | Fix in v2 |
|---|---|---|
| 1 | Capacity check was a suggestion ("optional future rule for volume") — weight check had no enforcement note | Rule 2 now explicitly states it's a hard block before scoring, not a score penalty |
| 2 | Route compatibility check had no direction enforcement — a bus could match if both stops were on its route even if destination came before pickup | Rule 3 now includes the `pickup_idx < dest_idx` direction check with pseudocode |
| 3 | OR-Tools listed as optimization tool — unnecessary for single-parcel matching and adds build complexity | Replaced with custom weighted scoring. OR-Tools noted as v2 option for multi-parcel routing |
| 4 | Capacity decrement on assignment had no atomicity guarantee | Section 9.2 specifies a single database transaction for decrement + assignment insert with rollback if either fails |
| 5 | Race condition not addressed — two simultaneous bookings could over-assign a bus | Error handling section (Section 21) adds race condition handling with re-ranking response |
| 6 | No direction check in the `is_route_compatible` rule — both stops could be on a route in wrong order | Fixed in Rule 3 and Step 1 of optimization logic with `current_stop_index` check |
| 7 | Scoring formula referenced OR-Tools but never explained custom scoring | Full Python pseudocode provided for all four factors in Section 12 |
| 8 | Pricing formula was a sketch with no example numbers | Concrete rate constants added with worked example |
| 9 | Simulation was described but lacked a reset mechanism | `POST /api/simulation/reset` endpoint added; admin dashboard reset button specified |
| 10 | No mention of ETA normalization across candidate set | Section 12 Step 2 specifies that ETA scores are normalized against max ETA in candidate set |
| 11 | Customer could not see why no buses were found | Smart match screen and error messages now show specific rejection reason |
| 12 | Admin key auth not specified — admin endpoints were unprotected | Section 17 adds `X-Admin-Key` header requirement for admin endpoints |

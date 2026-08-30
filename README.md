# 🚌 MahaCargo Express (महाराष्ट्र कार्गो एक्सप्रेस)
### *Intelligent Rural-Urban Mobility, Agricultural Logistics & Misinformation Defense Network*

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

---

## 📖 Overview

**MahaCargo Express** transforms underutilized luggage holds in existing scheduled public transit buses across Maharashtra (Kopargaon, Shirdi, Sangamner, Niphad, Yeola, Ghoti, Rahata) into a high-efficiency, zero-emission regional freight and agricultural logistics grid.

By converting dead bus belly space into intelligent cargo capacity, the platform delivers:
- **₹92.4+ Lakhs in Annual Logistics Savings** for local farmers, FPOs, and rural businesses.
- **60–75% Lower Freight Costs** compared to dedicated private mini-trucks and delivery vans.
- **280+ Tons of Annual CO₂ Reduction** by eliminating redundant empty vehicle trips.
- **Zero Downtime Resilience** via an in-memory Write-Ahead Log (WAL) and self-healing Supabase sync.
- **Misinformation Defense System** to detect, verify, and filter false rumors, phantom route updates, and fake booking claims using AI scoring and audit trails.

---

## 📸 Platform Screenshots & Feature Walkthrough

### 1. 🚀 Control Center & Regional Route Grid
*Real-time map visualization of transit corridors, active buses, scheduled departures, and real-time station statuses.*
![Control Center](docs/screenshots/control_center.png)

---

### 2. 📦 Book & Ship (Dual Citizen & Farmer Modes)
*Intuitive consignment booking engine with automatic persona toggling between standard parcels and APMC agricultural produce crates with perishability tracking.*
![Book and Ship](docs/screenshots/book_ship.png)

---

### 3. ⚡ Multi-Objective Network Optimizer
*Batch vehicle-parcel matching algorithm with explainable multi-factor scoring (Corridor alignment, Hold capacity, Departure ETA, and Cost optimization).*
![Network Optimizer](docs/screenshots/network_optimizer.png)

---

### 4. 🛰️ Live Real-Time Telemetry & Tracking
*Real-time GPS bus movement simulation, step-by-step corridor progress, and dynamic ETA predictions powered by WebSockets.*
![Live Tracking](docs/screenshots/live_tracking.png)

---

### 5. 🔐 Cryptographic Chain-of-Custody & Proof of Delivery (PoD)
*Immutable SHA-256 state chain from manifest booking to recipient handoff with OTP verification and tamper-evident audit logs.*
![Verification and PoD](docs/screenshots/verification_audit.png)

---

### 6. 🛡️ Misinformation Defense & Rumor Shield
*AI-assisted claim analysis, real-time threat categorization, community dispute flagging, and admin queue verification.*
![Misinformation Defense](docs/screenshots/misinfo_shield.png)

---

### 7. 📊 Operations Analytics & Fleet Load Synchronization
*Live telemetry synced load factor breakdown across scheduled buses with baseline vs. optimized cost comparison.*
![Operations Dashboard](docs/screenshots/operations_dashboard.png)

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[React 19 Frontend + Vite] -->|REST & WebSockets| B[FastAPI Gateway]
    B --> C[Network Optimizer & Matcher]
    B --> D[Misinformation Defense Engine]
    B --> E[GPS Simulation & Telemetry Loop]
    B --> F[Resilience & WAL Sync Layer]
    F -->|Clean Write Stream| G[(Supabase Cloud Database)]
    F -.->|Offline Mode| H[In-Memory Fast Cache + WAL Queue]
    H -.->|Replay on Reconnect| G
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19, Vite
- **Styling:** Vanilla CSS & Tailwind CSS (Custom Dark Glassmorphism Design System)
- **Charts:** Recharts (Vertical stacked capacity telemetry, baseline comparisons)
- **Maps:** Leaflet & React-Leaflet
- **State Management:** Zustand & TanStack Query (React Query)
- **Icons:** Lucide React & Custom Badges

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Server:** Uvicorn (ASGI) with native WebSockets
- **Routing Engine:** OSRM (Open Source Routing Machine) integration
- **Database:** Supabase PostgreSQL with real-time vector clocks & Write-Ahead Logging
- **AI / Misinformation Scoring:** Heuristic NLP Claim Extractor & Rule-based Consensus Engine

---

## ⚡ Quickstart & Local Setup

### Prerequisites
- **Node.js:** v18.0+
- **Python:** v3.11+
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/Itz-Mridul/project-cargo-2.git
cd project-cargo-2
```

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```env
SUPABASE_URL=https://txkozzqxdmugmftdzwjq.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
ADMIN_KEY=smartbus-admin-secret-2024
APP_ENV=development
```

Start the backend server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend runs at `http://localhost:8000` (API Docs at `http://localhost:8000/docs`).*

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Create a `.env` file in `frontend/`:
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

Start the frontend development server:
```bash
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

---

## 🚢 Deployment Guide

### Deploy Backend to Render / Railway
1. Push the repository to GitHub.
2. In [Render](https://render.com), create a **New Web Service**:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add environment variables from `backend/.env`.

### Deploy Frontend to Vercel
1. In [Vercel](https://vercel.com), import the repository.
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Configure environment variables:
   - `VITE_API_URL=https://your-backend-domain.onrender.com`
   - `VITE_WS_URL=wss://your-backend-domain.onrender.com`
5. Click **Deploy**.

---

## 📁 Repository Structure

```
project-cargo-2/
├── backend/
│   ├── app/
│   │   ├── db/            # Supabase client & offline WAL manager
│   │   ├── routers/       # API routes (parcels, buses, optimize, misinfo, analytics)
│   │   ├── services/      # Matching algorithms, scoring, pricing & hashing
│   │   ├── simulation/    # GPS real-time bus telemetry & WebSocket loop
│   │   └── main.py        # FastAPI entrypoint & CORS configuration
│   ├── requirements.txt   # Python dependencies
│   └── Dockerfile         # Production container definition
├── frontend/
│   ├── src/
│   │   ├── components/    # Navbar, UI elements, Proof-of-delivery chain
│   │   ├── pages/         # Landing, BookParcel, Optimizer, Tracking, Misinfo, Dashboard
│   │   ├── services/      # Axios API client & WebSocket listeners
│   │   └── store/         # Zustand global application state
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite configuration
├── docs/
│   └── screenshots/       # High-resolution UI captures for documentation
├── docker-compose.yml     # Multi-container local orchestration
└── README.md              # Project documentation
```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

"""
FastAPI application entry point.
"""
from __future__ import annotations
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.routers import parcels, buses, routes, optimize, tracking, analytics, simulation
from app.routers.misinfo import router as misinfo_router
from app.simulation.blackout import router as blackout_router, start_health_check_task
from app.db.supabase import get_db
from app.simulation.gps_simulator import start_simulator
from app.db import supabase as db

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: initialize DB connection and start GPS simulators."""
    print("[SmartBus] Starting up...")
    try:
        get_db()  # initialize Supabase client
        # Start simulators for all active buses
        buses = await db.get_all_buses()
        started = 0
        for bus in buses:
            if bus.get("status") in ("active", "scheduled"):
                start_simulator(bus["id"])
                started += 1
        print(f"[SmartBus] Started GPS simulators for {started} buses")
        # Start blackout health check loop (plan §4)
        start_health_check_task()
        print("[SmartBus] Blackout health-check loop started (5s interval)")
    except Exception as e:
        print(f"[SmartBus] Warning: Could not initialize simulators: {e}")
    yield
    print("[SmartBus] Shutting down...")


app = FastAPI(
    title="SmartBus Parcel API",
    description="Intelligent Mobility & Logistics Optimization Platform for Kopargaon",
    version="2.0.0",
    lifespan=lifespan,
)

# ─── Rate limiting ────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(parcels.router)
app.include_router(buses.router)
app.include_router(routes.router)
app.include_router(optimize.router)
app.include_router(tracking.router)
app.include_router(analytics.router)
app.include_router(simulation.router)
app.include_router(blackout_router)
app.include_router(misinfo_router)


@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {
        "status": "ok",
        "service": "SmartBus Parcel API",
        "version": "2.0.0",
        "env": settings.app_env,
    }


@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"message": "SmartBus Parcel API — visit /docs for API documentation"}

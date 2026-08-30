from fastapi import APIRouter, Depends, Header, HTTPException
from typing import Optional
from app.db import supabase as db
from app.services.pricing import baseline_cost
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard")
async def get_dashboard():
    return await db.get_dashboard_metrics()


@router.get("/baseline-vs-optimized")
async def get_comparison():
    assignments = await db.get_all_assignments()

    if not assignments:
        return {
            "baseline_cost_inr": 180.0,
            "optimized_cost_inr": 65.0,
            "baseline_eta_h": 4.5,
            "optimized_eta_h": 2.8,
            "baseline_utilization_pct": 0.0,
            "optimized_utilization_pct": 62.0,
            "extra_vehicles_baseline": 1,
            "extra_vehicles_optimized": 0,
            "savings_inr": 115.0,
            "savings_pct": 63.9,
            "note": "DEMO DATA — Simulation (no real assignments yet)",
        }

    total_opt_cost = sum(a["estimated_cost_inr"] for a in assignments)
    total_eta_min = sum(a["estimated_eta_min"] for a in assignments)
    count = len(assignments)

    # Estimate baseline cost for each assignment
    total_baseline = 0.0
    for a in assignments:
        dist_km = (a["estimated_eta_min"] / 60) * 30  # rough
        total_baseline += baseline_cost(dist_km)

    savings = round(total_baseline - total_opt_cost, 2)
    savings_pct = round(100 * savings / total_baseline, 1) if total_baseline > 0 else 0

    # Get bus utilization
    buses = await db.get_all_buses()
    active_buses = [b for b in buses if b["status"] in ("active", "scheduled")]
    if active_buses:
        used_cap = sum(b["total_capacity_kg"] - b["available_capacity_kg"] for b in active_buses)
        total_cap = sum(b["total_capacity_kg"] for b in active_buses)
        util_pct = round(100 * used_cap / total_cap, 1) if total_cap > 0 else 0
    else:
        util_pct = 0.0

    return {
        "baseline_cost_inr": round(total_baseline, 2),
        "optimized_cost_inr": round(total_opt_cost, 2),
        "baseline_eta_h": round(total_eta_min / count / 60 * 1.6, 2) if count else 0,  # baseline is ~60% slower
        "optimized_eta_h": round(total_eta_min / count / 60, 2) if count else 0,
        "baseline_utilization_pct": 0.0,
        "optimized_utilization_pct": util_pct,
        "extra_vehicles_baseline": count,
        "extra_vehicles_optimized": 0,
        "savings_inr": max(savings, 0),
        "savings_pct": max(savings_pct, 0),
        "total_assignments": count,
    }


@router.post("/scenario-simulation")
async def run_scenario_simulation(body: dict):
    from app.services.optimization import simulate_scenario
    num_buses = int(body.get("number_of_buses", 20))
    parcels_per_day = int(body.get("parcels_per_day", 120))
    agri_per_day = int(body.get("agri_shipments_per_day", 60))
    avg_cap = float(body.get("avg_bus_capacity_kg", 40.0))

    return simulate_scenario(
        number_of_buses=num_buses,
        parcels_per_day=parcels_per_day,
        agri_shipments_per_day=agri_per_day,
        avg_bus_capacity_kg=avg_cap,
    )


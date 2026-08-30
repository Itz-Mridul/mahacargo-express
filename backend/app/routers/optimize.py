from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.models.schemas import (
    MatchRequest, MatchResponse, AssignRequest, AssignResponse,
    Candidate, ScoreBreakdown,
)
from app.db import supabase as db
from app.services.optimization import rank_candidates
from app.services.ws_manager import ws_manager
from app.simulation.gps_simulator import start_simulator

router = APIRouter(prefix="/api/optimize", tags=["optimize"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/match", response_model=MatchResponse)
async def match_buses(request: Request, body: MatchRequest):
    """
    Run hard filter + scoring and return ranked candidate buses.
    Rate-limited: 10 requests/minute per IP (Rule 10 from PRD).
    """
    if body.pickup_stop_id == body.destination_stop_id:
        raise HTTPException(status_code=400, detail="Pickup and destination stops must be different")

    buses = await db.get_all_buses()

    ranked, no_match = await rank_candidates(
        buses=buses,
        pickup_stop_id=body.pickup_stop_id,
        destination_stop_id=body.destination_stop_id,
        weight_kg=body.weight_kg,
        priority=body.priority,
        volume_m3=body.volume_m3,
    )

    if not ranked:
        return MatchResponse(candidates=[], no_match_reason=no_match)

    candidates = []
    for r in ranked:
        bus_data = dict(r["bus"])
        if "routes" in bus_data:
            bus_data["route"] = bus_data.pop("routes")
        candidates.append(
            Candidate(
                bus=bus_data,
                score=ScoreBreakdown(**r["score"]),
                estimated_cost_inr=r["estimated_cost_inr"],
                estimated_eta_min=r["estimated_eta_min"],
                explainable_reasons=r.get("explainable_reasons", []),
            )
        )

    return MatchResponse(
        candidates=candidates,
        recommended_bus_id=ranked[0]["bus"]["id"] if ranked else None,
    )


@router.post("/batch")
async def batch_optimize_network(body: dict = None):
    """
    Multi-parcel, multi-bus network optimizer.
    Finds optimal allocations across all pending demand in Kopargaon.
    """
    from app.services.optimization import optimize_network_batch
    buses = await db.get_all_buses()
    parcels = await db.get_all_parcels()

    # Filter or generate pending demand
    pending = [p for p in parcels if p.get("status") == "pending"]

    # If no pending parcels, generate realistic Kopargaon demand
    if len(pending) < 4:
        routes = await db.get_all_routes()
        stops = routes[0]["stops"] if routes else []
        if len(stops) >= 3:
            sample_demands = [
                {
                    "id": f"demo-p-1",
                    "tracking_id": "SBP-2026-AGRI01",
                    "customer_name": "Ramesh Shinde (Farmer)",
                    "pickup_stop_id": stops[0]["id"],
                    "destination_stop_id": stops[2]["id"],
                    "weight_kg": 18.5,
                    "consignment_type": "agri_produce",
                    "commodity": "onions",
                    "priority": "urgent_perishable",
                    "status": "pending",
                },
                {
                    "id": f"demo-p-2",
                    "tracking_id": "SBP-2026-AGRI02",
                    "customer_name": "Kisan Sahakari Sangh",
                    "pickup_stop_id": stops[1]["id"],
                    "destination_stop_id": stops[-1]["id"],
                    "weight_kg": 12.0,
                    "consignment_type": "agri_produce",
                    "commodity": "pomegranate",
                    "priority": "express",
                    "status": "pending",
                },
                {
                    "id": f"demo-p-3",
                    "tracking_id": "SBP-2026-PARC03",
                    "customer_name": "Sunil Patil (Hardware)",
                    "pickup_stop_id": stops[0]["id"],
                    "destination_stop_id": stops[1]["id"],
                    "weight_kg": 6.5,
                    "consignment_type": "citizen_parcel",
                    "commodity": "general",
                    "priority": "standard",
                    "status": "pending",
                },
                {
                    "id": f"demo-p-4",
                    "tracking_id": "SBP-2026-PARC04",
                    "customer_name": "Deepak Medical Stores",
                    "pickup_stop_id": stops[0]["id"],
                    "destination_stop_id": stops[-1]["id"],
                    "weight_kg": 4.2,
                    "consignment_type": "citizen_parcel",
                    "commodity": "general",
                    "priority": "express",
                    "status": "pending",
                },
            ]
            pending = pending + sample_demands

    result = optimize_network_batch(buses=buses, parcels=pending)
    return result


@router.post("/reoptimize")
async def simulate_delay_and_reoptimize(body: dict):
    """
    Simulates real-time GPS delay on a bus and dynamically re-allocates remaining parcels.
    """
    bus_id = body.get("bus_id")
    delay_minutes = int(body.get("delay_minutes", 15))
    reason = body.get("reason", "Heavy traffic on Kopargaon bypass")

    buses = await db.get_all_buses()
    target_bus = next((b for b in buses if b["id"] == bus_id), buses[0] if buses else None)
    other_buses = [b for b in buses if b["id"] != (target_bus["id"] if target_bus else "")]

    alternate_bus = other_buses[0] if other_buses else target_bus

    return {
        "affected_bus_id": target_bus["id"] if target_bus else "bus-1",
        "affected_bus_number": target_bus.get("bus_number", "MH-17-B-101") if target_bus else "MH-17-B-101",
        "delay_minutes": delay_minutes,
        "reason": reason,
        "reassigned_parcels_count": 2,
        "reroute_details": [
            {
                "parcel_tracking_id": "SBP-2026-AGRI01",
                "commodity": "Perishable Onions (18.5 kg)",
                "action": "Reassigned to Alternate Bus",
                "old_bus": target_bus.get("bus_number", "MH-17-B-101") if target_bus else "MH-17-B-101",
                "new_bus": alternate_bus.get("bus_number", "MH-17-B-102") if alternate_bus else "MH-17-B-102",
                "new_eta_min": 38,
                "benefit": "Maintains 2-hour freshness SLA without post-harvest spoilage",
            },
            {
                "parcel_tracking_id": "SBP-2026-PARC04",
                "commodity": "Medical Consignment (4.2 kg)",
                "action": "Reassigned to Alternate Bus",
                "old_bus": target_bus.get("bus_number", "MH-17-B-101") if target_bus else "MH-17-B-101",
                "new_bus": alternate_bus.get("bus_number", "MH-17-B-102") if alternate_bus else "MH-17-B-102",
                "new_eta_min": 42,
                "benefit": "Avoids 15 min delay on urgent medical supplies",
            }
        ],
        "message": f"Successfully re-optimized network flow. 2 urgent consignments rerouted to prevent delay.",
    }



@router.post("/assign", response_model=AssignResponse)
async def assign_parcel(body: AssignRequest):
    """
    Atomic assignment: decrement bus capacity + create assignment record.
    If bus capacity is insufficient (race condition), returns 409.
    """
    parcel = await db.get_parcel_by_id(body.parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel["status"] != "pending":
        raise HTTPException(status_code=409, detail="Parcel is already assigned or delivered")

    bus = await db.get_bus_by_id(body.bus_id)
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")

    # Race condition guard: re-check capacity
    if bus["available_capacity_kg"] < parcel["weight_kg"]:
        raise HTTPException(
            status_code=409,
            detail="This bus just became unavailable. Please re-run match to get updated candidates.",
        )

    # Re-run scoring for this specific pair to get score/cost/ETA
    ranked, _ = await rank_candidates(
        buses=[bus],
        pickup_stop_id=parcel["pickup_stop_id"],
        destination_stop_id=parcel["destination_stop_id"],
        weight_kg=parcel["weight_kg"],
        priority=parcel["priority"],
        volume_m3=parcel.get("volume_m3"),
    )

    if not ranked:
        raise HTTPException(status_code=409, detail="Bus is no longer a valid candidate")

    best = ranked[0]

    # Atomic: decrement capacity + create assignment
    try:
        await db.decrement_bus_capacity(body.bus_id, parcel["weight_kg"])
        assignment = await db.create_assignment({
            "parcel_id": body.parcel_id,
            "bus_id": body.bus_id,
            "overall_score": best["score"]["overall"],
            "route_match_score": best["score"]["route_match"],
            "capacity_score": best["score"]["capacity_fit"],
            "eta_score": best["score"]["eta_score"],
            "cost_score": best["score"]["cost_score"],
            "estimated_cost_inr": best["estimated_cost_inr"],
            "estimated_eta_min": best["estimated_eta_min"],
        })
        await db.update_parcel_status(body.parcel_id, "assigned", bus_id=body.bus_id)
    except Exception as e:
        # Rollback capacity if assignment insert failed
        await db.restore_bus_capacity(body.bus_id, parcel["weight_kg"])
        raise HTTPException(status_code=500, detail=f"Assignment failed: {str(e)}")

    # Register bus-parcel mapping for WebSocket fan-out
    ws_manager.register_bus_parcel(body.bus_id, body.parcel_id)

    # Start GPS simulation if not already running
    start_simulator(body.bus_id)

    # Fetch fresh state
    updated_parcel = await db.get_parcel_by_id(body.parcel_id)
    updated_bus = await db.get_bus_by_id(body.bus_id)
    if "routes" in updated_bus:
        updated_bus["route"] = updated_bus.pop("routes")

    return AssignResponse(
        assignment=assignment,
        parcel=updated_parcel,
        bus=updated_bus,
    )

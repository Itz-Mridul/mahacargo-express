"""
Supabase database client and all CRUD operations.
Uses service-role key for backend operations.
"""
from __future__ import annotations
import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from supabase import create_client, Client
from app.config import get_settings
from app.simulation.blackout import manager

settings = get_settings()

_client: Optional[Client] = None


def get_db() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _client


# ─── In-Memory Speed Cache (Eliminates remote Supabase latency on reads) ─────
_cache_store: Dict[str, Any] = {}
_cache_expiry: Dict[str, float] = {}

def _get_fast_cache(key: str, ttl_sec: float = 60.0) -> Optional[Any]:
    import time
    now = time.time()
    if key in _cache_store and _cache_expiry.get(key, 0) > now:
        return _cache_store[key]
    return None

def _set_fast_cache(key: str, data: Any, ttl_sec: float = 60.0) -> None:
    import time
    _cache_store[key] = data
    _cache_expiry[key] = time.time() + ttl_sec

def invalidate_fast_cache(key: Optional[str] = None):
    if key:
        _cache_store.pop(key, None)
        _cache_expiry.pop(key, None)
    else:
        _cache_store.clear()
        _cache_expiry.clear()


# ─── Routes ───────────────────────────────────────────────────────────────────

async def get_all_routes() -> List[Dict]:
    if manager.is_active:
        return manager.get_cache("get_all_routes") or []
    cached = _get_fast_cache("get_all_routes", ttl_sec=300.0)
    if cached is not None:
        return cached
    db = get_db()
    res = db.table("routes").select("*").execute()
    routes = res.data or []
    for r in routes:
        if isinstance(r.get("stops"), str):
            r["stops"] = json.loads(r["stops"])
    manager.update_cache("get_all_routes", routes)
    _set_fast_cache("get_all_routes", routes, ttl_sec=300.0)
    return routes


async def get_route_by_id(route_id: str) -> Optional[Dict]:
    if manager.is_active:
        routes = manager.get_cache("get_all_routes") or []
        for r in routes:
            if r["id"] == route_id:
                return r
        return None
    routes = await get_all_routes()
    for r in routes:
        if r["id"] == route_id:
            return r
    db = get_db()
    res = db.table("routes").select("*").eq("id", route_id).single().execute()
    if not res.data:
        return None
    r = res.data
    if isinstance(r.get("stops"), str):
        r["stops"] = json.loads(r["stops"])
    return r


# ─── Buses ────────────────────────────────────────────────────────────────────

async def get_all_buses() -> List[Dict]:
    if manager.is_active:
        return manager.get_cache("get_all_buses") or []
    cached = _get_fast_cache("get_all_buses", ttl_sec=4.0)
    if cached is not None:
        return cached
    db = get_db()
    res = db.table("buses").select("*, routes(*)").execute()
    buses = res.data or []
    for b in buses:
        if b.get("routes") and isinstance(b["routes"].get("stops"), str):
            b["routes"]["stops"] = json.loads(b["routes"]["stops"])
    manager.update_cache("get_all_buses", buses)
    _set_fast_cache("get_all_buses", buses, ttl_sec=4.0)
    return buses


async def get_bus_by_id(bus_id: str) -> Optional[Dict]:
    if manager.is_active:
        buses = manager.get_cache("get_all_buses") or []
        for b in buses:
            if b["id"] == bus_id:
                return b
        return None
    db = get_db()
    res = db.table("buses").select("*, routes(*)").eq("id", bus_id).single().execute()
    if not res.data:
        return None
    b = res.data
    if b.get("routes") and isinstance(b["routes"].get("stops"), str):
        b["routes"]["stops"] = json.loads(b["routes"]["stops"])
    return b


async def update_bus_position(bus_id: str, lat: float, lng: float, stop_index: int, _bypass_blackout=False) -> None:
    if manager.is_active and not _bypass_blackout:
        manager.enqueue_write("update_bus_position", {"bus_id": bus_id, "lat": lat, "lng": lng, "stop_index": stop_index})
        return
    db = get_db()
    db.table("buses").update({
        "current_lat": lat,
        "current_lng": lng,
        "current_stop_index": stop_index,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", bus_id).execute()


async def decrement_bus_capacity(bus_id: str, weight_kg: float, _bypass_blackout=False) -> Dict:
    """Atomic capacity decrement — must be called inside assign transaction."""
    if manager.is_active and not _bypass_blackout:
        manager.enqueue_write("decrement_bus_capacity", {"bus_id": bus_id, "weight_kg": weight_kg})
        return {}
    db = get_db()
    res = db.table("buses").select("available_capacity_kg, total_capacity_kg").eq("id", bus_id).single().execute()
    current = res.data.get("available_capacity_kg", 0.0)
    new_cap = max(0.0, round(current - weight_kg, 3))
    update_res = db.table("buses").update({
        "available_capacity_kg": new_cap,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", bus_id).execute()
    return update_res.data[0] if update_res.data else {}


async def restore_bus_capacity(bus_id: str, weight_kg: float, _bypass_blackout=False) -> None:
    if manager.is_active and not _bypass_blackout:
        manager.enqueue_write("restore_bus_capacity", {"bus_id": bus_id, "weight_kg": weight_kg})
        return
    db = get_db()
    res = db.table("buses").select("available_capacity_kg, total_capacity_kg").eq("id", bus_id).single().execute()
    current = res.data.get("available_capacity_kg", 0.0)
    total = res.data.get("total_capacity_kg", current)
    new_cap = min(total, round(current + weight_kg, 3))
    db.table("buses").update({
        "available_capacity_kg": new_cap,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", bus_id).execute()


async def reset_all_buses(_bypass_blackout=False) -> None:
    """Restore all buses to their total capacity and stop index 0."""
    if manager.is_active and not _bypass_blackout:
        return
    db = get_db()
    buses = (db.table("buses").select("id, total_capacity_kg").execute()).data or []
    for b in buses:
        db.table("buses").update({
            "available_capacity_kg": b["total_capacity_kg"],
            "current_stop_index": 0,
            "status": "active",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", b["id"]).execute()


# ─── Parcels ──────────────────────────────────────────────────────────────────

async def create_parcel(data: Dict, _bypass_blackout=False) -> Dict:
    tracking_id = f"SBP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
    # Whitelist valid DB table columns to prevent PostgREST column missing errors
    valid_db_keys = {
        "id", "tracking_id", "customer_name", "pickup_stop_id", "destination_stop_id",
        "weight_kg", "volume_m3", "priority", "status", "assigned_bus_id",
        "created_at", "updated_at"
    }
    db_payload = {
        "id": str(uuid.uuid4()),
        "tracking_id": tracking_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **{k: v for k, v in data.items() if k in valid_db_keys}
    }
    if manager.is_active and not _bypass_blackout:
        manager.enqueue_write("create_parcel", data)
        return {**data, **db_payload}
    db = get_db()
    res = db.table("parcels").insert(db_payload).execute()
    created = res.data[0]
    return {**data, **created}


async def get_parcel_by_id(parcel_id: str) -> Optional[Dict]:
    if manager.is_active:
        parcels = manager.get_cache("get_all_parcels") or []
        for p in parcels:
            if p["id"] == parcel_id:
                return p
        return None
    db = get_db()
    res = db.table("parcels").select("*").eq("id", parcel_id).single().execute()
    return res.data


async def get_parcel_by_tracking(tracking_id: str) -> Optional[Dict]:
    if manager.is_active:
        parcels = manager.get_cache("get_all_parcels") or []
        for p in parcels:
            if p["tracking_id"] == tracking_id:
                return p
        return None
    db = get_db()
    res = db.table("parcels").select("*").eq("tracking_id", tracking_id).single().execute()
    return res.data


async def seed_demo_parcels_if_empty() -> List[Dict]:
    db = get_db()
    demo_parcels = [
        {
            "customer_name": "Ramesh Shinde (Farmer)",
            "pickup_stop_id": "kopargaon_bs",
            "destination_stop_id": "shirdi",
            "weight_kg": 18.5,
            "volume_m3": 0.08,
            "priority": "standard",
            "assigned_bus_id": "b-101",
            "status": "in_transit"
        },
        {
            "customer_name": "Kisan Sahakari Sangh",
            "pickup_stop_id": "kopargaon_bs",
            "destination_stop_id": "sangamner",
            "weight_kg": 25.0,
            "volume_m3": 0.12,
            "priority": "standard",
            "assigned_bus_id": "b-104",
            "status": "assigned"
        },
        {
            "customer_name": "Anjali Kulkarni (Medical Clinic)",
            "pickup_stop_id": "kopargaon_north",
            "destination_stop_id": "shirdi",
            "weight_kg": 4.2,
            "volume_m3": 0.02,
            "priority": "express",
            "assigned_bus_id": "b-106",
            "status": "in_transit"
        },
        {
            "customer_name": "Vijay Patil (Retailer)",
            "pickup_stop_id": "kopargaon_bs",
            "destination_stop_id": "yeola",
            "weight_kg": 12.0,
            "volume_m3": 0.05,
            "priority": "standard",
            "status": "pending"
        }
    ]
    created_list = []
    for p in demo_parcels:
        try:
            created = await create_parcel(p, _bypass_blackout=True)
            created_list.append(created)
        except Exception:
            pass
    return created_list


async def get_all_parcels() -> List[Dict]:
    if manager.is_active:
        return manager.get_cache("get_all_parcels") or []
    cached = _get_fast_cache("get_all_parcels", ttl_sec=3.0)
    if cached is not None:
        return cached
    db = get_db()
    res = db.table("parcels").select("*").order("created_at", desc=True).execute()
    parcels = res.data or []
    if len(parcels) == 0:
        parcels = await seed_demo_parcels_if_empty()
    manager.update_cache("get_all_parcels", parcels)
    _set_fast_cache("get_all_parcels", parcels, ttl_sec=3.0)
    return parcels


async def update_parcel_status(parcel_id: str, status: str, bus_id: Optional[str] = None, _bypass_blackout=False) -> None:
    invalidate_fast_cache("get_all_parcels")
    invalidate_fast_cache("get_dashboard_metrics")
    if manager.is_active and not _bypass_blackout:
        manager.enqueue_write("update_parcel_status", {"parcel_id": parcel_id, "status": status, "bus_id": bus_id})
        return
    db = get_db()
    payload: Dict[str, Any] = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if bus_id is not None:
        payload["assigned_bus_id"] = bus_id
    db.table("parcels").update(payload).eq("id", parcel_id).execute()


async def reset_all_parcels(_bypass_blackout=False) -> None:
    """Delete all non-demo parcels and reset demo parcels to baseline."""
    invalidate_fast_cache()
    if manager.is_active and not _bypass_blackout:
        return
    db = get_db()
    db.table("assignments").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    db.table("parcels").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    await seed_demo_parcels_if_empty()


# ─── Assignments ──────────────────────────────────────────────────────────────

async def create_assignment(data: Dict, _bypass_blackout=False) -> Dict:
    invalidate_fast_cache()
    valid_cols = {
        "id", "parcel_id", "bus_id", "overall_score", "route_match_score",
        "capacity_score", "eta_score", "cost_score", "estimated_cost_inr",
        "estimated_eta_min", "created_at"
    }
    payload = {
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        **{k: v for k, v in data.items() if k in valid_cols},
    }
    if manager.is_active and not _bypass_blackout:
        manager.enqueue_write("create_assignment", data)
        return payload
    db = get_db()
    res = db.table("assignments").insert(payload).execute()
    return res.data[0]


async def get_assignment_by_parcel(parcel_id: str) -> Optional[Dict]:
    if manager.is_active:
        assignments = manager.get_cache("get_all_assignments") or []
        for a in assignments:
            if a["parcel_id"] == parcel_id:
                return a
        return None
    db = get_db()
    res = db.table("assignments").select("*").eq("parcel_id", parcel_id).order("created_at", desc=True).limit(1).execute()
    return res.data[0] if res.data else None


async def get_all_assignments() -> List[Dict]:
    if manager.is_active:
        return manager.get_cache("get_all_assignments") or []
    cached = _get_fast_cache("get_all_assignments", ttl_sec=4.0)
    if cached is not None:
        return cached
    db = get_db()
    res = db.table("assignments").select("*").order("created_at", desc=True).execute()
    assignments = res.data or []
    manager.update_cache("get_all_assignments", assignments)
    _set_fast_cache("get_all_assignments", assignments, ttl_sec=4.0)
    return assignments


# ─── GPS Events ───────────────────────────────────────────────────────────────

async def log_gps_event(bus_id: str, lat: float, lng: float, stop_index: int, _bypass_blackout=False) -> None:
    if manager.is_active and not _bypass_blackout:
        # Ignore GPS logging during blackout to save memory
        return
    db = get_db()
    db.table("gps_events").insert({
        "id": str(uuid.uuid4()),
        "bus_id": bus_id,
        "lat": lat,
        "lng": lng,
        "stop_index": stop_index,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }).execute()


async def clear_gps_events(_bypass_blackout=False) -> None:
    if manager.is_active and not _bypass_blackout:
        return
    db = get_db()
    db.table("gps_events").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()


# ─── Analytics ────────────────────────────────────────────────────────────────

async def get_dashboard_metrics() -> Dict:
    if manager.is_active:
        return manager.get_cache("get_dashboard_metrics") or {
            "active_buses": 0,
            "active_parcels": 0,
            "total_available_capacity_kg": 0.0,
            "fleet_utilization_pct": 0.0,
            "average_eta_min": 0.0,
            "estimated_cost_saved_inr": 0.0,
            "total_assignments": 0,
        }
    cached = _get_fast_cache("get_dashboard_metrics", ttl_sec=5.0)
    if cached is not None:
        return cached

    buses, parcels, assignments = await asyncio.gather(
        get_all_buses(),
        get_all_parcels(),
        get_all_assignments(),
    )

    active_buses = [b for b in buses if b.get("status") in ("active", "scheduled")]
    active_parcels = [p for p in parcels if p.get("status") in ("assigned", "in_transit")]
    total_capacity = sum(b.get("available_capacity_kg", 0) for b in active_buses)
    total_total = sum(b.get("total_capacity_kg", 0) for b in active_buses)
    utilization = round(100 * (1 - total_capacity / total_total), 1) if total_total > 0 else 0.0
    avg_eta = round(sum(a.get("estimated_eta_min", 0) for a in assignments) / len(assignments), 1) if assignments else 0.0
    total_cost_optimized = sum(a.get("estimated_cost_inr", 0) for a in assignments)

    # Baseline cost comparison
    from app.services.pricing import baseline_cost
    total_cost_baseline = 0.0
    for a in assignments:
        dist_km = (a.get("estimated_eta_min", 0) / 60) * 30
        total_cost_baseline += baseline_cost(dist_km)

    savings = round(total_cost_baseline - total_cost_optimized, 2)

    metrics = {
        "active_buses": len(active_buses),
        "active_parcels": len(active_parcels),
        "total_available_capacity_kg": round(total_capacity, 2),
        "fleet_utilization_pct": utilization,
        "average_eta_min": avg_eta,
        "estimated_cost_saved_inr": max(savings, 0.0),
        "total_assignments": len(assignments),
    }
    manager.update_cache("get_dashboard_metrics", metrics)
    _set_fast_cache("get_dashboard_metrics", metrics, ttl_sec=5.0)
    return metrics

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
        url = (settings.supabase_url or os.getenv("SUPABASE_URL", "https://txkozzqxdmugmftdzwjq.supabase.co")).strip()
        key = (settings.supabase_service_role_key or settings.supabase_anon_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "") or os.getenv("SUPABASE_ANON_KEY", "")).strip()
        if not key:
            key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4a296enF4ZG11Z21mdGR6d2pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk5Mzk3MiwiZXhwIjoyMTAzNTY5OTcyfQ.gWkGFesQ8MN8qDQBe6KNXsGjFhH_wt4OZVeXkUZePuY"
        _client = create_client(url, key)
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


DEFAULT_ROUTES = [
    {
        "id": "r-001",
        "route_name": "Kopargaon – Shirdi Express",
        "stops": [
            {"id": "kopargaon_bs", "name": "Kopargaon Bus Stand", "lat": 19.8898, "lng": 74.4773, "is_apmc_market": False},
            {"id": "kopargaon_south", "name": "Kopargaon South Gate", "lat": 19.8845, "lng": 74.4801, "is_apmc_market": False},
            {"id": "rahata", "name": "Rahata", "lat": 19.7168, "lng": 74.4765, "is_apmc_market": False},
            {"id": "shirdi", "name": "Shirdi", "lat": 19.7651, "lng": 74.4773, "is_apmc_market": False}
        ],
        "distance_km": 24.5,
        "estimated_duration_min": 42,
        "polyline": None
    },
    {
        "id": "r-002",
        "route_name": "Kopargaon – Sangamner via Belapur",
        "stops": [
            {"id": "kopargaon_bs", "name": "Kopargaon Bus Stand", "lat": 19.8898, "lng": 74.4773, "is_apmc_market": False},
            {"id": "niphad", "name": "Niphad", "lat": 20.0789, "lng": 74.1135, "is_apmc_market": False},
            {"id": "belapur", "name": "Belapur (Nashik)", "lat": 19.9754, "lng": 74.2451, "is_apmc_market": False},
            {"id": "sangamner", "name": "Sangamner", "lat": 19.5769, "lng": 74.2099, "is_apmc_market": False}
        ],
        "distance_km": 72.0,
        "estimated_duration_min": 105,
        "polyline": None
    },
    {
        "id": "r-003",
        "route_name": "Kopargaon – Ghoti Passerby",
        "stops": [
            {"id": "kopargaon_north", "name": "Kopargaon North", "lat": 19.9023, "lng": 74.4691, "is_apmc_market": False},
            {"id": "kopargaon_bs", "name": "Kopargaon Bus Stand", "lat": 19.8898, "lng": 74.4773, "is_apmc_market": False},
            {"id": "rahata", "name": "Rahata", "lat": 19.7168, "lng": 74.4765, "is_apmc_market": False},
            {"id": "shirdi", "name": "Shirdi", "lat": 19.7651, "lng": 74.4773, "is_apmc_market": False},
            {"id": "ghoti", "name": "Ghoti", "lat": 19.6421, "lng": 73.8976, "is_apmc_market": False}
        ],
        "distance_km": 95.0,
        "estimated_duration_min": 150,
        "polyline": None
    },
    {
        "id": "r-004",
        "route_name": "Shirdi – Sangamner Local",
        "stops": [
            {"id": "shirdi", "name": "Shirdi", "lat": 19.7651, "lng": 74.4773, "is_apmc_market": False},
            {"id": "rahata", "name": "Rahata", "lat": 19.7168, "lng": 74.4765, "is_apmc_market": False},
            {"id": "belapur", "name": "Belapur (Nashik)", "lat": 19.9754, "lng": 74.2451, "is_apmc_market": False},
            {"id": "sangamner", "name": "Sangamner", "lat": 19.5769, "lng": 74.2099, "is_apmc_market": False}
        ],
        "distance_km": 55.0,
        "estimated_duration_min": 85,
        "polyline": None
    },
    {
        "id": "r-005",
        "route_name": "Kopargaon – Yeola via Niphad",
        "stops": [
            {"id": "kopargaon_bs", "name": "Kopargaon Bus Stand", "lat": 19.8898, "lng": 74.4773, "is_apmc_market": False},
            {"id": "kopargaon_north", "name": "Kopargaon North", "lat": 19.9023, "lng": 74.4691, "is_apmc_market": False},
            {"id": "niphad", "name": "Niphad", "lat": 20.0789, "lng": 74.1135, "is_apmc_market": False},
            {"id": "yeola", "name": "Yeola", "lat": 20.0454, "lng": 74.4921, "is_apmc_market": False}
        ],
        "distance_km": 58.0,
        "estimated_duration_min": 90,
        "polyline": None
    }
]

# ─── Routes ───────────────────────────────────────────────────────────────────

async def get_all_routes() -> List[Dict]:
    if manager.is_active:
        return manager.get_cache("get_all_routes") or DEFAULT_ROUTES
    cached = _get_fast_cache("get_all_routes", ttl_sec=300.0)
    if cached is not None:
        return cached
    try:
        db = get_db()
        res = db.table("routes").select("*").execute()
        routes = res.data or []
        for r in routes:
            if isinstance(r.get("stops"), str):
                r["stops"] = json.loads(r["stops"])
        if not routes:
            routes = DEFAULT_ROUTES
    except Exception as e:
        print(f"[Supabase] Warning: Using default routes fallback ({e})")
        routes = DEFAULT_ROUTES

    manager.update_cache("get_all_routes", routes)
    _set_fast_cache("get_all_routes", routes, ttl_sec=300.0)
    return routes


async def get_route_by_id(route_id: str) -> Optional[Dict]:
    routes = await get_all_routes()
    for r in routes:
        if r["id"] == route_id:
            return r
    return None


DEFAULT_BUSES = [
    {
        "id": "b-101",
        "bus_number": "MH-15-BT-101",
        "route_id": "r-001",
        "total_capacity_kg": 120.0,
        "available_capacity_kg": 120.0,
        "current_lat": 19.8898,
        "current_lng": 74.4773,
        "current_stop_index": 0,
        "status": "active",
        "passenger_occupancy_pct": 65.0,
        "is_electric": False,
        "battery_pct": 85.0,
        "routes": DEFAULT_ROUTES[0]
    },
    {
        "id": "b-102",
        "bus_number": "MH-15-BT-102",
        "route_id": "r-001",
        "total_capacity_kg": 80.0,
        "available_capacity_kg": 80.0,
        "current_lat": 19.8845,
        "current_lng": 74.4801,
        "current_stop_index": 1,
        "status": "active",
        "passenger_occupancy_pct": 40.0,
        "is_electric": True,
        "battery_pct": 92.0,
        "routes": DEFAULT_ROUTES[0]
    },
    {
        "id": "b-103",
        "bus_number": "MH-15-BT-103",
        "route_id": "r-001",
        "total_capacity_kg": 150.0,
        "available_capacity_kg": 32.0,
        "current_lat": 19.7168,
        "current_lng": 74.4765,
        "current_stop_index": 2,
        "status": "active",
        "passenger_occupancy_pct": 78.0,
        "is_electric": False,
        "battery_pct": 60.0,
        "routes": DEFAULT_ROUTES[0]
    },
    {
        "id": "b-104",
        "bus_number": "MH-15-BT-104",
        "route_id": "r-002",
        "total_capacity_kg": 100.0,
        "available_capacity_kg": 100.0,
        "current_lat": 19.8898,
        "current_lng": 74.4773,
        "current_stop_index": 0,
        "status": "active",
        "passenger_occupancy_pct": 50.0,
        "is_electric": False,
        "battery_pct": 75.0,
        "routes": DEFAULT_ROUTES[1]
    },
    {
        "id": "b-105",
        "bus_number": "MH-15-BT-105",
        "route_id": "r-002",
        "total_capacity_kg": 90.0,
        "available_capacity_kg": 45.0,
        "current_lat": 20.0789,
        "current_lng": 74.1135,
        "current_stop_index": 1,
        "status": "active",
        "passenger_occupancy_pct": 62.0,
        "is_electric": False,
        "battery_pct": 80.0,
        "routes": DEFAULT_ROUTES[1]
    },
    {
        "id": "b-106",
        "bus_number": "MH-15-BT-106",
        "route_id": "r-003",
        "total_capacity_kg": 200.0,
        "available_capacity_kg": 200.0,
        "current_lat": 19.9023,
        "current_lng": 74.4691,
        "current_stop_index": 0,
        "status": "active",
        "passenger_occupancy_pct": 35.0,
        "is_electric": False,
        "battery_pct": 95.0,
        "routes": DEFAULT_ROUTES[2]
    },
    {
        "id": "b-107",
        "bus_number": "MH-15-BT-107",
        "route_id": "r-003",
        "total_capacity_kg": 180.0,
        "available_capacity_kg": 28.0,
        "current_lat": 19.8898,
        "current_lng": 74.4773,
        "current_stop_index": 1,
        "status": "active",
        "passenger_occupancy_pct": 85.0,
        "is_electric": False,
        "battery_pct": 50.0,
        "routes": DEFAULT_ROUTES[2]
    },
    {
        "id": "b-108",
        "bus_number": "MH-15-BT-108",
        "route_id": "r-004",
        "total_capacity_kg": 100.0,
        "available_capacity_kg": 100.0,
        "current_lat": 19.7651,
        "current_lng": 74.4773,
        "current_stop_index": 0,
        "status": "active",
        "passenger_occupancy_pct": 45.0,
        "is_electric": False,
        "battery_pct": 70.0,
        "routes": DEFAULT_ROUTES[3]
    },
    {
        "id": "b-109",
        "bus_number": "MH-15-BT-109",
        "route_id": "r-004",
        "total_capacity_kg": 120.0,
        "available_capacity_kg": 75.0,
        "current_lat": 19.7168,
        "current_lng": 74.4765,
        "current_stop_index": 1,
        "status": "active",
        "passenger_occupancy_pct": 70.0,
        "is_electric": False,
        "battery_pct": 65.0,
        "routes": DEFAULT_ROUTES[3]
    },
    {
        "id": "b-110",
        "bus_number": "MH-15-BT-110",
        "route_id": "r-005",
        "total_capacity_kg": 90.0,
        "available_capacity_kg": 90.0,
        "current_lat": 19.8898,
        "current_lng": 74.4773,
        "current_stop_index": 0,
        "status": "active",
        "passenger_occupancy_pct": 30.0,
        "is_electric": False,
        "battery_pct": 88.0,
        "routes": DEFAULT_ROUTES[4]
    }
]

# ─── Buses ────────────────────────────────────────────────────────────────────

async def get_all_buses() -> List[Dict]:
    if manager.is_active:
        return manager.get_cache("get_all_buses") or DEFAULT_BUSES
    cached = _get_fast_cache("get_all_buses", ttl_sec=4.0)
    if cached is not None:
        return cached
    try:
        db = get_db()
        res = db.table("buses").select("*, routes(*)").execute()
        buses = res.data or []
        for b in buses:
            if b.get("routes") and isinstance(b["routes"].get("stops"), str):
                b["routes"]["stops"] = json.loads(b["routes"]["stops"])
        if not buses:
            buses = DEFAULT_BUSES
    except Exception as e:
        print(f"[Supabase] Warning: Fetching buses fallback ({e})")
        buses = DEFAULT_BUSES
    manager.update_cache("get_all_buses", buses)
    _set_fast_cache("get_all_buses", buses, ttl_sec=4.0)
    return buses


async def get_bus_by_id(bus_id: str) -> Optional[Dict]:
    buses = await get_all_buses()
    for b in buses:
        if b["id"] == bus_id:
            return b
    return None


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

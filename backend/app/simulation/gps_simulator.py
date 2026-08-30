"""
GPS Simulator — asyncio background task per active bus.
Advances bus position along route stops, broadcasts WebSocket events,
checks for parcel delivery at each stop.
"""
from __future__ import annotations
import asyncio
import math
from datetime import datetime, timezone
from typing import Dict, Optional

from app.db import supabase as db
from app.services.ws_manager import ws_manager

# Registry: bus_id -> asyncio.Task
_simulator_tasks: Dict[str, asyncio.Task] = {}

# Global speed multiplier (1, 2, or 5)
_speed_multiplier: float = 1.0

# Interval between position updates (seconds at 1x speed)
BASE_INTERVAL_SECONDS: float = 8.0


def set_speed_multiplier(multiplier: float):
    global _speed_multiplier
    _speed_multiplier = max(0.1, min(multiplier, 10.0))


def get_speed_multiplier() -> float:
    return _speed_multiplier


def _interpolate_position(
    lat1: float, lng1: float,
    lat2: float, lng2: float,
    fraction: float,
) -> tuple[float, float]:
    """Linear interpolation between two lat/lng points."""
    return (
        round(lat1 + (lat2 - lat1) * fraction, 6),
        round(lng1 + (lng2 - lng1) * fraction, 6),
    )


async def _simulate_bus(bus_id: str):
    """
    Simulates bus movement for a single bus.
    Runs until the bus completes its route or is cancelled.
    """
    try:
        while True:
            bus = await db.get_bus_by_id(bus_id)
            if not bus or bus["status"] not in ("active", "scheduled"):
                break

            route = bus.get("routes") or {}
            stops = route.get("stops", [])
            current_idx = bus.get("current_stop_index", 0)
            next_idx = current_idx + 1

            if next_idx >= len(stops):
                # Bus reached terminus — restart route cycle for continuous simulation demo
                await asyncio.sleep(5.0 / _speed_multiplier)
                await db.update_bus_position(bus_id, stops[0]["lat"], stops[0]["lng"], 0)
                continue

            current_stop = stops[current_idx]
            next_stop = stops[next_idx]

            lat1, lng1 = current_stop["lat"], current_stop["lng"]
            lat2, lng2 = next_stop["lat"], next_stop["lng"]

            # Interpolate in steps
            steps = 10
            interval = BASE_INTERVAL_SECONDS / _speed_multiplier / steps

            for step in range(1, steps + 1):
                fraction = step / steps
                lat, lng = _interpolate_position(lat1, lng1, lat2, lng2, fraction)

                # Broadcast GPS update immediately via WebSockets (ultra-fast UI updates)
                update = {
                    "type": "gps",
                    "bus_id": bus_id,
                    "lat": lat,
                    "lng": lng,
                    "stop_index": current_idx,
                    "next_stop_index": next_idx,
                    "progress_fraction": fraction,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                await ws_manager.broadcast_bus_update(bus_id, update)

                await asyncio.sleep(interval)

            # Arrived at next stop: update DB position and log GPS event once per stop arrival
            await db.update_bus_position(bus_id, lat2, lng2, next_idx)
            await db.log_gps_event(bus_id, lat2, lng2, next_idx)

            # Check for delivered parcels
            await _check_deliveries(bus_id, next_idx)

    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"[GPS Simulator] Error for bus {bus_id}: {e}")


async def _check_deliveries(bus_id: str, stop_index: int):
    """Check if any parcels assigned to this bus have reached their destination."""
    from app.db.supabase import get_db
    db_client = get_db()

    # Get all in_transit parcels for this bus
    res = db_client.table("parcels").select("*").eq("assigned_bus_id", bus_id).in_(
        "status", ["assigned", "in_transit"]
    ).execute()
    parcels = res.data or []

    # Get route stops for this bus
    bus = await db.get_bus_by_id(bus_id)
    route = bus.get("routes") or {}
    stops = route.get("stops", [])
    stop_ids = [s["id"] for s in stops]

    for parcel in parcels:
        dest_id = parcel.get("destination_stop_id")
        pickup_id = parcel.get("pickup_stop_id")

        if dest_id in stop_ids:
            dest_idx = stop_ids.index(dest_id)
            pickup_idx = stop_ids.index(pickup_id) if pickup_id in stop_ids else -1

            if stop_index >= pickup_idx and parcel["status"] == "assigned":
                # Parcel is now in transit
                await db.update_parcel_status(parcel["id"], "in_transit")
                await ws_manager.broadcast_to_parcel(parcel["id"], {
                    "type": "status",
                    "bus_id": bus_id,
                    "parcel_status": "in_transit",
                    "stop_index": stop_index,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

            if stop_index >= dest_idx:
                # Parcel delivered!
                await db.update_parcel_status(parcel["id"], "delivered")
                await db.restore_bus_capacity(bus_id, parcel["weight_kg"])
                await ws_manager.broadcast_to_parcel(parcel["id"], {
                    "type": "status",
                    "bus_id": bus_id,
                    "parcel_status": "delivered",
                    "stop_index": stop_index,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                ws_manager.unregister_bus_parcel(bus_id, parcel["id"])


def start_simulator(bus_id: str):
    """Start GPS simulation for a bus (idempotent)."""
    if bus_id in _simulator_tasks and not _simulator_tasks[bus_id].done():
        return  # Already running

    loop = asyncio.get_event_loop()
    task = loop.create_task(_simulate_bus(bus_id))
    _simulator_tasks[bus_id] = task


def stop_simulator(bus_id: str):
    task = _simulator_tasks.get(bus_id)
    if task and not task.done():
        task.cancel()
    _simulator_tasks.pop(bus_id, None)


def stop_all_simulators():
    for bus_id in list(_simulator_tasks.keys()):
        stop_simulator(bus_id)


async def reset_all_simulators():
    """Stop all tasks, reset DB, restart simulators for all active buses."""
    stop_all_simulators()
    await db.reset_all_buses()
    await db.reset_all_parcels()
    await db.clear_gps_events()

    # Restart simulators for all buses
    buses = await db.get_all_buses()
    for bus in buses:
        if bus["status"] in ("active", "scheduled"):
            start_simulator(bus["id"])

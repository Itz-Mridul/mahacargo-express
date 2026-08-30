from fastapi import APIRouter, HTTPException
from app.models.schemas import BusOut
from app.db import supabase as db

router = APIRouter(prefix="/api/buses", tags=["buses"])


@router.get("", response_model=list[BusOut])
async def list_buses():
    buses = await db.get_all_buses()
    # Attach route data into expected format
    result = []
    for b in buses:
        b_copy = dict(b)
        if "routes" in b_copy:
            b_copy["route"] = b_copy.pop("routes")
        result.append(b_copy)
    return result


@router.get("/{bus_id}", response_model=BusOut)
async def get_bus(bus_id: str):
    bus = await db.get_bus_by_id(bus_id)
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    if "routes" in bus:
        bus["route"] = bus.pop("routes")
    return bus


@router.get("/{bus_id}/location")
async def get_bus_location(bus_id: str):
    bus = await db.get_bus_by_id(bus_id)
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    return {
        "bus_id": bus_id,
        "lat": bus.get("current_lat"),
        "lng": bus.get("current_lng"),
        "stop_index": bus.get("current_stop_index"),
        "status": bus.get("status"),
    }

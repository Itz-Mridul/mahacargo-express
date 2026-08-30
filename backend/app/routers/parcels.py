from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional

from app.models.schemas import ParcelCreate, ParcelOut
from app.db import supabase as db
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/parcels", tags=["parcels"])


def require_admin(x_admin_key: Optional[str] = Header(None)):
    if x_admin_key != settings.admin_key:
        raise HTTPException(status_code=403, detail="Admin access required")


@router.post("", response_model=ParcelOut)
async def create_parcel(body: ParcelCreate):
    if body.pickup_stop_id == body.destination_stop_id:
        raise HTTPException(status_code=400, detail="Pickup and destination must be different stops")
    if body.weight_kg > settings.max_parcel_weight_kg:
        raise HTTPException(status_code=400, detail=f"Maximum parcel weight is {settings.max_parcel_weight_kg} kg")

    parcel = await db.create_parcel(body.model_dump())
    return parcel


@router.get("", response_model=list[ParcelOut])
async def list_parcels():
    return await db.get_all_parcels()


@router.get("/{parcel_id}", response_model=ParcelOut)
async def get_parcel(parcel_id: str):
    # Support both UUID and tracking ID
    if parcel_id.startswith("SBP-") or parcel_id.startswith("PKG-") or parcel_id.startswith("FMP-"):
        parcel = await db.get_parcel_by_tracking(parcel_id)
    else:
        parcel = await db.get_parcel_by_id(parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return parcel

from pydantic import BaseModel
class ScanLoadRequest(BaseModel):
    bus_id: str

@router.post("/{parcel_id}/scan-load")
async def scan_load_parcel(parcel_id: str, body: ScanLoadRequest):
    parcel = await db.get_parcel_by_id(parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel.get("status") not in ["pending", "assigned"]:
        raise HTTPException(status_code=400, detail=f"Parcel is already {parcel.get('status')}")
    
    # 1. Deduct capacity from bus
    try:
        await db.decrement_bus_capacity(body.bus_id, float(parcel["weight_kg"]))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # 2. Update parcel status
    await db.update_parcel_status(parcel_id, "in_transit", bus_id=body.bus_id)
    
    # 3. Create assignment
    await db.create_assignment({
        "parcel_id": parcel_id,
        "bus_id": body.bus_id,
        "status": "active"
    })
    
    return {"message": "Parcel successfully loaded onto bus"}

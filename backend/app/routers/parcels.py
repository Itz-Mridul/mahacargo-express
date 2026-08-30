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


@router.get("", response_model=list[ParcelOut], dependencies=[Depends(require_admin)])
async def list_parcels():
    return await db.get_all_parcels()


@router.get("/{parcel_id}", response_model=ParcelOut)
async def get_parcel(parcel_id: str):
    # Support both UUID and tracking ID
    if parcel_id.startswith("SBP-"):
        parcel = await db.get_parcel_by_tracking(parcel_id)
    else:
        parcel = await db.get_parcel_by_id(parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return parcel

from fastapi import APIRouter, Depends, Header, HTTPException
from typing import Optional
from pydantic import BaseModel
from app.config import get_settings
from app.simulation import gps_simulator

settings = get_settings()
router = APIRouter(prefix="/api/simulation", tags=["simulation"])


def require_admin(x_admin_key: Optional[str] = Header(None)):
    if x_admin_key != settings.admin_key:
        raise HTTPException(status_code=403, detail="Admin access required")


class SpeedRequest(BaseModel):
    multiplier: float  # 1, 2, or 5


@router.post("/speed", dependencies=[Depends(require_admin)])
async def set_speed(body: SpeedRequest):
    if body.multiplier not in (1, 2, 5):
        raise HTTPException(status_code=400, detail="Speed multiplier must be 1, 2, or 5")
    gps_simulator.set_speed_multiplier(body.multiplier)
    return {"speed_multiplier": body.multiplier, "status": "updated"}


@router.get("/speed")
async def get_speed():
    return {"speed_multiplier": gps_simulator.get_speed_multiplier()}


@router.post("/reset", dependencies=[Depends(require_admin)])
async def reset_demo():
    await gps_simulator.reset_all_simulators()
    return {"status": "reset", "message": "All buses and parcels reset to demo baseline"}

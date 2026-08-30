from fastapi import APIRouter, HTTPException
from app.models.schemas import RouteOut
from app.db import supabase as db

router = APIRouter(prefix="/api/routes", tags=["routes"])


@router.get("", response_model=list[RouteOut])
async def list_routes():
    routes = await db.get_all_routes()
    return routes


@router.get("/{route_id}", response_model=RouteOut)
async def get_route(route_id: str):
    route = await db.get_route_by_id(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route

"""
WebSocket connection manager — tracks active connections by parcel_id.
"""
from __future__ import annotations
import json
from typing import Dict, List, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # parcel_id -> list of WebSocket connections
        self._parcel_connections: Dict[str, List[WebSocket]] = {}
        # bus_id -> set of parcel_ids (for GPS fan-out)
        self._bus_parcel_map: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, parcel_id: str):
        await websocket.accept()
        self._parcel_connections.setdefault(parcel_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, parcel_id: str):
        conns = self._parcel_connections.get(parcel_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self._parcel_connections.pop(parcel_id, None)

    def register_bus_parcel(self, bus_id: str, parcel_id: str):
        self._bus_parcel_map.setdefault(bus_id, set()).add(parcel_id)

    def unregister_bus_parcel(self, bus_id: str, parcel_id: str):
        self._bus_parcel_map.get(bus_id, set()).discard(parcel_id)

    async def broadcast_to_parcel(self, parcel_id: str, message: dict):
        conns = self._parcel_connections.get(parcel_id, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_text(json.dumps(message, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, parcel_id)

    async def broadcast_bus_update(self, bus_id: str, message: dict):
        """Fan-out GPS update to all parcels assigned to this bus."""
        parcel_ids = self._bus_parcel_map.get(bus_id, set())
        for pid in list(parcel_ids):
            await self.broadcast_to_parcel(pid, message)


ws_manager = ConnectionManager()

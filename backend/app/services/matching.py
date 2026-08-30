"""
Hard filter — eliminates invalid buses before scoring.
Returns (is_valid, rejection_reason).
"""
from __future__ import annotations
from typing import Dict, Tuple, Optional


def is_valid_candidate(
    bus: Dict,
    pickup_stop_id: str,
    destination_stop_id: str,
    weight_kg: float,
    volume_m3: Optional[float] = None,
    ignore_passed: bool = False,
) -> Tuple[bool, Optional[str]]:
    """
    Implements Rules 2, 3, 4 from PRD.
    All checks run before scoring — failing buses are excluded, not downscored.
    """
    # Rule 4: bus must be active or scheduled
    if bus.get("status") not in ("active", "scheduled"):
        return False, f"Bus {bus['bus_number']} is not active (status: {bus.get('status')})"

    # Rule 2: capacity check (hard block — weight)
    if bus.get("available_capacity_kg", 0) < weight_kg:
        return False, (
            f"Insufficient capacity: need {weight_kg} kg, "
            f"only {bus.get('available_capacity_kg', 0)} kg available"
        )

    # Rule 2 optional: volume check
    if volume_m3 is not None and bus.get("available_volume_m3") is not None:
        if bus["available_volume_m3"] < volume_m3:
            return False, "Insufficient volume capacity"

    # Rule 3: route must contain both stops
    route = bus.get("routes") or bus.get("route")
    if not route:
        return False, "No route data for this bus"

    stops = route.get("stops", [])
    stop_ids = [s["id"] for s in stops]

    if pickup_stop_id not in stop_ids:
        return False, f"Pickup stop '{pickup_stop_id}' is not on this bus route"

    if destination_stop_id not in stop_ids:
        return False, f"Destination stop '{destination_stop_id}' is not on this bus route"

    pickup_idx = stop_ids.index(pickup_stop_id)
    dest_idx = stop_ids.index(destination_stop_id)

    # Rule 3: direction check — pickup must come before destination
    if pickup_idx >= dest_idx:
        return False, "Route direction mismatch: bus travels in opposite direction"

    # Rule 4: bus must not have already passed the pickup stop (unless evaluating future scheduled departure)
    if not ignore_passed:
        current_stop_index = bus.get("current_stop_index", 0)
        if pickup_idx < current_stop_index:
            return False, "Bus has already passed the pickup stop"

    return True, None


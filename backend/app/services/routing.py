"""
OSRM routing client with cached fallback.
The demo must work even when OSRM is completely unavailable.
"""
from __future__ import annotations
import httpx
import math
from typing import Tuple, Optional
from app.config import get_settings

settings = get_settings()

# ─── Cached distance/duration matrix (Kopargaon district) ────────────────────
# Format: (stop_id_a, stop_id_b) -> (distance_km, duration_min)
# Bidirectional — check both orderings.
CACHED_DISTANCES: dict[Tuple[str, str], Tuple[float, float]] = {
    ("kopargaon_bs", "shirdi"): (16.0, 28),
    ("kopargaon_bs", "rahata"): (8.5, 15),
    ("kopargaon_bs", "belapur"): (22.0, 38),
    ("kopargaon_bs", "ghoti"): (35.0, 55),
    ("kopargaon_bs", "sangamner"): (28.0, 45),
    ("kopargaon_bs", "niphad"): (18.0, 30),
    ("kopargaon_bs", "yeola"): (40.0, 65),
    ("shirdi", "rahata"): (7.5, 12),
    ("shirdi", "belapur"): (12.0, 20),
    ("shirdi", "ghoti"): (22.0, 35),
    ("shirdi", "sangamner"): (19.0, 32),
    ("rahata", "belapur"): (15.0, 25),
    ("rahata", "ghoti"): (28.0, 45),
    ("belapur", "sangamner"): (18.0, 30),
    ("ghoti", "sangamner"): (14.0, 22),
    ("niphad", "yeola"): (25.0, 40),
    ("kopargaon_south", "kopargaon_bs"): (2.5, 6),
    ("kopargaon_south", "shirdi"): (18.0, 32),
    ("kopargaon_north", "kopargaon_bs"): (3.0, 7),
    ("kopargaon_north", "rahata"): (11.0, 20),
}

_osrm_cache: dict[str, Tuple[float, float]] = {}


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Straight-line distance fallback."""
    R = 6371.0
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lng2 - lng1)
    a = math.sin(Δφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(Δλ / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _cache_key(lat1: float, lng1: float, lat2: float, lng2: float) -> str:
    return f"{lat1:.4f},{lng1:.4f}:{lat2:.4f},{lng2:.4f}"


async def get_route_distance_duration(
    lat1: float, lng1: float,
    lat2: float, lng2: float,
    stop_id_a: Optional[str] = None,
    stop_id_b: Optional[str] = None,
) -> Tuple[float, float]:
    """
    Returns (distance_km, duration_min).
    Priority: 1) OSRM live  2) Stop-pair cache  3) Haversine approximation.
    """
    # 1. Try stop-pair cache first (no network call needed)
    if stop_id_a and stop_id_b:
        key = (stop_id_a, stop_id_b)
        rev_key = (stop_id_b, stop_id_a)
        if key in CACHED_DISTANCES:
            return CACHED_DISTANCES[key]
        if rev_key in CACHED_DISTANCES:
            d, t = CACHED_DISTANCES[rev_key]
            return d, t

    # 2. Check short-lived OSRM response cache
    ck = _cache_key(lat1, lng1, lat2, lng2)
    if ck in _osrm_cache:
        return _osrm_cache[ck]

    # 3. Try OSRM
    if settings.osrm_url:
        try:
            url = (
                f"{settings.osrm_url}/route/v1/driving/"
                f"{lng1},{lat1};{lng2},{lat2}"
                f"?overview=false"
            )
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    route = data["routes"][0]
                    dist_km = round(route["distance"] / 1000, 2)
                    dur_min = round(route["duration"] / 60, 1)
                    _osrm_cache[ck] = (dist_km, dur_min)
                    return dist_km, dur_min
        except Exception:
            pass  # Fall through to haversine

    # 4. Haversine approximation (road distance ~1.3× straight line)
    straight_km = _haversine_km(lat1, lng1, lat2, lng2)
    dist_km = round(straight_km * 1.3, 2)
    dur_min = round(dist_km / 30 * 60, 1)  # assume 30 km/h avg bus speed
    return dist_km, dur_min

"""
Pricing service.
All constants come from config — never hardcoded here.
"""
from app.config import get_settings

settings = get_settings()


def estimate_cost(weight_kg: float, distance_km: float, priority: str) -> float:
    """SmartBus Parcel prototype estimated fare."""
    cost = settings.base_charge_inr
    cost += weight_kg * settings.per_kg_rate_inr
    cost += distance_km * settings.per_km_rate_inr
    if priority == "express":
        cost += settings.express_surcharge_inr
    return round(cost, 2)


def baseline_cost(distance_km: float) -> float:
    """Conventional dedicated vehicle cost model for comparison."""
    return round(
        settings.dedicated_vehicle_base_inr
        + distance_km * settings.dedicated_vehicle_per_km_inr,
        2,
    )

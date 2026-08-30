from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    osrm_url: str = "http://router.project-osrm.org"
    admin_key: str = "smartbus-admin-secret-2024"
    app_env: str = "development"

    # Optimization weights (must sum to 1.0)
    weight_route_match: float = 0.40
    weight_capacity_fit: float = 0.25
    weight_eta: float = 0.20
    weight_cost: float = 0.15

    # Pricing constants (INR)
    base_charge_inr: float = 20.0
    per_kg_rate_inr: float = 4.0
    per_km_rate_inr: float = 2.5
    express_surcharge_inr: float = 15.0
    dedicated_vehicle_base_inr: float = 80.0
    dedicated_vehicle_per_km_inr: float = 12.0

    # Limits
    max_parcel_weight_kg: float = 30.0
    max_candidates_returned: int = 3
    rate_limit_per_minute: int = 10

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

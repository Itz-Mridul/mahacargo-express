import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_url: str = "https://txkozzqxdmugmftdzwjq.supabase.co"
    supabase_anon_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4a296enF4ZG11Z21mdGR6d2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5OTM5NzIsImV4cCI6MjEwMzU2OTk3Mn0.fDjNg38E4A7X5jXFk9Ij1UlOZpi4JW-8LAFPeRpezRY"
    supabase_service_role_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4a296enF4ZG11Z21mdGR6d2pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Nzk5Mzk3MiwiZXhwIjoyMTAzNTY5OTcyfQ.gWkGFesQ8MN8qDQBe6KNXsGjFhH_wt4OZVeXkUZePuY"
    osrm_url: str = "http://router.project-osrm.org"
    admin_key: str = "smartbus-admin-secret-2024"
    app_env: str = "production"

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


@lru_cache()
def get_settings() -> Settings:
    return Settings()


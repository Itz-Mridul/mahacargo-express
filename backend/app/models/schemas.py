"""
Pydantic models for all domain entities.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum
import uuid


# ─── Enums ────────────────────────────────────────────────────────────────────

class BusStatus(str, Enum):
    scheduled = "scheduled"
    active = "active"
    completed = "completed"
    inactive = "inactive"


class ParcelStatus(str, Enum):
    pending = "pending"
    assigned = "assigned"
    in_transit = "in_transit"
    arrived = "arrived"
    delivered = "delivered"
    failed = "failed"


class Priority(str, Enum):
    standard = "standard"
    express = "express"
    urgent_perishable = "urgent_perishable"


class ConsignmentType(str, Enum):
    citizen_parcel = "citizen_parcel"
    agri_produce = "agri_produce"


class CommodityType(str, Enum):
    general = "general"
    onions = "onions"
    pomegranate = "pomegranate"
    grapes = "grapes"
    sugarcane = "sugarcane"
    vegetables = "vegetables"
    dairy = "dairy"


class UserRole(str, Enum):
    customer = "customer"
    farmer = "farmer"
    depot_staff = "depot_staff"
    admin = "admin"


# ─── Stop ─────────────────────────────────────────────────────────────────────

class Stop(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    is_apmc_market: Optional[bool] = False


# ─── Route ────────────────────────────────────────────────────────────────────

class Route(BaseModel):
    id: str
    route_name: str
    stops: List[Stop]
    distance_km: float
    estimated_duration_min: int
    polyline: Optional[str] = None


class RouteOut(Route):
    pass


# ─── Bus ──────────────────────────────────────────────────────────────────────

class Bus(BaseModel):
    id: str
    bus_number: str
    route_id: str
    total_capacity_kg: float
    available_capacity_kg: float
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    current_stop_index: int = 0
    status: BusStatus = BusStatus.active
    passenger_occupancy_pct: Optional[float] = 65.0
    is_electric: Optional[bool] = False
    battery_pct: Optional[float] = 85.0
    updated_at: Optional[datetime] = None
    route: Optional[Route] = None


class BusOut(BaseModel):
    id: str
    bus_number: str
    route_id: str
    total_capacity_kg: float
    available_capacity_kg: float
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    current_stop_index: int = 0
    status: BusStatus
    passenger_occupancy_pct: Optional[float] = 65.0
    is_electric: Optional[bool] = False
    battery_pct: Optional[float] = 85.0
    updated_at: Optional[datetime] = None
    route: Optional[RouteOut] = None


# ─── Parcel / Consignment ─────────────────────────────────────────────────────

class ParcelCreate(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=100)
    pickup_stop_id: str
    destination_stop_id: str
    weight_kg: float = Field(..., gt=0, le=100)
    volume_m3: Optional[float] = None
    priority: Priority = Priority.standard
    consignment_type: ConsignmentType = ConsignmentType.citizen_parcel
    commodity: CommodityType = CommodityType.general
    perishability: Optional[str] = "low"
    farmer_id: Optional[str] = None
    recipient_phone: Optional[str] = None
    notes: Optional[str] = None


class Parcel(BaseModel):
    id: str
    tracking_id: str
    customer_name: str
    pickup_stop_id: str
    destination_stop_id: str
    weight_kg: float
    volume_m3: Optional[float] = None
    priority: Priority
    consignment_type: ConsignmentType = ConsignmentType.citizen_parcel
    commodity: CommodityType = CommodityType.general
    perishability: Optional[str] = "low"
    status: ParcelStatus = ParcelStatus.pending
    assigned_bus_id: Optional[str] = None
    otp_code: Optional[str] = "482910"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ParcelOut(Parcel):
    pass


# ─── Assignment ───────────────────────────────────────────────────────────────

class Assignment(BaseModel):
    id: str
    parcel_id: str
    bus_id: str
    overall_score: float
    route_match_score: float
    capacity_score: float
    eta_score: float
    cost_score: float
    estimated_cost_inr: float
    estimated_eta_min: int
    explainable_reasons: Optional[List[str]] = None
    created_at: Optional[datetime] = None


# ─── Optimization ─────────────────────────────────────────────────────────────

class MatchRequest(BaseModel):
    pickup_stop_id: str
    destination_stop_id: str
    weight_kg: float = Field(..., gt=0, le=100)
    volume_m3: Optional[float] = None
    priority: Priority = Priority.standard
    consignment_type: ConsignmentType = ConsignmentType.citizen_parcel
    commodity: CommodityType = CommodityType.general


class ScoreBreakdown(BaseModel):
    route_match: float
    capacity_fit: float
    eta_score: float
    cost_score: float
    overall: float


class Candidate(BaseModel):
    bus: BusOut
    score: ScoreBreakdown
    estimated_cost_inr: float
    estimated_eta_min: int
    explainable_reasons: Optional[List[str]] = None
    rejection_reason: Optional[str] = None


class MatchResponse(BaseModel):
    candidates: List[Candidate]
    recommended_bus_id: Optional[str] = None
    no_match_reason: Optional[str] = None


class AssignRequest(BaseModel):
    parcel_id: str
    bus_id: str


class AssignResponse(BaseModel):
    assignment: Assignment
    parcel: ParcelOut
    bus: BusOut


# ─── Multi-Parcel Batch Optimization ──────────────────────────────────────────

class BatchOptimizationRequest(BaseModel):
    parcel_ids: Optional[List[str]] = None
    auto_create_sample_demand: Optional[bool] = False


class BatchAllocationItem(BaseModel):
    parcel: ParcelOut
    assigned_bus: BusOut
    score: float
    estimated_cost_inr: float
    estimated_eta_min: int
    explainable_reason: str


class BatchOptimizationResponse(BaseModel):
    total_demand_count: int
    allocated_count: int
    unassigned_count: int
    baseline_fleet_utilization_pct: float
    optimized_fleet_utilization_pct: float
    baseline_avg_delivery_hours: float
    optimized_avg_delivery_hours: float
    total_cost_saved_inr: float
    extra_vehicles_avoided: int
    allocations: List[BatchAllocationItem]


# ─── Re-Optimization / GPS Delay Simulation ───────────────────────────────────

class DelaySimulationRequest(BaseModel):
    bus_id: str
    delay_minutes: int = 15
    reason: str = "Traffic congestion near Kopargaon bridge"


class ReoptimizationResponse(BaseModel):
    affected_bus_id: str
    delay_minutes: int
    reassigned_parcels_count: int
    reroute_details: List[Dict]
    message: str


# ─── Secure Execution / Chain of Custody ──────────────────────────────────────

class ChainEvent(BaseModel):
    id: str
    parcel_id: str
    event_type: str  # CREATED, ORIGIN_SCANNED, LOADED, IN_TRANSIT, DESTINATION_SCANNED, ARRIVED, OTP_VERIFIED, SIGNED, DELIVERED
    actor: str
    location: str
    timestamp: str
    event_hash: str


class SecureVerificationRequest(BaseModel):
    parcel_id: str
    otp_code: str
    signature_data_url: str
    receiver_name: str
    receiver_id_proof: Optional[str] = None


class SecureVerificationResponse(BaseModel):
    success: bool
    parcel_id: str
    status: str
    verification_hash: str
    timestamp: str
    certificate_id: str
    message: str


# ─── What-If Scenario Simulation ──────────────────────────────────────────────

class ScenarioSimulationRequest(BaseModel):
    number_of_buses: int = 20
    parcels_per_day: int = 120
    agri_shipments_per_day: int = 60
    avg_bus_capacity_kg: float = 40.0


class ScenarioSimulationResponse(BaseModel):
    baseline_utilization_pct: float
    optimized_utilization_pct: float
    baseline_avg_delivery_hours: float
    optimized_avg_delivery_hours: float
    baseline_total_cost_inr: float
    optimized_total_cost_inr: float
    annual_cost_savings_inr: float
    co2_reduction_tons_annual: float
    vehicles_eliminated_count: int


# ─── GPS / Tracking ───────────────────────────────────────────────────────────

class GPSEvent(BaseModel):
    bus_id: str
    lat: float
    lng: float
    stop_index: int
    timestamp: datetime


class TrackingUpdate(BaseModel):
    type: str  # "gps" | "status"
    bus_id: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    stop_index: Optional[int] = None
    parcel_status: Optional[ParcelStatus] = None
    eta_min: Optional[int] = None
    timestamp: datetime


# ─── Analytics ────────────────────────────────────────────────────────────────

class DashboardMetrics(BaseModel):
    active_buses: int
    active_parcels: int
    agri_consignments: Optional[int] = 0
    total_available_capacity_kg: float
    fleet_utilization_pct: float
    average_eta_min: float
    estimated_cost_saved_inr: float
    total_assignments: int


class BaselineVsOptimized(BaseModel):
    baseline_cost_inr: float
    optimized_cost_inr: float
    baseline_eta_h: float
    optimized_eta_h: float
    baseline_utilization_pct: float
    optimized_utilization_pct: float
    extra_vehicles_baseline: int
    extra_vehicles_optimized: int
    savings_inr: float
    savings_pct: float


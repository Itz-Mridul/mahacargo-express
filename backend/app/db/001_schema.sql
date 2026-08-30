-- SmartBus Parcel v2 — Database Schema
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Routes ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
    id                      text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    route_name              text NOT NULL,
    stops                   jsonb NOT NULL DEFAULT '[]',
    distance_km             numeric(8,2) NOT NULL DEFAULT 0,
    estimated_duration_min  integer NOT NULL DEFAULT 0,
    polyline                text,
    created_at              timestamptz DEFAULT now()
);

-- ─── Buses ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buses (
    id                      text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    bus_number              text NOT NULL UNIQUE,
    route_id                text REFERENCES routes(id) ON DELETE SET NULL,
    total_capacity_kg       numeric(8,2) NOT NULL DEFAULT 100,
    available_capacity_kg   numeric(8,2) NOT NULL DEFAULT 100,
    current_lat             numeric(10,6),
    current_lng             numeric(10,6),
    current_stop_index      integer NOT NULL DEFAULT 0,
    status                  text NOT NULL DEFAULT 'active'
                                CHECK (status IN ('scheduled','active','completed','inactive')),
    updated_at              timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_buses_route_id ON buses(route_id);

-- ─── Parcels ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parcels (
    id                      text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    tracking_id             text NOT NULL UNIQUE,
    customer_name           text NOT NULL DEFAULT 'Demo Customer',
    pickup_stop_id          text NOT NULL,
    destination_stop_id     text NOT NULL,
    weight_kg               numeric(6,3) NOT NULL,
    volume_m3               numeric(8,4),
    priority                text NOT NULL DEFAULT 'standard'
                                CHECK (priority IN ('standard','express')),
    status                  text NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','assigned','in_transit','delivered','failed')),
    assigned_bus_id         text REFERENCES buses(id) ON DELETE SET NULL,
    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);
CREATE INDEX IF NOT EXISTS idx_parcels_tracking ON parcels(tracking_id);
CREATE INDEX IF NOT EXISTS idx_parcels_bus ON parcels(assigned_bus_id);

-- ─── Assignments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
    id                      text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    parcel_id               text REFERENCES parcels(id) ON DELETE CASCADE,
    bus_id                  text REFERENCES buses(id) ON DELETE SET NULL,
    overall_score           numeric(5,2),
    route_match_score       numeric(5,2),
    capacity_score          numeric(5,2),
    eta_score               numeric(5,2),
    cost_score              numeric(5,2),
    estimated_cost_inr      numeric(8,2),
    estimated_eta_min       integer,
    created_at              timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assignments_parcel ON assignments(parcel_id);
CREATE INDEX IF NOT EXISTS idx_assignments_bus ON assignments(bus_id);

-- ─── GPS Events (append-only) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gps_events (
    id          text PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    bus_id      text REFERENCES buses(id) ON DELETE CASCADE,
    lat         numeric(10,6) NOT NULL,
    lng         numeric(10,6) NOT NULL,
    stop_index  integer NOT NULL DEFAULT 0,
    timestamp   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gps_bus_time ON gps_events(bus_id, timestamp DESC);

-- ─── Row Level Security ────────────────────────────────────────────────────
ALTER TABLE routes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_events ENABLE ROW LEVEL SECURITY;

-- Allow anon read on routes and buses
DROP POLICY IF EXISTS "Public can read routes" ON routes;
CREATE POLICY "Public can read routes" ON routes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read buses" ON buses;
CREATE POLICY "Public can read buses" ON buses FOR SELECT USING (true);

-- Allow anon read & insert on parcels
DROP POLICY IF EXISTS "Public can read parcels" ON parcels;
CREATE POLICY "Public can read parcels" ON parcels FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert parcels" ON parcels;
CREATE POLICY "Public can insert parcels" ON parcels FOR INSERT WITH CHECK (true);

-- Allow anon read on assignments
DROP POLICY IF EXISTS "Public can read assignments" ON assignments;
CREATE POLICY "Public can read assignments" ON assignments FOR SELECT USING (true);

-- GPS events: service role only
DROP POLICY IF EXISTS "Service role only gps" ON gps_events;
CREATE POLICY "Service role only gps" ON gps_events FOR ALL USING (auth.role() = 'service_role');

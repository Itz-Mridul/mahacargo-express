-- SmartBus Parcel v2 — Demo Seed Data
-- Run AFTER 001_schema.sql
-- Real approximate GPS coordinates for Kopargaon district, Maharashtra

-- ─── Routes ────────────────────────────────────────────────────────────────

INSERT INTO routes (id, route_name, stops, distance_km, estimated_duration_min, polyline) VALUES

('r-001', 'Kopargaon – Shirdi Express',
 '[
   {"id":"kopargaon_bs","name":"Kopargaon Bus Stand","lat":19.8898,"lng":74.4773},
   {"id":"kopargaon_south","name":"Kopargaon South Gate","lat":19.8845,"lng":74.4801},
   {"id":"rahata","name":"Rahata","lat":19.7168,"lng":74.4765},
   {"id":"shirdi","name":"Shirdi","lat":19.7651,"lng":74.4773}
 ]',
 24.5, 42, NULL),

('r-002', 'Kopargaon – Sangamner via Belapur',
 '[
   {"id":"kopargaon_bs","name":"Kopargaon Bus Stand","lat":19.8898,"lng":74.4773},
   {"id":"niphad","name":"Niphad","lat":20.0789,"lng":74.1135},
   {"id":"belapur","name":"Belapur (Nashik)","lat":19.9754,"lng":74.2451},
   {"id":"sangamner","name":"Sangamner","lat":19.5769,"lng":74.2099}
 ]',
 72.0, 105, NULL),

('r-003', 'Kopargaon – Ghoti Passerby',
 '[
   {"id":"kopargaon_north","name":"Kopargaon North","lat":19.9023,"lng":74.4691},
   {"id":"kopargaon_bs","name":"Kopargaon Bus Stand","lat":19.8898,"lng":74.4773},
   {"id":"rahata","name":"Rahata","lat":19.7168,"lng":74.4765},
   {"id":"shirdi","name":"Shirdi","lat":19.7651,"lng":74.4773},
   {"id":"ghoti","name":"Ghoti","lat":19.6421,"lng":73.8976}
 ]',
 95.0, 150, NULL),

('r-004', 'Shirdi – Sangamner Local',
 '[
   {"id":"shirdi","name":"Shirdi","lat":19.7651,"lng":74.4773},
   {"id":"rahata","name":"Rahata","lat":19.7168,"lng":74.4765},
   {"id":"belapur","name":"Belapur (Nashik)","lat":19.9754,"lng":74.2451},
   {"id":"sangamner","name":"Sangamner","lat":19.5769,"lng":74.2099}
 ]',
 55.0, 85, NULL),

('r-005', 'Kopargaon – Yeola via Niphad',
 '[
   {"id":"kopargaon_bs","name":"Kopargaon Bus Stand","lat":19.8898,"lng":74.4773},
   {"id":"kopargaon_north","name":"Kopargaon North","lat":19.9023,"lng":74.4691},
   {"id":"niphad","name":"Niphad","lat":20.0789,"lng":74.1135},
   {"id":"yeola","name":"Yeola","lat":20.0454,"lng":74.4921}
 ]',
 58.0, 90, NULL)

ON CONFLICT (id) DO NOTHING;


-- ─── Buses ─────────────────────────────────────────────────────────────────

INSERT INTO buses (id, bus_number, route_id, total_capacity_kg, available_capacity_kg, current_lat, current_lng, current_stop_index, status) VALUES

-- Route r-001: Kopargaon–Shirdi
('b-101', 'MH-15-BT-101', 'r-001', 120.0, 120.0, 19.8898, 74.4773, 0, 'active'),
('b-102', 'MH-15-BT-102', 'r-001', 80.0,  80.0,  19.8845, 74.4801, 1, 'active'),
('b-103', 'MH-15-BT-103', 'r-001', 150.0, 32.0,  19.7168, 74.4765, 2, 'active'),

-- Route r-002: Kopargaon–Sangamner
('b-104', 'MH-15-BT-104', 'r-002', 100.0, 100.0, 19.8898, 74.4773, 0, 'active'),
('b-105', 'MH-15-BT-105', 'r-002', 90.0,  45.0,  20.0789, 74.1135, 1, 'active'),

-- Route r-003: Kopargaon–Ghoti
('b-106', 'MH-15-BT-106', 'r-003', 200.0, 200.0, 19.9023, 74.4691, 0, 'active'),
('b-107', 'MH-15-BT-107', 'r-003', 180.0, 28.0,  19.8898, 74.4773, 1, 'active'),

-- Route r-004: Shirdi–Sangamner
('b-108', 'MH-15-BT-108', 'r-004', 100.0, 100.0, 19.7651, 74.4773, 0, 'active'),
('b-109', 'MH-15-BT-109', 'r-004', 120.0, 75.0,  19.7168, 74.4765, 1, 'active'),

-- Route r-005: Kopargaon–Yeola
('b-110', 'MH-15-BT-110', 'r-005', 90.0,  90.0,  19.8898, 74.4773, 0, 'active'),
('b-111', 'MH-15-BT-111', 'r-005', 110.0, 110.0, 19.8898, 74.4773, 0, 'scheduled')

ON CONFLICT (bus_number) DO NOTHING;

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboard, fetchRoutes } from '../services/api'
import { DemoBadge } from '../components/UI'
import { MapContainer, TileLayer, Polyline, Tooltip, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const PROBLEM_STATEMENTS = [
  {
    code: 'SKH014',
    icon: '🚌📦',
    title: 'Smart Parcel Delivery Network Using Public Buses',
    desc: 'Leverage unused cargo capacity in public bus networks to create an affordable, trackable last-mile parcel delivery system for rural and semi-urban areas.',
    category: 'Logistics',
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.15)',
  },
  {
    code: 'SKH015',
    icon: '🚁🔍',
    title: 'Drone-Based Smart Traffic Surveillance System',
    desc: 'Deploy autonomous drones for real-time traffic monitoring, incident detection, and crowd analytics to enhance urban traffic management.',
    category: 'Surveillance',
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.15)',
  },
  {
    code: 'SKH041',
    icon: '🌾🤖',
    title: 'AI Logistics Platform for Farmers',
    desc: 'AI-driven platform connecting farmers to transport options, optimizing supply chain routes for agricultural produce to reduce post-harvest losses.',
    category: 'AgriTech',
    color: '#10b981',
    glow: 'rgba(16,185,129,0.15)',
  },
  {
    code: 'SKH042',
    icon: '⚡🗺️',
    title: 'EV Charging Network Planning',
    desc: 'Intelligent geospatial planning tool for optimal EV charging station placement based on traffic density, grid capacity, and adoption forecasts.',
    category: 'Clean Energy',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
  },
  {
    code: 'SKH043',
    icon: '🌄🚚',
    title: 'AI-Powered Rural Logistics Platform',
    desc: 'Smart logistics platform for rural communities using AI to match demand with available transport, improving accessibility and reducing delivery costs.',
    category: 'Rural Tech',
    color: '#ec4899',
    glow: 'rgba(236,72,153,0.15)',
  },
  {
    code: 'SKH050',
    icon: '🏭👥',
    title: 'Smart Workforce & Operations Management for Bus Depots',
    desc: 'Integrated platform for managing driver schedules, maintenance workflows, fuel tracking, and depot operations using real-time data and AI insights.',
    category: 'Operations',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.15)',
  },
]

const STEPS = [
  { icon: '📦', title: 'Submit Parcel', desc: 'Enter pickup, destination, weight and priority.' },
  { icon: '🔍', title: 'Smart Match', desc: 'AI scores all available buses in real-time.' },
  { icon: '✅', title: 'Confirm Booking', desc: 'Review cost, ETA and optimization breakdown.' },
  { icon: '📍', title: 'Live Tracking', desc: 'Watch your parcel move on a live map.' },
]

const ROUTE_COLORS = ['#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#ec4899']

export default function Landing() {
  const { data: metrics } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard, refetchInterval: 10000 })
  const { data: routes } = useQuery({ queryKey: ['routes'], queryFn: fetchRoutes })

  // Build map polylines from route stops
  const routeLines = routes?.map((r, i) => ({
    positions: r.stops.map(s => [s.lat, s.lng]),
    color: ROUTE_COLORS[i % ROUTE_COLORS.length],
    name: r.route_name,
    stops: r.stops,
  })) || []

  const mapCenter = [19.8898, 74.4773]  // Kopargaon

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pt-24 pb-20 text-center">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-indigo-600/10 blur-3xl" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            MahaCargo Express · Intelligent Logistics Layer
          </span>
          <DemoBadge />
        </div>

        <h1 className="mt-4 text-4xl sm:text-6xl md:text-7xl font-extrabold text-white leading-tight font-['Space_Grotesk'] max-w-5xl mx-auto">
          Turn Every Scheduled Bus Into A<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
            Dynamically Optimized Logistics Flow
          </span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          <strong className="text-white font-semibold">We don't add vehicles to the road.</strong> We build an intelligent decision layer that dynamically matches existing public bus capacity with citizen parcels and rural agricultural consignments.
        </p>

        <div className="mt-8 flex flex-wrap gap-4 justify-center items-center">
          <Link
            to="/optimizer"
            className="px-7 py-4 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold rounded-2xl text-base transition-all shadow-xl shadow-indigo-500/30 flex items-center gap-2"
          >
            <span>🧠</span> Run Network Optimizer →
          </Link>
          <Link
            to="/book"
            className="px-7 py-4 bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl text-base transition-all border border-white/15 flex items-center gap-2"
          >
            <span>🌾</span> Ship Parcel / Agri-Produce
          </Link>
          <Link
            to="/verify"
            className="px-6 py-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-semibold rounded-2xl text-base transition-all border border-emerald-500/30 flex items-center gap-2"
          >
            <span>🔐</span> Proof of Delivery
          </Link>
        </div>

      </section>

      {/* ── Problem Stats ── */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { stat: '40–60%', label: 'Avg. Bus Cargo Capacity Unused', color: 'text-indigo-400' },
            { stat: '₹150–200', label: 'Typical Dedicated Courier Cost', color: 'text-amber-400' },
            { stat: '4–6 hrs', label: 'Average Local Parcel Delivery Time', color: 'text-rose-400' },
          ].map((s) => (
            <div key={s.label} className="glass p-6 text-center animate-slide-up">
              <p className={`text-4xl font-bold font-['Space_Grotesk'] ${s.color}`}>{s.stat}</p>
              <p className="text-gray-400 text-sm mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem Statements ── */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Smart Karnataka Hackathon</span>
          <h2 className="mt-3 text-3xl font-bold font-['Space_Grotesk']">
            Constituent Problem Statements
          </h2>
          <p className="mt-3 text-gray-400 max-w-xl mx-auto text-sm">
            This platform addresses multiple interlinked challenges across logistics, mobility, and rural connectivity.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROBLEM_STATEMENTS.map((ps, i) => (
            <div
              key={ps.code}
              className="glass p-6 animate-slide-up relative overflow-hidden flex flex-col gap-3 group transition-all duration-300 hover:scale-[1.02]"
              style={{
                animationDelay: `${i * 80}ms`,
                background: ps.glow,
                borderColor: `${ps.color}30`,
              }}
            >
              {/* Subtle corner glow */}
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none"
                style={{ background: ps.color, transform: 'translate(30%, -30%)' }}
              />

              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-3xl">{ps.icon}</span>
                <span
                  className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border"
                  style={{ color: ps.color, borderColor: `${ps.color}40`, background: `${ps.color}15` }}
                >
                  {ps.code}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-bold text-white text-base leading-snug font-['Space_Grotesk']">
                {ps.title}
              </h3>

              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed flex-1">
                {ps.desc}
              </p>

              {/* Category tag */}
              <div className="flex items-center gap-2 pt-1">
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: `${ps.color}20`, color: ps.color }}
                >
                  {ps.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it Works ── */}

      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center font-['Space_Grotesk'] mb-12">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step, i) => (
            <div key={i} className="glass p-6 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="text-4xl mb-4">{step.icon}</div>
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Step {i + 1}</div>
              <h3 className="font-bold text-white mb-2">{step.title}</h3>
              <p className="text-gray-400 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Live Impact Numbers ── */}
      {metrics && (
        <section className="px-6 py-12 max-w-5xl mx-auto">
          <div className="glass p-8 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 border-indigo-500/20">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-xl font-bold font-['Space_Grotesk']">Live Platform Impact</h2>
              <DemoBadge />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Active Buses', value: metrics.active_buses },
                { label: 'Active Parcels', value: metrics.active_parcels },
                { label: 'Utilization', value: `${metrics.fleet_utilization_pct}%` },
                { label: 'Cost Saved (₹)', value: `₹${metrics.estimated_cost_saved_inr}` },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <p className="text-3xl font-bold text-white font-['Space_Grotesk']">{m.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Network Map ── */}
      <section className="px-6 py-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold font-['Space_Grotesk'] mb-6 flex items-center gap-3">
          Kopargaon Route Network
          <DemoBadge />
        </h2>
        <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: '400px' }}>
          <MapContainer center={mapCenter} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl={true}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {routeLines.map((r, i) => (
              <Polyline key={i} positions={r.positions} color={r.color} weight={4} opacity={0.8}>
                <Tooltip sticky>{r.name}</Tooltip>
              </Polyline>
            ))}
            {routeLines.flatMap((r) =>
              r.stops.map((s, j) => (
                <CircleMarker
                  key={`${s.id}-${j}`}
                  center={[s.lat, s.lng]}
                  radius={6}
                  fillColor={r.color}
                  color="#fff"
                  weight={1.5}
                  fillOpacity={0.9}
                >
                  <Tooltip>{s.name}</Tooltip>
                </CircleMarker>
              ))
            )}
          </MapContainer>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-4xl font-bold font-['Space_Grotesk'] mb-4">Ready to Ship?</h2>
        <p className="text-gray-400 mb-8">No dedicated vehicle. No extra cost. Same bus, measurable savings.</p>
        <Link
          to="/book"
          className="inline-block px-10 py-5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold rounded-2xl text-xl transition-all shadow-2xl shadow-indigo-500/30"
        >
          Book a Parcel Now →
        </Link>
      </section>
    </div>
  )
}

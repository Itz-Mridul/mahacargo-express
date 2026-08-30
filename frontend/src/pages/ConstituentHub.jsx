import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DemoBadge, Button } from '../components/UI'

const CONSTITUENTS = [
  {
    code: 'SKH014',
    title: 'Smart Parcel Delivery Network Using Public Buses',
    category: 'Core Backbone',
    badgeColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    icon: '🚌📦',
    summary: 'The primary optimization engine that monetizes 40–60% empty luggage holds in Kopargaon public buses without putting any new delivery vehicles on congested roads.',
    features: [
      'Multi-objective heuristic bus scoring (Route, Capacity, ETA, Cost)',
      'Sub-minute dynamic matching and real-time GPS telemetry',
      'Zero additional carbon emissions — 100% existing transit asset optimization',
      'Tamper-evident chain of custody with OTP & digital signature handshake',
    ],
    actionLink: '/optimizer',
    actionText: 'Open Bus Cargo Optimizer →',
  },
  {
    code: 'SKH015',
    title: 'Drone-Based Smart Traffic Surveillance System',
    category: 'Surveillance & Telemetry',
    badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    icon: '🚁🔍',
    summary: 'Simulated autonomous aerial corridor feeds that monitor key bottleneck choke points in Kopargaon (Godavari Bridge, Shirdi Highway junction) to feed real-time delay intelligence to our re-optimization engine.',
    features: [
      'Aerial road incident & slowdown detection (15-min early delay warning)',
      'Direct API webhook triggering BusCargo dynamic re-routing',
      'Visual corridor congestion heatmap streaming to Control Center',
      'Emergency delivery route clearance coordination',
    ],
    actionLink: '/optimizer',
    actionText: 'View Traffic Re-Optimizer →',
  },
  {
    code: 'SKH041',
    title: 'AI Logistics Platform for Farmers',
    category: 'AgriTech & APMC Supply Chain',
    badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    icon: '🌾🤖',
    summary: 'Direct aggregation pipeline connecting Kopargaon onion growers, pomegranate orchards, and grape farmers directly to regional APMC wholesale markets via scheduled morning bus departures.',
    features: [
      'Perishability-aware priority queuing (2-hour freshness SLA)',
      'Commodity crate load calculations (Nashik Onions, Shirdi Guavas)',
      'Direct FPO-to-Market direct collection points',
      'Reduces post-harvest transport losses by up to 34%',
    ],
    actionLink: '/book',
    actionText: 'Book Agri Consignment →',
  },
  {
    code: 'SKH042',
    title: 'EV Charging Network Planning',
    category: 'Clean Energy & E-Mobility',
    badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    icon: '⚡🗺️',
    summary: 'Geospatial energy planning layer that models depot charging schedules for electric buses while estimating battery draw when carrying additional parcel payloads.',
    features: [
      'Depot fast-charger load management synced with bus timetables',
      'Battery state-of-charge (SoC) prediction under payload weight',
      'Optimal EV charging station placement recommendations in Kopargaon',
      'Grid off-peak tariff cost optimization',
    ],
    actionLink: '/dashboard',
    actionText: 'View Fleet EV Telemetry →',
  },
  {
    code: 'SKH043',
    title: 'AI-Powered Rural Logistics Platform',
    category: 'Rural Inclusion',
    badgeColor: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    icon: '🌄🚚',
    summary: 'Hub-and-spoke aggregation model bridging remote villages around Kopargaon to taluka centers using scheduled rural stage-carriage bus services.',
    features: [
      'Village collection drop-points at rural gram panchayat stops',
      'Small business parcel aggregation for local artisans and pharmacies',
      'Low-bandwidth SMS / offline OTP handshake protocol',
      '60% lower shipping rates compared to private couriers',
    ],
    actionLink: '/book',
    actionText: 'Ship Rural Package →',
  },
  {
    code: 'SKH050',
    title: 'Smart Workforce & Operations Management for Bus Depots',
    category: 'Depot Operations',
    badgeColor: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
    icon: '🏭👥',
    summary: 'Depot floor management toolkit streamlining conductor luggage hold scanning, driver shift rosters, bay allocation, and parcel storage locker assignments.',
    features: [
      'Conductor mobile scanner handshake for luggage bay loading',
      'Depot bay turn-around time tracking (<3 min parcel loading window)',
      'Digital cargo manifest generation per scheduled bus trip',
      'Automated conductor revenue-share incentive calculation',
    ],
    actionLink: '/verify',
    actionText: 'Open Depot Operations Scan →',
  },
]

export default function ConstituentHub() {
  const [selectedPs, setSelectedPs] = useState(CONSTITUENTS[0])

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 text-center max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Smart Karnataka Hackathon · Integrated Platform Architecture
          </span>
          <DemoBadge />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold font-['Space_Grotesk'] text-white">
          Unified Multi-Problem Solution Suite
        </h1>
        <p className="text-gray-400 text-sm mt-2">
          Our platform does not solve logistics in a silo — it interconnects 6 high-impact mobility, surveillance, agricultural, clean energy, and workforce problem statements into a single synchronized operating system for Kopargaon.
        </p>
      </div>

      {/* Grid of PS Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {CONSTITUENTS.map((ps) => {
          const isSelected = selectedPs.code === ps.code
          return (
            <div
              key={ps.code}
              onClick={() => setSelectedPs(ps)}
              className={`glass p-6 rounded-2xl cursor-pointer transition-all duration-300 relative flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-xl shadow-indigo-500/15 scale-[1.02]'
                  : 'hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-3xl">{ps.icon}</span>
                  <span className={`text-[10px] font-extrabold tracking-widest px-2.5 py-1 rounded-md border font-mono ${ps.badgeColor}`}>
                    {ps.code}
                  </span>
                </div>

                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block mb-1">
                  {ps.category}
                </span>

                <h3 className="font-bold text-white text-base leading-snug font-['Space_Grotesk'] mb-2">
                  {ps.title}
                </h3>

                <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 mb-4">
                  {ps.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-indigo-400 font-semibold">Explore Deep-Dive</span>
                <span className="text-xs">→</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Detailed Interactive Spotlight Card */}
      <div className="glass p-8 border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-surface to-slate-900/60 rounded-3xl animate-fade-in">
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{selectedPs.icon}</span>
              <div>
                <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${selectedPs.badgeColor}`}>
                  {selectedPs.code}
                </span>
                <span className="text-xs text-gray-400 ml-2 font-medium">Domain: {selectedPs.category}</span>
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-white font-['Space_Grotesk'] mb-3">
              {selectedPs.title}
            </h2>

            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              {selectedPs.summary}
            </p>

            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Platform Integration & Measurable Capabilities:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {selectedPs.features.map((feat, idx) => (
                <div key={idx} className="p-3 bg-white/4 rounded-xl border border-white/5 flex items-start gap-2.5 text-xs text-gray-300">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <Link to={selectedPs.actionLink}>
              <Button className="px-6 py-3 font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                {selectedPs.actionText}
              </Button>
            </Link>
          </div>

          {/* Impact Stats summary box */}
          <div className="w-full lg:w-72 glass p-5 border-white/10 bg-white/2 rounded-2xl flex flex-col gap-4">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
              System Impact Summary
            </h4>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Target Region</span>
                <span className="text-white font-semibold">Kopargaon Hub</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Optimization Model</span>
                <span className="text-emerald-400 font-semibold">Dynamic Greedy-Knapsack</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Emission Impact</span>
                <span className="text-cyan-400 font-semibold">-100% Marginal CO₂</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Verification</span>
                <span className="text-amber-400 font-semibold">SHA-256 Audit Trail</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

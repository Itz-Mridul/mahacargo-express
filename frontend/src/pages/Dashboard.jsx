import { useQuery } from '@tanstack/react-query'
import { fetchDashboard, fetchComparison, fetchBuses, fetchAllParcels } from '../services/api'
import { KPICard, StatusBadge, DemoBadge, Skeleton } from '../components/UI'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'

const CHART_COLORS = { baseline: '#ef4444', optimized: '#6366f1' }

export default function Dashboard() {

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 8000,
  })

  const { data: comparison } = useQuery({
    queryKey: ['comparison'],
    queryFn: fetchComparison,
    refetchInterval: 10000,
  })

  const { data: buses } = useQuery({
    queryKey: ['buses'],
    queryFn: fetchBuses,
    refetchInterval: 3000,
  })

  const { data: parcels } = useQuery({
    queryKey: ['parcels-admin'],
    queryFn: fetchAllParcels,
    refetchInterval: 10000,
  })



  // Comparison chart data
  const comparisonData = comparison ? [
    { name: 'Cost (₹)', baseline: comparison.baseline_cost_inr, optimized: comparison.optimized_cost_inr },
    { name: 'ETA (hrs)', baseline: comparison.baseline_eta_h, optimized: comparison.optimized_eta_h },
    { name: 'Util. (%)', baseline: comparison.baseline_utilization_pct, optimized: comparison.optimized_utilization_pct },
    { name: 'Vehicles', baseline: comparison.extra_vehicles_baseline, optimized: comparison.extra_vehicles_optimized },
  ] : []

  // Capacity utilization per bus
  const busCapData = buses?.slice(0, 8).map(b => {
    const total = Number(b.total_capacity_kg) || 100
    const avail = Math.min(total, Math.max(0, Number(b.available_capacity_kg) || 0))
    const used = Math.max(0, Math.round(total - avail))
    const available = Math.round(avail)
    return {
      name: `Bus ${b.bus_number.split('-').pop() || b.bus_number}`,
      fullName: b.bus_number,
      used,
      available,
      total: Math.round(total),
      utilizationPct: Math.round((used / total) * 100),
    }
  }) || []

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Space_Grotesk']">Operations Dashboard</h1>
          <p className="text-gray-400 text-sm">Real-time fleet and parcel monitoring</p>
        </div>
        <DemoBadge />
      </div>

      {/* KPI Cards */}
      {metricsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KPICard label="Active Buses"   value={metrics.active_buses}                             icon="🚌" color="indigo" />
          <KPICard label="Active Parcels" value={metrics.active_parcels}                            icon="📦" color="cyan" />
          <KPICard label="Fleet Cap (kg)" value={metrics.total_available_capacity_kg}               icon="⚖️" color="violet" />
          <KPICard label="Utilization"    value={`${metrics.fleet_utilization_pct}%`}               icon="📈" color="emerald" trend="vs 0% baseline" />
          <KPICard label="Avg ETA"        value={Math.round(metrics.average_eta_min)}  unit="min"  icon="⏱️" color="amber" />
          <KPICard label="Cost Saved"     value={`₹${metrics.estimated_cost_saved_inr}`}            icon="💰" color="emerald" trend="vs dedicated vehicle" />
        </div>
      ) : null}

      {/* Comparison Block */}
      {comparison && (
        <div className="glass p-6 mb-6 border-indigo-500/20 bg-indigo-500/5">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h2 className="text-lg font-bold font-['Space_Grotesk']">Baseline vs. Optimized</h2>
            <DemoBadge />
            {comparison.savings_inr > 0 && (
              <span className="text-emerald-400 text-sm font-semibold">
                ✅ ₹{comparison.savings_inr} saved ({comparison.savings_pct}%)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Cost (₹)',   baseline: `₹${comparison.baseline_cost_inr}`,   optimized: `₹${comparison.optimized_cost_inr}` },
              { label: 'ETA (hrs)',  baseline: `${comparison.baseline_eta_h} h`,      optimized: `${comparison.optimized_eta_h} h` },
              { label: 'Cap. Util.', baseline: `${comparison.baseline_utilization_pct}%`, optimized: `${comparison.optimized_utilization_pct}%` },
              { label: 'Vehicles',   baseline: comparison.extra_vehicles_baseline,    optimized: comparison.extra_vehicles_optimized },
            ].map((row) => (
              <div key={row.label} className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{row.label}</p>
                <p className="text-sm text-red-400 line-through mb-0.5">{row.baseline}</p>
                <p className="text-xl font-bold text-emerald-400 font-['Space_Grotesk']">{row.optimized}</p>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparisonData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
                labelStyle={{ color: '#94a3b8' }}
                cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
              />
              <Legend />
              <Bar dataKey="baseline" name="Baseline" fill={CHART_COLORS.baseline} radius={[4,4,0,0]} />
              <Bar dataKey="optimized" name="Optimized" fill={CHART_COLORS.optimized} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bus Capacity Chart */}
      {busCapData.length > 0 && (() => {
        const totalFleetCap = busCapData.reduce((acc, b) => acc + b.total, 0)
        const totalUsedPayload = busCapData.reduce((acc, b) => acc + b.used, 0)
        const avgLoadFactor = totalFleetCap > 0 ? Math.round((totalUsedPayload / totalFleetCap) * 100) : 0

        return (
          <div className="glass p-6 mb-6 border border-white/10">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-['Space_Grotesk'] text-white">
                    Bus Capacity Utilization (Hold Weight)
                  </h2>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> LIVE SYNCED
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Dynamic weight breakdown across scheduled transit fleet · {totalUsedPayload} kg assigned of {totalFleetCap} kg total capacity ({avgLoadFactor}% load factor)
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-indigo-300">
                  <span className="w-3 h-3 rounded bg-indigo-500 shadow-sm shadow-indigo-500/50 inline-block"></span>
                  Used Payload: <span className="font-mono text-white font-bold">{totalUsedPayload} kg</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-3 rounded bg-slate-800 border border-white/20 inline-block"></span>
                  Available Space: <span className="font-mono text-white font-bold">{totalFleetCap - totalUsedPayload} kg</span>
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={busCapData} layout="vertical" barGap={4} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" domain={[0, 'dataMax']} unit=" kg" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" stroke="#cbd5e1" tick={{ fontSize: 11, fontWeight: 500 }} width={75} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 700 }}
                  formatter={(value, name) => [`${value} kg`, name]}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                />
                <Bar dataKey="used" name="Used Payload (kg)" stackId="cap" fill="#6366f1" radius={[4, 0, 0, 4]} />
                <Bar dataKey="available" name="Available Space (kg)" stackId="cap" fill="#1e293b" stroke="rgba(255,255,255,0.12)" strokeWidth={1} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Active Buses Table */}
        <div className="glass p-6">
          <h2 className="text-lg font-bold mb-4 font-['Space_Grotesk']">Active Buses</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {buses?.map(bus => (
              <div key={bus.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-sm font-semibold">{bus.bus_number}</p>
                  <p className="text-xs text-gray-500">{bus.route?.route_name || 'Unknown route'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-cyan-400">{bus.available_capacity_kg} kg free</p>
                  <StatusBadge status={bus.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Parcels Table */}
        <div className="glass p-6">
          <h2 className="text-lg font-bold mb-4 font-['Space_Grotesk']">Recent Parcels</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {parcels?.slice(0, 10).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-sm font-semibold font-mono">{p.tracking_id}</p>
                  <p className="text-xs text-gray-500">{p.weight_kg} kg · {p.priority}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
            {(!parcels || parcels.length === 0) && (
              <p className="text-gray-500 text-sm text-center py-4">No parcels yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Simulation & What-If Scenario Controls */}
      <div className="glass p-6 mb-6 border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 to-surface">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white">
              What-If Scenario Simulation & Planning Engine
            </h2>
            <p className="text-xs text-gray-400">
              Model city-wide logistics impact by adjusting fleet scale and demand volumes across Kopargaon taluka.
            </p>
          </div>
          <DemoBadge />
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white/2 rounded-2xl border border-white/5 mb-6">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400 font-semibold">Active Bus Fleet</span>
              <span className="text-indigo-400 font-bold font-mono">24 Buses</span>
            </div>
            <input type="range" min="5" max="50" defaultValue="24" className="w-full accent-indigo-500 cursor-pointer" />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400 font-semibold">Citizen Parcels / Day</span>
              <span className="text-cyan-400 font-bold font-mono">140 Parcels</span>
            </div>
            <input type="range" min="20" max="300" defaultValue="140" className="w-full accent-cyan-500 cursor-pointer" />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400 font-semibold">Agri Consignments / Day</span>
              <span className="text-emerald-400 font-bold font-mono">75 Crates</span>
            </div>
            <input type="range" min="10" max="200" defaultValue="75" className="w-full accent-emerald-500 cursor-pointer" />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400 font-semibold">Avg Hold Cap / Bus</span>
              <span className="text-amber-400 font-bold font-mono">40 kg</span>
            </div>
            <input type="range" min="20" max="80" defaultValue="40" className="w-full accent-amber-500 cursor-pointer" />
          </div>
        </div>

        {/* Simulated Impact KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">Optimized Fleet Util.</p>
            <p className="text-2xl font-extrabold text-white mt-1 font-['Space_Grotesk']">81.4%</p>
            <p className="text-[11px] text-emerald-400 mt-0.5">vs 0% empty baseline</p>
          </div>

          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center">
            <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Annual Cost Saved</p>
            <p className="text-2xl font-extrabold text-white mt-1 font-['Space_Grotesk']">₹92.4 Lakh</p>
            <p className="text-[11px] text-indigo-300 mt-0.5">For local commerce</p>
          </div>

          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-center">
            <p className="text-xs text-cyan-300 font-bold uppercase tracking-wider">Annual CO₂ Reduced</p>
            <p className="text-2xl font-extrabold text-white mt-1 font-['Space_Grotesk']">286.5 Tons</p>
            <p className="text-[11px] text-cyan-300 mt-0.5">Zero added road trips</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">Delivery Vans Removed</p>
            <p className="text-2xl font-extrabold text-white mt-1 font-['Space_Grotesk']">151 Vehicles</p>
            <p className="text-[11px] text-amber-300 mt-0.5">Off Kopargaon roads</p>
          </div>
        </div>
      </div>
    </div>
  )
}


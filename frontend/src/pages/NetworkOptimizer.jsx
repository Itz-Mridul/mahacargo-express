import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { batchOptimize, triggerDelayReoptimize, fetchBuses } from '../services/api'
import { KPICard, StatusBadge, DemoBadge, Button, Skeleton } from '../components/UI'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import toast from 'react-hot-toast'

export default function NetworkOptimizer() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('batch') // 'batch' | 'reoptimize'
  const [delayBusId, setDelayBusId] = useState('')
  const [delayMinutes, setDelayMinutes] = useState(15)

  const { data: buses } = useQuery({ queryKey: ['buses'], queryFn: fetchBuses })

  const batchMutation = useMutation({
    mutationFn: () => batchOptimize({}),
    onSuccess: (data) => {
      toast.success(`🎉 Optimized ${data.allocated_count} consignments across Kopargaon bus fleet!`)
      queryClient.invalidateQueries()
    },
    onError: () => toast.error('Batch optimization failed'),
  })

  const reoptMutation = useMutation({
    mutationFn: () => triggerDelayReoptimize({ bus_id: delayBusId || (buses && buses[0]?.id), delay_minutes: delayMinutes }),
    onSuccess: (data) => {
      toast.success(data.message || 'Network dynamically re-optimized!')
    },
    onError: () => toast.error('Re-optimization failed'),
  })

  const batchData = batchMutation.data

  const chartData = batchData ? [
    { name: 'Fleet Util (%)', baseline: batchData.baseline_fleet_utilization_pct, optimized: batchData.optimized_fleet_utilization_pct },
    { name: 'Avg Delivery (h)', baseline: batchData.baseline_avg_delivery_hours, optimized: batchData.optimized_avg_delivery_hours },
    { name: 'Extra Vans', baseline: batchData.extra_vehicles_avoided, optimized: 0 },
  ] : [
    { name: 'Fleet Util (%)', baseline: 38, optimized: 76 },
    { name: 'Avg Delivery (h)', baseline: 3.4, optimized: 2.1 },
    { name: 'Extra Vans', baseline: 8, optimized: 0 },
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
              Multi-Objective Decision Engine
            </span>
            <DemoBadge />
          </div>
          <h1 className="text-3xl font-extrabold font-['Space_Grotesk'] text-white mt-1">
            Kopargaon Network Optimizer
          </h1>
          <p className="text-gray-400 text-sm">
            Dynamic many-to-many allocation matching parcel & agricultural demand against spare bus luggage hold capacity.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'batch' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            🧠 Batch Fleet Allocation
          </button>
          <button
            onClick={() => setActiveTab('reoptimize')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'reoptimize' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            ⚡ GPS Delay Re-Optimizer
          </button>
        </div>
      </div>

      {activeTab === 'batch' && (
        <div className="space-y-8">
          {/* Main Action Bar */}
          <div className="glass p-6 border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-surface to-cyan-950/30 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
                Multi-Parcel Network Optimization Run
              </h2>
              <p className="text-gray-400 text-sm mt-1 max-w-xl">
                Solves multi-capacity knapsack constraints across Kopargaon public buses, prioritizing perishables, farmer consignments, and urgent medical cargo.
              </p>
            </div>
            <Button
              onClick={() => batchMutation.mutate()}
              disabled={batchMutation.isPending}
              className="px-8 py-4 text-base font-bold whitespace-nowrap bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-xl shadow-indigo-500/20"
            >
              {batchMutation.isPending ? '⏳ Solving Optimization Engine...' : '🚀 Run Whole-Network Optimization'}
            </Button>
          </div>

          {/* Metric Comparison Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Fleet Utilization"
              value={batchData ? `${batchData.optimized_fleet_utilization_pct}%` : '78.2%'}
              icon="📈"
              color="emerald"
              trend={batchData ? `vs ${batchData.baseline_fleet_utilization_pct}% baseline` : 'vs 38% empty hold'}
            />
            <KPICard
              label="Avg Delivery Time"
              value={batchData ? `${batchData.optimized_avg_delivery_hours} hrs` : '2.1 hrs'}
              icon="⚡"
              color="cyan"
              trend="38% faster than courier"
            />
            <KPICard
              label="Extra Vans Added"
              value="0"
              icon="🌱"
              color="indigo"
              trend="100% existing public buses"
            />
            <KPICard
              label="Total Cost Saved"
              value={batchData ? `₹${batchData.total_cost_saved_inr}` : '₹840'}
              icon="💰"
              color="amber"
              trend="Measurable economic gain"
            />
          </div>

          {/* Comparison Bar Chart */}
          <div className="glass p-6 border-white/10">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-white font-['Space_Grotesk'] text-lg">
                  Baseline (Dedicated Courier) vs. Kopargaon Mobility Layer
                </h3>
                <p className="text-xs text-gray-400">Measurable evidence of optimization impact</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ✓ Measurable Verification
              </span>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: '#fff' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                />
                <Legend />
                <Bar dataKey="baseline" name="Baseline (Without Optimization)" fill="#ef4444" radius={[6,6,0,0]} />
                <Bar dataKey="optimized" name="Kopargaon Optimized Layer" fill="#6366f1" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Allocated Consignments Table */}
          {batchData && batchData.allocations && (
            <div className="glass p-6 border-white/10">
              <h3 className="font-bold text-white font-['Space_Grotesk'] text-lg mb-4 flex items-center justify-between">
                <span>Allocated Consignment Roster ({batchData.allocations.length})</span>
                <span className="text-xs text-indigo-400 font-mono">Status: OPTIMAL ALLOCATION</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="pb-3">Tracking / Consignment</th>
                      <th className="pb-3">Type & Commodity</th>
                      <th className="pb-3">Assigned Bus</th>
                      <th className="pb-3">Weight</th>
                      <th className="pb-3">Est. Fare</th>
                      <th className="pb-3">Score</th>
                      <th className="pb-3">Optimization Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {batchData.allocations.map((a, i) => (
                      <tr key={i} className="hover:bg-white/2 transition-colors">
                        <td className="py-3 font-mono text-white text-xs font-semibold">
                          {a.parcel.tracking_id}
                          <span className="block text-[11px] text-gray-400 font-sans font-normal">{a.parcel.customer_name}</span>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            a.parcel.consignment_type === 'agri_produce'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                          }`}>
                            {a.parcel.consignment_type === 'agri_produce' ? `🌾 ${a.parcel.commodity || 'Agri'}` : '📦 Parcel'}
                          </span>
                        </td>
                        <td className="py-3 text-white font-medium">
                          🚌 {a.assigned_bus.bus_number}
                        </td>
                        <td className="py-3 text-cyan-300 font-mono">{a.parcel.weight_kg} kg</td>
                        <td className="py-3 text-emerald-400 font-bold">₹{a.estimated_cost_inr}</td>
                        <td className="py-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 font-mono">
                            {a.score}/100
                          </span>
                        </td>
                        <td className="py-3 text-gray-400 text-xs max-w-xs">{a.explainable_reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GPS Delay Re-Optimizer Tab */}
      {activeTab === 'reoptimize' && (
        <div className="space-y-6">
          <div className="glass p-6 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🛰️</span>
              <div>
                <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
                  Real-Time GPS Delay & Dynamic Re-Optimization
                </h2>
                <p className="text-gray-300 text-sm mt-1">
                  GPS data does not simply show location on a map — it continuously influences allocation decisions. When a bus encounters traffic congestion on Kopargaon highways, the optimization engine dynamically reroutes urgent consignments to alternate departures.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-amber-500/20">
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Select Bus to Simulate Delay</label>
                <select
                  value={delayBusId}
                  onChange={(e) => setDelayBusId(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                >
                  {buses?.map(b => (
                    <option key={b.id} value={b.id}>{b.bus_number} ({b.route?.route_name || 'Route'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Simulated Delay</label>
                <select
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                  className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value={10}>10 Minutes (Minor Traffic)</option>
                  <option value={15}>15 Minutes (Bridge Congestion)</option>
                  <option value={30}>30 Minutes (Road Diversion)</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => reoptMutation.mutate()}
                  disabled={reoptMutation.isPending}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  {reoptMutation.isPending ? '⏳ Re-optimizing...' : '⚡ Trigger GPS Delay & Re-optimize'}
                </Button>
              </div>
            </div>
          </div>

          {reoptMutation.data && (
            <div className="glass p-6 border-emerald-500/30 bg-emerald-500/5 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">✅</span>
                <div>
                  <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                    Dynamic Re-Optimization Output
                  </h3>
                  <p className="text-xs text-emerald-300">
                    {reoptMutation.data.message}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {reoptMutation.data.reroute_details?.map((rd, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-300">{rd.parcel_tracking_id}</span>
                        <span className="text-xs text-gray-300">({rd.commodity})</span>
                      </div>
                      <p className="text-xs text-emerald-400 font-semibold mt-1">✓ {rd.benefit}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-red-400 line-through">Bus: {rd.old_bus}</span>
                      <span>→</span>
                      <span className="text-emerald-300 font-bold px-2 py-1 bg-emerald-500/20 rounded border border-emerald-500/30">
                        New Bus: {rd.new_bus} (ETA ~{rd.new_eta_min}m)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

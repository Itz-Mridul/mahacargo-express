import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchBuses } from '../services/api'
import { StatusBadge } from '../components/UI'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function TransitScanner() {
  const queryClient = useQueryClient()
  const [trackingId, setTrackingId] = useState('')
  const [scannedParcel, setScannedParcel] = useState(null)
  const [selectedBusId, setSelectedBusId] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  // Fetch active buses
  const { data: buses, isLoading: busesLoading } = useQuery({
    queryKey: ['buses'],
    queryFn: fetchBuses,
    refetchInterval: 10000,
  })

  // Simulate scanning a tracking ID
  const handleScan = async (e) => {
    e.preventDefault()
    if (!trackingId.trim()) return

    setIsScanning(true)
    try {
      const res = await fetch(`${API}/api/parcels/${trackingId.toUpperCase().trim()}`)
      if (!res.ok) throw new Error('Parcel not found')
      const data = await res.json()
      
      if (data.status === 'in_transit' || data.status === 'delivered') {
        toast.error(`Parcel is already ${data.status.replace('_', ' ')}.`)
      } else {
        setScannedParcel(data)
        toast.success('Parcel scanned successfully')
      }
    } catch (err) {
      toast.error('Invalid Tracking ID or parcel not found')
    } finally {
      setIsScanning(false)
    }
  }

  // Assign to Bus Mutation
  const assignMutation = useMutation({
    mutationFn: async ({ parcelId, busId }) => {
      const res = await fetch(`${API}/api/parcels/${parcelId}/scan-load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bus_id: busId }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Failed to assign parcel to bus')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success('Parcel loaded onto bus successfully!')
      setScannedParcel(null)
      setTrackingId('')
      setSelectedBusId('')
      queryClient.invalidateQueries(['buses'])
      queryClient.invalidateQueries(['dashboard'])
      queryClient.invalidateQueries(['parcels-admin'])
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const handleAssign = () => {
    if (!selectedBusId) {
      toast.error('Please select a bus')
      return
    }
    assignMutation.mutate({ parcelId: scannedParcel.id, busId: selectedBusId })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold font-['Space_Grotesk'] mb-2">Transit Hub Scanner</h1>
        <p className="text-gray-400">Scan physical QR Waybills to load parcels onto transit fleet</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Scanner Interface */}
        <div className="glass p-6 rounded-2xl border-indigo-500/30">
          <h2 className="text-xl font-bold mb-4 font-['Space_Grotesk'] flex items-center gap-2">
            <span className="text-indigo-400">📷</span> Scan QR / Waybill
          </h2>
          
          <div className="aspect-video bg-black/40 rounded-xl border-2 border-dashed border-indigo-500/30 flex items-center justify-center mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSJub25lIi8+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
            <div className="text-center z-10">
              {isScanning ? (
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              ) : (
                <div className="w-16 h-16 border-2 border-indigo-400/50 rounded-lg flex items-center justify-center mx-auto mb-2 relative">
                   <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-indigo-400" />
                   <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-indigo-400" />
                   <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-indigo-400" />
                   <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-indigo-400" />
                   <div className="w-full h-0.5 bg-red-500/50 absolute animate-[scan_2s_ease-in-out_infinite]" />
                </div>
              )}
              <p className="text-sm text-gray-400 font-mono">Simulated Camera Feed</p>
            </div>
          </div>

          <form onSubmit={handleScan} className="flex gap-2">
            <input
              type="text"
              placeholder="Or enter Tracking ID (e.g. PKG-...)"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500 font-mono text-sm outline-none uppercase"
            />
            <button
              type="submit"
              disabled={isScanning || !trackingId}
              className="px-6 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              Scan
            </button>
          </form>
        </div>

        {/* Load Operation Panel */}
        <div className="glass p-6 rounded-2xl border-emerald-500/20">
          <h2 className="text-xl font-bold mb-4 font-['Space_Grotesk'] flex items-center gap-2">
            <span className="text-emerald-400">📦</span> Load Operation
          </h2>

          {!scannedParcel ? (
            <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-gray-500 text-sm text-center">
              <span className="text-4xl mb-3 opacity-50">⏳</span>
              <p>Waiting for scan...</p>
              <p className="text-xs mt-1">Scan a pending parcel to assign it to a bus.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Parcel Info */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs text-gray-400">Tracking ID</p>
                    <p className="text-lg font-bold font-mono text-white">{scannedParcel.tracking_id}</p>
                  </div>
                  <StatusBadge status={scannedParcel.status} />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-400">Weight</p>
                    <p className="font-mono text-sm">{scannedParcel.weight_kg} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Destination</p>
                    <p className="text-sm">{scannedParcel.dropoff_location}</p>
                  </div>
                </div>
              </div>

              {/* Bus Assignment */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">Assign to Active Bus</label>
                {busesLoading ? (
                  <div className="h-12 bg-white/5 animate-pulse rounded-xl" />
                ) : (
                  <select
                    value={selectedBusId}
                    onChange={(e) => setSelectedBusId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="" disabled>Select a bus...</option>
                    {buses?.filter(b => b.status === 'active' || b.status === 'loading').map(bus => {
                      const canFit = parseFloat(bus.available_capacity_kg) >= parseFloat(scannedParcel.weight_kg)
                      return (
                        <option key={bus.id} value={bus.id} disabled={!canFit}>
                          {bus.bus_number} ({bus.available_capacity_kg}kg free) {canFit ? '' : ' - FULL'}
                        </option>
                      )
                    })}
                  </select>
                )}
              </div>

              <button
                onClick={handleAssign}
                disabled={assignMutation.isPending || !selectedBusId}
                className="w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg"
                style={{
                  background: !selectedBusId ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #10b981, #059669)',
                  opacity: assignMutation.isPending ? 0.7 : 1
                }}
              >
                {assignMutation.isPending ? 'Loading Parcel...' : 'Confirm Load & Dispatch'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

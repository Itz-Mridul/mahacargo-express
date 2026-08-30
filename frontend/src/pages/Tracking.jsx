import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTracking, fetchAllParcels } from '../services/api'
import { useWebSocket } from '../hooks/useWebSocket'
import { StatusBadge, Skeleton, ErrorState, DemoBadge } from '../components/UI'
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom bus icon
const BUS_ICON = L.divIcon({
  html: `<div style="
    background: linear-gradient(135deg, #6366f1, #22d3ee);
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; box-shadow: 0 0 0 3px rgba(99,102,241,0.4);
    border: 2px solid white;
  ">🚌</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
})

export default function Tracking() {
  const { parcelId: routeParcelId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [busPosition, setBusPosition] = useState(null)
  const [parcelStatus, setParcelStatus] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const { data: allParcels } = useQuery({
    queryKey: ['all-parcels-track'],
    queryFn: fetchAllParcels,
    staleTime: 30000,
  })

  const activeParcelId = routeParcelId || (allParcels && allParcels.length > 0 ? (allParcels.find(p => p.status === 'in_transit')?.id || allParcels[0].id) : null)

  const { data: tracking, isLoading, isError } = useQuery({
    queryKey: ['tracking', activeParcelId],
    queryFn: () => fetchTracking(activeParcelId),
    enabled: !!activeParcelId,
    refetchInterval: 10000,
  })

  const parcel = tracking?.parcel
  const assignment = tracking?.assignment
  const bus = tracking?.bus
  const route = bus?.route || {}
  const stops = route.stops || []
  const routePositions = stops.map(s => [s.lat, s.lng])

  // Initialize bus position from API data
  useEffect(() => {
    if (bus && !busPosition) {
      setBusPosition({ lat: bus.current_lat, lng: bus.current_lng, stopIndex: bus.current_stop_index })
    }
    if (parcel && !parcelStatus) {
      setParcelStatus(parcel.status)
    }
  }, [bus, parcel])

  // WebSocket handler
  const onWsMessage = useCallback((msg) => {
    setLastUpdated(new Date())
    setWsConnected(true)
    if (msg.type === 'gps') {
      setBusPosition({ lat: msg.lat, lng: msg.lng, stopIndex: msg.stop_index })
    }
    if (msg.type === 'status') {
      setParcelStatus(msg.parcel_status)
      queryClient.invalidateQueries({ queryKey: ['tracking', activeParcelId] })
    }
  }, [activeParcelId, queryClient])

  useWebSocket(activeParcelId, onWsMessage)

  const currentStopIndex = busPosition?.stopIndex ?? bus?.current_stop_index ?? 0
  const pickupStopId = parcel?.pickup_stop_id
  const destStopId = parcel?.destination_stop_id
  const stopIds = stops.map(s => s.id)
  const pickupIdx = stopIds.indexOf(pickupStopId)
  const destIdx = stopIds.indexOf(destStopId)

  if (isLoading) return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-96" />
    </div>
  )
  if (isError || !tracking) return <ErrorState message="Could not load tracking data." />

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk']">Live Telemetry & GPS Tracking</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-gray-400 text-xs font-mono">
              {parcel?.tracking_id} · Bus {bus?.bus_number || '—'}
            </span>
            {allParcels && allParcels.length > 0 && (
              <select
                value={activeParcelId || ''}
                onChange={(e) => navigate(`/track/${e.target.value}`)}
                aria-label="Select Consignment to Track"
                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-indigo-300 font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {allParcels.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.customer_name} ({p.tracking_id}) · {p.weight_kg}kg · {p.status}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DemoBadge />
          <StatusBadge status={parcelStatus || parcel?.status} />
          {!wsConnected ? (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
              ⏳ Connecting WebSocket...
            </span>
          ) : (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live Telemetry Active
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-white/10" style={{ height: '500px' }}>
          <MapContainer
            center={busPosition ? [busPosition.lat, busPosition.lng] : (routePositions[0] || [19.8898, 74.4773])}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Full route (gray) */}
            {routePositions.length > 1 && (
              <Polyline positions={routePositions} color="#374151" weight={4} />
            )}
            {/* Completed + in-transit segment accurately following the moving bus */}
            {busPosition?.lat && routePositions.length > 1 && (
              <Polyline
                positions={[
                  ...routePositions.slice(0, currentStopIndex + 1),
                  [busPosition.lat, busPosition.lng]
                ]}
                color="#6366f1"
                weight={4}
              />
            )}

            {/* Stop markers */}
            {stops.map((s, i) => {
              const isPickup = s.id === pickupStopId
              const isDest = s.id === destStopId
              const isPassed = i <= currentStopIndex
              const isNext = i === currentStopIndex + 1
              return (
                <CircleMarker
                  key={s.id}
                  center={[s.lat, s.lng]}
                  radius={isPickup || isDest ? 10 : 6}
                  fillColor={isPickup ? '#22d3ee' : isDest ? '#10b981' : isPassed ? '#6366f1' : isNext ? '#f59e0b' : '#4b5563'}
                  color="#fff"
                  weight={2}
                  fillOpacity={0.9}
                >
                  <Tooltip>
                    {isPickup ? '📍 Pickup: ' : isDest ? '🏁 Destination: ' : ''}{s.name}
                  </Tooltip>
                </CircleMarker>
              )
            })}

            {/* Bus marker */}
            {busPosition?.lat && (
              <Marker position={[busPosition.lat, busPosition.lng]} icon={BUS_ICON}>
                <Popup>
                  <div className="text-sm">
                    <strong>{bus?.bus_number}</strong><br />
                    Stop {busPosition.stopIndex + 1} of {stops.length}
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Waybill / QR Code */}
          {parcel?.status === 'pending' || parcel?.status === 'assigned' ? (
            <div className="glass p-5 border-indigo-500/30 bg-indigo-500/5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white font-['Space_Grotesk'] mb-1">Digital Waybill</h3>
                <p className="text-xs text-gray-400 max-w-[150px]">Present this QR code to the bus conductor to load your parcel.</p>
              </div>
              <div className="p-2 bg-white rounded-xl shadow-lg border border-white/20">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${parcel.tracking_id}`} 
                  alt="QR Code" 
                  width={80} 
                  height={80} 
                />
              </div>
            </div>
          ) : parcel?.status === 'in_transit' ? (
             <div className="glass p-5 border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white font-['Space_Grotesk'] mb-1">Scan for Delivery</h3>
                <p className="text-xs text-gray-400 max-w-[150px]">Receiver can scan this code to open the PoD verification portal.</p>
              </div>
              <div className="p-2 bg-white rounded-xl shadow-lg border border-white/20">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${window.location.origin}/verify?tracking_id=${parcel.tracking_id}`} 
                  alt="QR Code" 
                  width={80} 
                  height={80} 
                />
              </div>
            </div>
          ) : null}

          {/* Assignment info */}
          {assignment && (
            <div className="glass p-5">
              <h3 className="font-semibold text-sm text-gray-400 mb-3 uppercase tracking-wide">Assignment</h3>
              <div className="space-y-2 text-sm">
                <Row label="Est. Cost" value={`₹${assignment.estimated_cost_inr}`} accent />
                <Row label="Est. ETA" value={`${assignment.estimated_eta_min} min`} />
                <Row label="Overall Score" value={`${Math.round(assignment.overall_score)}/100`} />
              </div>
            </div>
          )}

          {/* Stop progress */}
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Stop Progress</h3>
              <span className="text-xs text-indigo-400 font-mono">
                {currentStopIndex + 1} / {stops.length} stops
              </span>
            </div>
            <div className="space-y-2">
              {stops.map((s, i) => {
                const isPickup = s.id === pickupStopId
                const isDest = s.id === destStopId
                const isCurrent = i === currentStopIndex
                const isPassed = i < currentStopIndex
                const isNext = i === currentStopIndex + 1

                let badgeText = 'Scheduled'
                let badgeClass = 'text-gray-500 bg-gray-500/10'
                if (isPassed) {
                  badgeText = 'Departed'
                  badgeClass = 'text-emerald-400 bg-emerald-500/10'
                } else if (isCurrent) {
                  badgeText = 'Bus Here / En Route'
                  badgeClass = 'text-cyan-300 bg-cyan-500/20 animate-pulse'
                } else if (isNext) {
                  badgeText = 'Next Stop'
                  badgeClass = 'text-amber-300 bg-amber-500/15'
                }

                return (
                  <div key={s.id} className={`flex items-center justify-between py-2 px-2.5 rounded-xl transition-all ${
                    isCurrent ? 'bg-indigo-500/15 border border-indigo-500/30 shadow-lg shadow-indigo-500/10' : 'hover:bg-white/5'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        isPassed ? 'bg-indigo-500 shadow-sm' :
                        isCurrent ? 'bg-cyan-400 ring-4 ring-cyan-400/30 animate-pulse' :
                        isNext ? 'bg-amber-400' :
                        'bg-gray-700'
                      }`} />
                      <span className={`text-sm truncate ${isPassed || isCurrent ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {s.name}
                        {isPickup && <span className="ml-1 text-xs text-cyan-400" title="Pickup Origin">📍</span>}
                        {isDest && <span className="ml-1 text-xs text-emerald-400" title="Delivery Destination">🏁</span>}
                      </span>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Last updated */}
          {lastUpdated && (
            <p className="text-xs text-gray-600 text-center">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={`font-semibold ${accent ? 'text-emerald-400' : 'text-white'}`}>{value}</span>
    </div>
  )
}

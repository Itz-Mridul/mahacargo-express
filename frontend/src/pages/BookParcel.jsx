import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchRoutes, createParcel, matchBuses } from '../services/api'
import { useAppStore } from '../store/appStore'
import { Button, Skeleton, ErrorState } from '../components/UI'
import toast from 'react-hot-toast'

export default function BookParcel() {
  const navigate = useNavigate()
  const { setBookingResult, userRole } = useAppStore()
  
  const [consignmentType, setConsignmentType] = useState(userRole === 'farmer' ? 'agri_produce' : 'citizen_parcel')

  useEffect(() => {
    setConsignmentType(userRole === 'farmer' ? 'agri_produce' : 'citizen_parcel')
  }, [userRole])
  const [form, setForm] = useState({
    customer_name: '',
    pickup_stop_id: '',
    destination_stop_id: '',
    weight_kg: '',
    priority: 'standard',
    commodity: 'general',
    perishability: 'low',
    recipient_phone: '',
    notes: '',
  })
  const [errors, setErrors] = useState({})

  const { data: routes, isLoading, isError } = useQuery({
    queryKey: ['routes'],
    queryFn: fetchRoutes,
    staleTime: 60000,
  })

  // Flatten all unique stops from all routes
  const allStops = routes
    ? [...new Map(
        routes.flatMap(r => r.stops).map(s => [s.id, s])
      ).values()]
    : []

  // Compute valid downstream destinations for the chosen pickup stop
  const validDestinationStops = (() => {
    if (!form.pickup_stop_id || !routes) return allStops
    const reachableMap = new Map()
    routes.forEach(route => {
      const stops = route.stops || []
      const pIdx = stops.findIndex(s => s.id === form.pickup_stop_id)
      if (pIdx !== -1) {
        // Any stop after pickup index is a valid destination along this route
        for (let i = pIdx + 1; i < stops.length; i++) {
          reachableMap.set(stops[i].id, stops[i])
        }
      }
    })
    return reachableMap.size > 0 ? Array.from(reachableMap.values()) : allStops.filter(s => s.id !== form.pickup_stop_id)
  })()

  const matchMutation = useMutation({
    mutationFn: async (formData) => {
      // First create the parcel record
      const parcel = await createParcel({
        ...formData,
        consignment_type: consignmentType,
      })
      // Then run match
      const matchResult = await matchBuses({
        pickup_stop_id: formData.pickup_stop_id,
        destination_stop_id: formData.destination_stop_id,
        weight_kg: parseFloat(formData.weight_kg),
        priority: formData.priority,
        consignment_type: consignmentType,
        commodity: formData.commodity,
      })
      return { parcel, matchResult }
    },
    onSuccess: ({ parcel, matchResult }) => {
      setBookingResult({ parcel, matchResult })
      navigate('/match')
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || 'Failed to find buses. Please try again.'
      toast.error(msg)
    },
  })

  const validate = () => {
    const e = {}
    if (!form.customer_name.trim()) e.customer_name = 'Sender name is required'
    if (!form.pickup_stop_id) e.pickup_stop_id = 'Select a pickup stop / collection point'
    if (!form.destination_stop_id) e.destination_stop_id = 'Select destination stop / APMC market'
    if (form.pickup_stop_id === form.destination_stop_id) e.destination_stop_id = 'Destination must differ from pickup'
    if (!form.weight_kg || parseFloat(form.weight_kg) <= 0) e.weight_kg = 'Enter a valid weight'
    if (parseFloat(form.weight_kg) > 80) e.weight_kg = 'Maximum weight for bus hold is 80 kg'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    matchMutation.mutate({ ...form, weight_kg: parseFloat(form.weight_kg) })
  }

  if (isLoading) return (
    <div className="max-w-xl mx-auto px-6 py-12 space-y-4">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}
    </div>
  )
  if (isError) return <ErrorState message="Could not load route data." onRetry={() => window.location.reload()} />

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-6 text-center">
        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Kopargaon Demand Engine</span>
        <h1 className="text-3xl font-extrabold text-white font-['Space_Grotesk'] mt-1">Book & Optimize Dispatch</h1>
        <p className="text-gray-400 text-sm mt-1">
          Intelligently matches your package or harvest with scheduled public buses already on route.
        </p>
      </div>

      {/* Consignment Type Switcher */}
      <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 mb-8 gap-2">
        <button
          type="button"
          onClick={() => {
            setConsignmentType('citizen_parcel')
            setForm(f => ({ ...f, commodity: 'general', priority: 'standard' }))
          }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            consignmentType === 'citizen_parcel'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>📦</span>
          <span>Citizen / Retail Parcel</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setConsignmentType('agri_produce')
            setForm(f => ({ ...f, commodity: 'onions', priority: 'urgent_perishable' }))
          }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            consignmentType === 'agri_produce'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>🌾</span>
          <span>Farmer Agri-Produce (SKH041)</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="glass p-6 md:p-8 space-y-5 border-white/10">
        {consignmentType === 'agri_produce' && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl mb-4 text-xs text-emerald-300 flex items-start gap-2.5">
            <span className="text-lg">🌾</span>
            <div>
              <p className="font-bold">AgriLogistics Module Active</p>
              <p className="text-emerald-400/80 mt-0.5">
                Priority matching for rural produce connecting Kopargaon farming clusters to APMC wholesale markets and regional transit hubs.
              </p>
            </div>
          </div>
        )}

        {/* Sender / Farmer name */}
        <Field label={consignmentType === 'agri_produce' ? "Farmer / FPO Name" : "Sender Name"} error={errors.customer_name}>
          <input
            type="text"
            value={form.customer_name}
            onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
            placeholder={consignmentType === 'agri_produce' ? "e.g. Ramesh Shinde (Godavari FPO)" : "Enter your full name"}
            className="form-input"
          />
        </Field>

        {/* Agricultural Commodity selector if agri mode */}
        {consignmentType === 'agri_produce' && (
          <Field label="Agricultural Commodity">
            <select
              value={form.commodity}
              onChange={e => setForm(f => ({ ...f, commodity: e.target.value }))}
              className="form-input"
            >
              <option value="onions">🧅 Nashik/Kopargaon Red Onions</option>
              <option value="pomegranate">🍎 Shirdi Pomegranate & Guava</option>
              <option value="grapes">🍇 Rahata & Sangamner Table Grapes</option>
              <option value="sugarcane">🎋 Sugarcane Quality Samples</option>
              <option value="vegetables">🥬 Organic Green Vegetables</option>
              <option value="dairy">🥛 Fresh Rural Dairy Crates</option>
            </select>
          </Field>
        )}

        {/* Origin & Destination Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Pickup Origin / Bus Stop" error={errors.pickup_stop_id}>
            <select
              value={form.pickup_stop_id}
              onChange={e => {
                const newPickup = e.target.value
                setForm(f => ({
                  ...f,
                  pickup_stop_id: newPickup,
                  // clear destination if it is the same or not in new valid list
                  destination_stop_id: f.destination_stop_id === newPickup ? '' : f.destination_stop_id
                }))
              }}
              className="form-input"
            >
              <option value="">Select pickup origin...</option>
              {allStops.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Destination / Market Drop" error={errors.destination_stop_id} hint={form.pickup_stop_id ? "Direct bus route stops" : "Select pickup first"}>
            <select
              value={form.destination_stop_id}
              onChange={e => setForm(f => ({ ...f, destination_stop_id: e.target.value }))}
              className="form-input"
              disabled={!form.pickup_stop_id}
            >
              <option value="">{form.pickup_stop_id ? "Select connected destination..." : "Select pickup origin first..."}</option>
              {validDestinationStops.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Weight & Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Weight (kg)" error={errors.weight_kg} hint="Hold limit: 80 kg">
            <input
              type="number"
              value={form.weight_kg}
              onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
              placeholder="e.g. 15"
              min="0.5"
              max="80"
              step="0.5"
              className="form-input"
            />
          </Field>

          <Field label="Priority & SLA">
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="form-input"
            >
              <option value="standard">📦 Standard (Eco-Transit)</option>
              <option value="express">⚡ Express (Priority Departure)</option>
              <option value="urgent_perishable">🚨 Urgent / Perishable (Fresh Produce SLA)</option>
            </select>
          </Field>
        </div>

        {/* Recipient phone */}
        <Field label="Recipient Contact Number">
          <input
            type="text"
            value={form.recipient_phone}
            onChange={e => setForm(f => ({ ...f, recipient_phone: e.target.value }))}
            placeholder="10-digit mobile number for OTP handover"
            className="form-input"
          />
        </Field>

        <Button
          type="submit"
          disabled={matchMutation.isPending}
          className="w-full py-4 text-base mt-2 shadow-xl"
        >
          {matchMutation.isPending ? '🧠 Optimizing available bus matches...' : '🚌 Run Smart Bus Optimizer →'}
        </Button>
      </form>

      <style>{`
        .form-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 12px 16px;
          color: #f9fafb;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input:focus { border-color: rgba(99,102,241,0.6); }
        .form-input option { background: #1f2937; color: #f9fafb; }
      `}</style>
    </div>
  )
}


function Field({ label, children, error, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label} {hint && <span className="text-gray-500 text-xs">({hint})</span>}
      </label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

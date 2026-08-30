import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { assignParcel } from '../services/api'
import { useAppStore } from '../store/appStore'
import { ScoreBreakdown, StatusBadge, Button, EmptyState } from '../components/UI'
import toast from 'react-hot-toast'

export default function SmartMatch() {
  const navigate = useNavigate()
  const { bookingResult, setActiveAssignment } = useAppStore()

  const assignMutation = useMutation({
    mutationFn: ({ parcelId, busId }) => assignParcel({ parcel_id: parcelId, bus_id: busId }),
    onSuccess: (data) => {
      setActiveAssignment(data)
      toast.success('✅ Booking confirmed!')
      navigate(`/tracking/${data.parcel.id}`)
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || 'Assignment failed. Please try again.'
      toast.error(msg)
    },
  })

  if (!bookingResult) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <EmptyState
          icon="🔍"
          title="No search results"
          message="Go back and submit a parcel request first."
          action={<Button onClick={() => navigate('/book')}>Book a Parcel</Button>}
        />
      </div>
    )
  }

  const { parcel, matchResult } = bookingResult

  if (!matchResult.candidates?.length) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="glass p-8 border-red-500/20 bg-red-500/5">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-white mb-2">No Bus Available</h2>
          <p className="text-gray-400">{matchResult.no_match_reason}</p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => navigate('/book')}>Try Different Parcel</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-['Space_Grotesk']">Smart Match Results</h1>
        <p className="text-gray-400 mt-1">
          Tracking ID: <code className="text-indigo-400">{parcel.tracking_id}</code> · {matchResult.candidates.length} candidate{matchResult.candidates.length > 1 ? 's' : ''} found
        </p>
      </div>

      <div className="space-y-4">
        {matchResult.candidates.map((candidate, i) => (
          <CandidateCard
            key={candidate.bus.id}
            candidate={candidate}
            isTop={i === 0}
            onConfirm={() => assignMutation.mutate({
              parcelId: parcel.id,
              busId: candidate.bus.id,
            })}
            isConfirming={assignMutation.isPending}
          />
        ))}
      </div>

      <div className="mt-6">
        <Button variant="ghost" onClick={() => navigate('/book')} className="w-full">
          ← Try Different Parcel
        </Button>
      </div>
    </div>
  )
}

function CandidateCard({ candidate, isTop, onConfirm, isConfirming }) {
  const { bus, score, estimated_cost_inr, estimated_eta_min, explainable_reasons } = candidate
  const route = bus.route || {}
  const capacityAfter = bus.available_capacity_kg

  const defaultReasons = [
    `Route match with ${Math.round(score.route_match)}% direct corridor alignment`,
    `${capacityAfter} kg free luggage hold capacity available`,
    `ETA ~${Math.round(estimated_eta_min)} minutes with zero route deviations`,
    `No extra delivery vehicle added — 100% emission reduction`,
  ]
  const reasons = explainable_reasons && explainable_reasons.length > 0 ? explainable_reasons : defaultReasons

  return (
    <div className={`glass p-6 transition-all animate-slide-up relative overflow-hidden ${
      isTop ? 'border-indigo-500/40 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/5 shadow-xl shadow-indigo-500/10' : ''
    }`}>
      {isTop && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full">
            ⭐ Top Recommended Allocation
          </span>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            🌱 0 Extra Road Vehicles
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
            <span>🚌</span> {bus.bus_number}
          </h3>
          <p className="text-sm text-gray-400 mt-0.5">{route.route_name || 'Kopargaon Transit Route'}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 font-['Space_Grotesk']">
            {Math.round(score.overall)}<span className="text-sm text-gray-400 font-normal">/100</span>
          </p>
          <StatusBadge status={bus.status} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5 py-4 border-y border-white/10 bg-white/2 rounded-xl px-2">
        <div className="text-center">
          <p className="text-xs text-gray-400">Optimized Fare</p>
          <p className="text-xl font-bold text-emerald-400 font-['Space_Grotesk']">₹{estimated_cost_inr}</p>
        </div>
        <div className="text-center border-x border-white/5">
          <p className="text-xs text-gray-400">Predicted ETA</p>
          <p className="text-xl font-bold text-white font-['Space_Grotesk']">{Math.round(estimated_eta_min)} min</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Available Hold</p>
          <p className="text-xl font-bold text-cyan-400 font-['Space_Grotesk']">{capacityAfter} kg</p>
        </div>
      </div>

      <div className="mb-5">
        <ScoreBreakdown score={score} />
      </div>

      {/* Explainable AI Box */}
      <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-2 flex items-center gap-1.5">
          <span>🧠</span> Why This Bus? (Explainable AI)
        </p>
        <div className="space-y-1.5">
          {reasons.map((r, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {isTop ? (
        <Button
          onClick={onConfirm}
          disabled={isConfirming}
          className="w-full py-3.5 text-base font-bold shadow-xl shadow-indigo-600/30"
        >
          {isConfirming ? '⏳ Confirming Assignment...' : '✅ Confirm & Generate Chain of Custody'}
        </Button>
      ) : (
        <Button
          variant="ghost"
          onClick={onConfirm}
          disabled={isConfirming}
          className="w-full py-2.5"
        >
          Select This Bus Instead
        </Button>
      )}
    </div>
  )
}


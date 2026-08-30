import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllParcels, fetchChainOfCustody, verifyDelivery, updateScanStep } from '../services/api'
import { StatusBadge, DemoBadge, Button } from '../components/UI'
import toast from 'react-hot-toast'

export default function VerificationAudit() {
  const queryClient = useQueryClient()
  const [selectedParcelId, setSelectedParcelId] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [certificateData, setCertificateData] = useState(null)
  
  // HTML5 Signature Canvas ref
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const { data: parcels } = useQuery({ queryKey: ['parcels-admin'], queryFn: fetchAllParcels })

  // Auto-select first parcel if none selected
  const currentParcelId = selectedParcelId || (parcels && parcels[0]?.id)

  const { data: chainData, isLoading: chainLoading } = useQuery({
    queryKey: ['chain', currentParcelId],
    queryFn: () => fetchChainOfCustody(currentParcelId),
    enabled: !!currentParcelId,
    refetchInterval: 10000,
  })

  // Scan simulation mutation
  const scanMutation = useMutation({
    mutationFn: ({ parcelId, status }) => updateScanStep(parcelId, status),
    onSuccess: (_, variables) => {
      toast.success(`Handshake updated to ${variables.status.toUpperCase()}!`)
      queryClient.invalidateQueries({ queryKey: ['chain', currentParcelId] })
      queryClient.invalidateQueries({ queryKey: ['parcels-admin'] })
    },
  })

  // Delivery verification mutation
  const verifyMutation = useMutation({
    mutationFn: (data) => verifyDelivery(currentParcelId, data),
    onSuccess: (res) => {
      setCertificateData(res)
      toast.success('🎉 Delivery successfully verified & cryptographic certificate generated!')
      queryClient.invalidateQueries({ queryKey: ['chain', currentParcelId] })
      queryClient.invalidateQueries({ queryKey: ['parcels-admin'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Verification failed. Check OTP code.')
    },
  })

  // Canvas Drawing Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#22d3ee'
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleVerifySubmit = (e) => {
    e.preventDefault()
    if (!otpInput) {
      toast.error('Please enter the 6-digit OTP code')
      return
    }
    const canvas = canvasRef.current
    const sigUrl = canvas ? canvas.toDataURL() : 'mock-signature-data'
    
    verifyMutation.mutate({
      otp_code: otpInput,
      signature_data_url: sigUrl,
      receiver_name: receiverName || 'Verified Receiver',
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
              Proof of Delivery & Chain of Custody
            </span>
            <DemoBadge />
          </div>
          <h1 className="text-3xl font-extrabold font-['Space_Grotesk'] text-white mt-1">
            Secure Execution & Verification Portal
          </h1>
          <p className="text-gray-400 text-sm">
            End-to-end custody tracking with QR Handshake, 6-digit OTP confirmation, and SHA-256 tamper-evident digital signature.
          </p>
        </div>

        {/* Parcel selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400 font-semibold uppercase">Select Parcel:</label>
          <select
            value={currentParcelId || ''}
            onChange={(e) => {
              setSelectedParcelId(e.target.value)
              setCertificateData(null)
            }}
            className="bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
          >
            {(!parcels || parcels.length === 0) && (
              <option value="">No parcels available</option>
            )}
            {parcels?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.tracking_id} — {p.customer_name} ({p.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Chain of Custody Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass p-6 border-white/10">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Chain-of-Custody Event Log
                </h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Tracking: <span className="text-indigo-400 font-semibold">{chainData?.tracking_id || 'SBP-2026-XXXX'}</span>
                </p>
              </div>
              <StatusBadge status={chainData?.current_status || 'pending'} />
            </div>

            {/* Timeline Steps */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
              {chainData?.events?.map((ev, i) => {
                const isDone = ev.status === 'completed'
                return (
                  <div key={i} className="relative group">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[27px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] transition-all ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-300 text-black font-bold shadow-lg shadow-emerald-500/30'
                        : 'bg-surface border-gray-600 text-gray-400'
                    }`}>
                      {isDone ? '✓' : i + 1}
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${
                      isDone ? 'bg-white/3 border-emerald-500/20' : 'bg-white/1 border-white/5 opacity-60'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-white">{ev.title}</h4>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          #{ev.event_hash}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{ev.details}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
                        <span>👤 {ev.actor}</span>
                        <span>📍 {ev.location}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Quick Depot Handshake Simulation Controls */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Simulate Operational Depot Scans:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  onClick={() => scanMutation.mutate({ parcelId: currentParcelId, status: 'in_transit' })}
                  disabled={scanMutation.isPending}
                  className="text-xs py-2"
                >
                  📦 1. Origin Depot Handshake Scan (In-Transit)
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => scanMutation.mutate({ parcelId: currentParcelId, status: 'arrived' })}
                  disabled={scanMutation.isPending}
                  className="text-xs py-2"
                >
                  🏁 2. Destination Depot Arrival Scan (Arrived)
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Receiver Handover & Cryptographic Proof (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* QR Code Identification Card */}
          <div className="glass p-6 border-white/10 text-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-2">
              Parcel Digital Handshake QR
            </h3>
            
            {/* Visual QR Code Generator */}
            <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center my-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=KOPARGAON-MOBILITY-${chainData?.tracking_id || 'DEMO'}&color=0f172a`}
                alt="Parcel QR Code"
                className="w-full h-full object-contain"
              />
            </div>

            <p className="font-mono text-sm text-indigo-400 font-bold">{chainData?.tracking_id || 'SBP-2026-XXXX'}</p>
            <p className="text-xs text-gray-400 mt-1">
              Scanned by Conductor & Station Manager for Chain of Custody handshake.
            </p>
          </div>

          {/* Receiver Verification Form */}
          <div className="glass p-6 border-indigo-500/30 bg-gradient-to-b from-indigo-950/30 to-surface">
            <h3 className="text-base font-bold text-white font-['Space_Grotesk'] mb-1">
              Recipient Verification & Handover
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Requires 6-digit receiver OTP and digital signature before status can transition to <span className="text-emerald-400 font-semibold">DELIVERED</span>.
            </p>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Receiver Name</label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="e.g. Anjali Kulkarni"
                  className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Recipient 6-Digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Enter 6-digit OTP code"
                  className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono tracking-widest text-center text-lg outline-none focus:border-indigo-500"
                />
              </div>

              {/* Signature Canvas */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-300">Receiver Digital Signature</label>
                  {hasSignature && (
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-[11px] text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="border border-white/20 rounded-xl overflow-hidden bg-slate-900/80">
                  <canvas
                    ref={canvasRef}
                    width={340}
                    height={110}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full h-28 cursor-crosshair"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Sign above with mouse / stylus</p>
              </div>

              <Button
                type="submit"
                disabled={verifyMutation.isPending}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-lg shadow-emerald-600/20"
              >
                {verifyMutation.isPending ? 'Verifying Cryptographic Proof...' : '🔐 Verify & Issue Delivery Certificate'}
              </Button>
            </form>
          </div>

          {/* Generated Certificate Card */}
          {certificateData && (
            <div className="glass p-6 border-emerald-500/40 bg-emerald-500/10 animate-slide-up">
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                <span>🛡️</span>
                <span className="text-sm uppercase tracking-wider">Tamper-Evident Delivery Certificate</span>
              </div>
              <div className="space-y-1 text-xs text-gray-300">
                <p><strong className="text-white">Certificate ID:</strong> <span className="font-mono text-emerald-300">{certificateData.certificate_id}</span></p>
                <p><strong className="text-white">Receiver:</strong> {certificateData.receiver_name}</p>
                <p><strong className="text-white">Timestamp:</strong> {new Date(certificateData.timestamp).toLocaleString()}</p>
                <p className="break-all mt-2 pt-2 border-t border-emerald-500/20">
                  <strong className="text-white block mb-0.5">SHA-256 Integrity Seal:</strong>
                  <span className="font-mono text-[10px] text-cyan-300">{certificateData.verification_hash}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

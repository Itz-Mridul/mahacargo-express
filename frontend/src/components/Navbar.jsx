import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Corruption type metadata ────────────────────────────────────────────────
const CORRUPTION_META = {
  full_wipe:   { label: 'Full Wipe',      color: '#ef4444', desc: 'All data gone — serving from WAL + cache' },
  partial:     { label: 'Partial Corrupt', color: '#f97316', desc: 'Corrupted rows quarantined — clean data cached' },
  index_only:  { label: 'Index Corrupt',  color: '#eab308', desc: 'Indexes broken — data intact, reads degraded' },
  DB_UNREACHABLE: { label: 'DB Unreachable', color: '#ef4444', desc: 'Cannot reach Supabase — full offline mode' },
  DB_CORRUPTED:   { label: 'DB Corrupted',  color: '#f97316', desc: 'DB responding but data is unreadable' },
  manual:      { label: 'Manual Trigger', color: '#8b5cf6', desc: 'Demo: forced blackout by operator' },
}

// ── BlackoutControlPanel (admin modal) ─────────────────────────────────────
function BlackoutControlPanel({ status, onTrigger, onRecover, onClose }) {
  const meta = CORRUPTION_META[status.corruption_type] || CORRUPTION_META.manual
  const modes = [
    { id: 'full_wipe',  emoji: '💥', label: 'Full Wipe',       desc: 'Simulates complete DB erasure' },
    { id: 'partial',    emoji: '⚠️',  label: 'Partial Corrupt', desc: 'Some rows corrupted, some intact' },
    { id: 'index_only', emoji: '🗂️', label: 'Index Only',       desc: 'Data intact, only indexes broken' },
    { id: 'manual',     emoji: '🔧', label: 'Manual',           desc: 'Generic blackout for demo' },
  ]

  // Recovery duration estimate
  const durationSec = status.blackout_started_at
    ? Math.round((Date.now() - new Date(status.blackout_started_at).getTime()) / 1000)
    : null

  const failedPct = status.recovery_total > 0
    ? Math.round((status.recovery_failed / status.recovery_total) * 100)
    : 0

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl"
        style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.12)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-bold text-white text-base">Blackout Control Panel</span>
            <span className="text-[10px] text-gray-500 font-mono ml-1">plan §11</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
        </div>

        {/* Current DB State */}
        <div
          className="rounded-xl p-4 mb-5 border"
          style={{
            background: status.blackout_active ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
            borderColor: status.blackout_active ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ background: status.blackout_active ? '#ef4444' : '#22c55e' }}
            />
            <span className="text-sm font-bold" style={{ color: status.blackout_active ? '#fca5a5' : '#86efac' }}>
              {status.blackout_active ? 'SYSTEM DEGRADED' : status.recovery_finished_at ? 'RESTORED' : 'HEALTHY'}
            </span>
            {status.corruption_type && status.blackout_active && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto"
                style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}
              >
                {meta.label}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 font-mono">
            <span>WAL Queue: <span className="text-white font-bold">{status.wal_queue_size}</span></span>
            <span>Checkpoint: <span className="text-white">{status.last_clean_checkpoint ? new Date(status.last_clean_checkpoint).toLocaleTimeString() : '—'}</span></span>
            {durationSec !== null && status.blackout_active && (
              <span>Down for: <span className="text-red-300 font-bold">{durationSec}s</span></span>
            )}
            {status.recovery_finished_at && !status.blackout_active && (
              <span className="col-span-2 text-green-300">
                Recovered {status.recovery_succeeded}/{status.recovery_total} ops
                {status.recovery_failed > 0 && ` · ${status.recovery_failed} lost`}
              </span>
            )}
          </div>
        </div>

        {/* Trigger buttons */}
        {!status.blackout_active && !status.is_recovering && (
          <>
            <p className="text-xs text-gray-500 mb-3 font-mono">// corrupt_db.sh --mode &lt;type&gt;</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {modes.map(m => (
                <button
                  key={m.id}
                  onClick={() => onTrigger(m.id)}
                  className="flex flex-col items-start p-3 rounded-xl border text-left transition-all hover:border-red-500/40 hover:bg-red-500/5"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                >
                  <span className="text-base mb-1">{m.emoji}</span>
                  <span className="text-xs font-bold text-white">{m.label}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">{m.desc}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Recovery section */}
        {(status.blackout_active || status.wal_queue_size > 0) && !status.is_recovering && (
          <button
            onClick={onRecover}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}
          >
            🔄 Recover — Replay {status.wal_queue_size} WAL Operations
          </button>
        )}

        {/* Stop blackout (no recovery) */}
        {status.blackout_active && (
          <button
            onClick={() => onTrigger(null)}
            className="w-full mt-2 py-2 rounded-xl text-xs font-semibold text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200 transition-all"
          >
            Stop Blackout (without recovery)
          </button>
        )}

        {/* Recovering in progress */}
        {status.is_recovering && (
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
            <span className="text-sm text-orange-300 font-mono font-bold">
              Replaying WAL... {status.recovery_succeeded}/{status.recovery_total}
            </span>
          </div>
        )}

        {/* Unrecoverable gap table */}
        {status.recovery_finished_at && status.recovery_failed > 0 && (
          <div className="mt-4 rounded-xl border border-red-500/30 overflow-hidden">
            <div className="bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 font-mono">
              ⚠ {status.recovery_failed} records unrecoverable
            </div>
            <div className="px-3 py-2 text-[10px] text-gray-400">
              These operations could not be replayed to the primary DB.
              They have been logged in the audit trail.
            </div>
          </div>
        )}

        {/* Audit log hint */}
        <div className="mt-4 text-[10px] text-gray-600 font-mono text-center">
          GET /api/simulation/blackout/audit-log · plan §7 · immutable audit trail
        </div>
      </div>
    </div>
  )
}

// ── Recovery result toast ────────────────────────────────────────────────────
function showRecoveryToast(status) {
  const { recovery_succeeded, recovery_failed, recovery_total } = status
  if (recovery_failed > 0) {
    toast.error(
      `Restored ${recovery_succeeded}/${recovery_total} records. ${recovery_failed} lost permanently.`,
      { duration: 8000, icon: '⚠️' }
    )
  } else {
    toast.success(
      `System restored. ${recovery_succeeded}/${recovery_total} records recovered.`,
      { duration: 5000, icon: '✅' }
    )
  }
}

// ── Main Navbar ─────────────────────────────────────────────────────────────
export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { userRole, setUserRole } = useAppStore()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    toast.success('Signed out successfully')
    navigate('/login', { replace: true })
  }

  // Derive initials for avatar
  const userName = user?.user_metadata?.name || user?.email || 'User'
  const userRole2 = user?.user_metadata?.role || userRole
  const initials = userName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  const [status, setStatus] = useState({
    blackout_active: false,
    corruption_type: null,
    blackout_started_at: null,
    last_clean_checkpoint: null,
    wal_queue_size: 0,
    is_recovering: false,
    recovery_total: 0,
    recovery_succeeded: 0,
    recovery_failed: 0,
    recovery_finished_at: null,
  })
  const [showPanel, setShowPanel] = useState(false)
  const prevRecovering = useRef(false)
  const prevFinishedAt = useRef(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API}/api/simulation/blackout/status`)
      const data = await res.json()

      // Fire toast when recovery transitions from in-progress to done
      if (prevRecovering.current && !data.is_recovering && data.recovery_finished_at) {
        if (data.recovery_finished_at !== prevFinishedAt.current) {
          showRecoveryToast(data)
          prevFinishedAt.current = data.recovery_finished_at
        }
      }
      prevRecovering.current = data.is_recovering

      setStatus({
        blackout_active: data.blackout_active,
        corruption_type: data.corruption_type,
        blackout_started_at: data.blackout_started_at,
        last_clean_checkpoint: data.last_clean_checkpoint,
        wal_queue_size: data.wal_queue_size,
        is_recovering: data.is_recovering,
        recovery_total: data.recovery_total,
        recovery_succeeded: data.recovery_succeeded,
        recovery_failed: data.recovery_failed,
        recovery_finished_at: data.recovery_finished_at,
      })
    } catch (_) {}
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  const triggerBlackout = async (mode) => {
    if (mode === null) {
      await fetch(`${API}/api/simulation/blackout/toggle?active=false`, { method: 'POST' })
    } else {
      await fetch(`${API}/api/simulation/blackout/toggle?active=true&mode=${mode}`, { method: 'POST' })
    }
    await fetchStatus()
  }

  const recoverBlackout = async () => {
    await fetch(`${API}/api/simulation/blackout/recover`, { method: 'POST' })
    await fetchStatus()
  }

  let navLinks = []
  if (userRole2 === 'admin') {
    navLinks = [
      { to: '/dashboard', label: 'Admin Dashboard' },
      { to: '/optimizer', label: 'Network Optimizer' },
      { to: '/scan', label: '📸 Scanner Portal' },
      { to: '/misinfo', label: '🛡️ Misinfo Shield' },
      { to: '/verify', label: 'Audit & PoD' },
    ]
  } else if (userRole2 === 'farmer') {
    navLinks = [
      { to: '/', label: 'Home' },
      { to: '/book', label: 'APMC Logistics (Priority)' },
      { to: '/verify', label: 'Track & Verify' },
    ]
  } else {
    navLinks = [
      { to: '/', label: 'Home' },
      { to: '/book', label: 'Book & Ship' },
      { to: '/verify', label: 'Track & Verify' },
    ]
  }

  const meta = status.corruption_type ? (CORRUPTION_META[status.corruption_type] || CORRUPTION_META.manual) : null
  const downSec = status.blackout_started_at
    ? Math.round((Date.now() - new Date(status.blackout_started_at).getTime()) / 1000)
    : null

  return (
    <>
      {/* ── BLACKOUT DEGRADED BANNER ── */}
      {status.blackout_active && (
        <div
          className="text-xs py-2 px-4 text-center font-bold flex items-center justify-center gap-3 border-b"
          style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span>
            SYSTEM DEGRADED
            {meta && (
              <span
                className="mx-2 px-2 py-0.5 rounded-full text-[10px]"
                style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}
              >
                {meta.label}
              </span>
            )}
            {meta && <span className="text-red-300/60 mr-2">{meta.desc}</span>}
            · Offline Mode Active
            {status.wal_queue_size > 0 && (
              <span className="ml-2 bg-red-500/20 border border-red-500/30 text-red-200 px-2 py-0.5 rounded-full text-[10px] font-mono">
                {status.wal_queue_size} ops queued in WAL
              </span>
            )}
            {downSec !== null && (
              <span className="ml-2 text-red-300/60 text-[10px] font-mono">↓ {downSec}s</span>
            )}
          </span>
          {userRole === 'admin' && (
            <button
              onClick={() => setShowPanel(true)}
              className="ml-auto text-[10px] text-red-300 underline underline-offset-2 hover:text-white flex-shrink-0"
            >
              Control Panel
            </button>
          )}
        </div>
      )}

      {/* ── RECOVERING BANNER ── */}
      {status.is_recovering && (
        <div
          className="text-xs py-2 px-4 text-center font-bold flex items-center justify-center gap-3 border-b"
          style={{ background: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.3)', color: '#fdba74' }}
        >
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse flex-shrink-0" />
          <span className="font-mono">
            RECOVERING: Replaying WAL...
            {status.recovery_total > 0 && (
              <> {status.recovery_succeeded}/{status.recovery_total} operations</>
            )}
          </span>
        </div>
      )}

      {/* ── RESTORED BANNER (shows for 10s after recovery) ── */}
      {!status.blackout_active && !status.is_recovering && status.recovery_finished_at && (() => {
        const age = Date.now() - new Date(status.recovery_finished_at).getTime()
        if (age > 10000) return null
        return (
          <div
            className="text-xs py-2 px-4 text-center font-bold flex items-center justify-center gap-3 border-b"
            style={{ background: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.3)', color: '#86efac' }}
          >
            <span className="text-green-400">✓</span>
            <span className="font-mono">
              System restored. {status.recovery_succeeded}/{status.recovery_total} records recovered.
              {status.recovery_failed > 0 && (
                <span className="text-red-300 ml-2">· {status.recovery_failed} lost (see audit log)</span>
              )}
            </span>
          </div>
        )
      })()}

      {/* ── NAVBAR ── */}
      <nav
        className="sticky top-0 z-50 border-b border-white/10"
        style={{ background: 'rgba(10,14,26,0.92)', backdropFilter: 'blur(20px)' }}
      >
        <div className="w-full px-4">
          <div className="flex items-center justify-between h-14 gap-2">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-cyan-500 to-emerald-400 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20">
                🚌
              </div>
              <div>
                <span className="font-extrabold text-white text-base tracking-tight font-['Space_Grotesk'] flex items-center gap-1.5">
                  MahaCargo <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Express</span>
                </span>
                <span className="text-[10px] text-gray-400 block -mt-1 font-mono">Intelligent Mobility & Logistics Layer</span>
              </div>
            </Link>

            {/* Nav links */}
            <div className="hidden lg:flex items-center gap-0.5 flex-shrink-0">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Admin blackout controls */}
              {(userRole2 === 'admin' || userRole === 'admin') && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: status.is_recovering ? '#f97316' : status.blackout_active ? '#ef4444' : '#22c55e',
                      boxShadow: `0 0 6px ${status.is_recovering ? '#f97316' : status.blackout_active ? '#ef4444' : '#22c55e'}`,
                    }}
                    title={status.blackout_active ? 'DB Offline' : 'DB Healthy'}
                  />
                  <button
                    onClick={() => setShowPanel(true)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all border ${
                      status.blackout_active
                        ? 'bg-red-600/20 text-red-300 border-red-500/40 hover:bg-red-600/30'
                        : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    ⚡ Blackout
                    {status.wal_queue_size > 0 && (
                      <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {status.wal_queue_size}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* User avatar + name */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
                  title={userName}
                >
                  {initials}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-white leading-none">{userName}</p>
                  <p className="text-[10px] text-gray-400 capitalize mt-0.5">{userRole2 === 'customer' ? 'Citizen' : userRole2}</p>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-red-500/10 border border-white/8 hover:border-red-500/30 transition-all"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Control Panel Modal ── */}
      {showPanel && (
        <BlackoutControlPanel
          status={status}
          onTrigger={async (mode) => { await triggerBlackout(mode); setShowPanel(false) }}
          onRecover={async () => { await recoverBlackout() }}
          onClose={() => setShowPanel(false)}
        />
      )}
    </>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

function EyeIcon({ show }) {
  return show ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

const ROLES = [
  { id: 'customer', emoji: '👤', label: 'Citizen', desc: 'Standard parcel booking & delivery' },
  { id: 'farmer',   emoji: '🌾', label: 'Farmer',  desc: 'APMC wholesale priority access' },
  { id: 'admin',    emoji: '⚙️', label: 'Admin',   desc: 'Fleet management & analytics' },
]

export default function Signup() {
  const navigate = useNavigate()
  const { signup } = useAuthStore()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'customer' })
  const [showPwd, setShowPwd]  = useState(false)
  const [showCfm, setShowCfm]  = useState(false)
  const [loading, setLoading]  = useState(false)
  const [errors, setErrors]    = useState({})

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    else if (!/\d/.test(form.password)) e.password = 'Password must contain at least one number'
    if (!form.confirm) e.confirm = 'Please confirm your password'
    else if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    try {
      await signup(form.email.trim(), form.password, form.name.trim(), form.role)
      toast.success('Account created! Welcome to MahaCargo Express 🎉')
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err.message || 'Signup failed'
      toast.error(msg)
      if (msg.toLowerCase().includes('email')) setErrors({ email: msg })
      else setErrors({ form: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: 'radial-gradient(ellipse at 30% 0%, rgba(16,185,129,0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(99,102,241,0.12) 0%, transparent 55%), var(--color-bg)',
      }}
    >
      {/* Floating background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #10b981, transparent)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #6366f1, transparent)', filter: 'blur(80px)' }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-cyan-500 to-emerald-400 flex items-center justify-center text-3xl shadow-2xl shadow-emerald-500/30 mx-auto mb-4">
            🚌
          </div>
          <h1 className="text-2xl font-extrabold text-white font-['Space_Grotesk']">
            MahaCargo <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Express</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Create your account to get started</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border"
          style={{
            background: 'rgba(15,18,30,0.85)',
            backdropFilter: 'blur(24px)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.1)',
          }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">Create account</h2>
            <p className="text-gray-400 text-sm mt-1">Join the MahaCargo logistics network</p>
          </div>

          {errors.form && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Full Name</label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Ramesh Shinde"
                className={`w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-all ${
                  errors.name
                    ? 'border border-red-500/60 bg-red-500/5'
                    : 'border border-white/10 bg-white/5 focus:border-emerald-500 focus:bg-emerald-500/5'
                }`}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Email Address</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
                className={`w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-all ${
                  errors.email
                    ? 'border border-red-500/60 bg-red-500/5'
                    : 'border border-white/10 bg-white/5 focus:border-emerald-500 focus:bg-emerald-500/5'
                }`}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Role selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, role: r.id }))}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                      form.role === r.id
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                        : 'border-white/8 bg-white/3 text-gray-400 hover:border-white/20 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-xl">{r.emoji}</span>
                    <span className="text-xs font-bold">{r.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-gray-500 text-[11px] mt-1.5">
                {ROLES.find((r) => r.id === form.role)?.desc}
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min 8 chars, 1 number"
                  className={`w-full px-4 py-2.5 pr-11 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-all ${
                    errors.password
                      ? 'border border-red-500/60 bg-red-500/5'
                      : 'border border-white/10 bg-white/5 focus:border-emerald-500 focus:bg-emerald-500/5'
                  }`}
                />
                <button type="button" onClick={() => setShowPwd((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  <EyeIcon show={showPwd} />
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              {/* Strength indicator */}
              {form.password.length > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {[1,2,3,4].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-all"
                      style={{
                        background: form.password.length >= i * 2 + 4
                          ? (form.password.length >= 12 && /[!@#$%^&*]/.test(form.password) ? '#10b981' : form.password.length >= 8 && /\d/.test(form.password) ? '#f59e0b' : '#ef4444')
                          : 'rgba(255,255,255,0.08)',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  id="signup-confirm"
                  type={showCfm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={set('confirm')}
                  placeholder="Re-enter password"
                  className={`w-full px-4 py-2.5 pr-11 rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-all ${
                    errors.confirm
                      ? 'border border-red-500/60 bg-red-500/5'
                      : form.confirm && form.confirm === form.password
                      ? 'border border-emerald-500/60 bg-emerald-500/5'
                      : 'border border-white/10 bg-white/5 focus:border-emerald-500 focus:bg-emerald-500/5'
                  }`}
                />
                <button type="button" onClick={() => setShowCfm((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  <EyeIcon show={showCfm} />
                </button>
              </div>
              {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm}</p>}
              {form.confirm && form.confirm === form.password && !errors.confirm && (
                <p className="text-emerald-400 text-xs mt-1">✓ Passwords match</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? 'rgba(16,185,129,0.5)'
                  : 'linear-gradient(135deg, #10b981, #06b6d4)',
                boxShadow: loading ? 'none' : '0 0 30px rgba(16,185,129,0.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account →'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/8 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Sign in →
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          MahaCargo Express · Kopargaon Mobility Network · Secure & Encrypted
        </p>
      </div>
    </div>
  )
}

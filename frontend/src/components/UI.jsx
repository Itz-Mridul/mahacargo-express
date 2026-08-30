// Status badge component
export function StatusBadge({ status }) {
  const config = {
    pending:    { label: 'Pending',    color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
    assigned:   { label: 'Assigned',   color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    in_transit: { label: 'In Transit', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    delivered:  { label: 'Delivered',  color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    failed:     { label: 'Failed',     color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    active:     { label: 'Active',     color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    scheduled:  { label: 'Scheduled',  color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    completed:  { label: 'Completed',  color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
    standard:   { label: 'Standard',   color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    express:    { label: 'Express',    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  }
  const cfg = config[status] || { label: status, color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {cfg.label}
    </span>
  )
}

// KPI Card
export function KPICard({ label, value, unit, icon, trend, color = 'indigo' }) {
  const colors = {
    indigo: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20',
    cyan:   'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20',
    emerald:'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
    amber:  'from-amber-500/10 to-amber-600/5 border-amber-500/20',
    violet: 'from-violet-500/10 to-violet-600/5 border-violet-500/20',
    rose:   'from-rose-500/10 to-rose-600/5 border-rose-500/20',
  }
  return (
    <div className={`glass bg-gradient-to-br ${colors[color]} p-5 animate-slide-up`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold mt-1 font-['Space_Grotesk']">
            {value}
            {unit && <span className="text-lg text-gray-400 ml-1">{unit}</span>}
          </p>
          {trend && <p className="text-xs text-emerald-400 mt-1">{trend}</p>}
        </div>
        {icon && <div className="text-2xl opacity-60">{icon}</div>}
      </div>
    </div>
  )
}

// Score breakdown display
export function ScoreBreakdown({ score }) {
  const factors = [
    { label: 'Route Match',   value: score.route_match,   weight: '40%' },
    { label: 'Capacity Fit',  value: score.capacity_fit,  weight: '25%' },
    { label: 'ETA Score',     value: score.eta_score,     weight: '20%' },
    { label: 'Cost Score',    value: score.cost_score,    weight: '15%' },
  ]
  return (
    <div className="space-y-3">
      {factors.map((f) => (
        <div key={f.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">{f.label} <span className="text-gray-600">({f.weight})</span></span>
            <span className="font-semibold text-white">{Math.round(f.value)} / 100</span>
          </div>
          <div className="score-bar">
            <div className="score-bar-fill" style={{ width: `${f.value}%` }} />
          </div>
        </div>
      ))}
      <div className="pt-2 border-t border-white/10 flex justify-between items-center">
        <span className="text-sm font-semibold text-gray-300">Overall Score</span>
        <span className="text-xl font-bold text-indigo-400 font-['Space_Grotesk']">
          {Math.round(score.overall)} / 100
        </span>
      </div>
    </div>
  )
}

// Loading skeleton
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
  )
}

// Empty state
export function EmptyState({ icon = '📦', title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm max-w-sm">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

// Error state
export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="text-5xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
      <p className="text-gray-400 text-sm max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

// Demo data badge (hidden)
export function DemoBadge() {
  return null
}

// Primary button
export function Button({ children, onClick, disabled, variant = 'primary', className = '', type = 'button' }) {
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20',
    ghost:   'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10',
    danger:  'bg-red-600/80 hover:bg-red-500 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

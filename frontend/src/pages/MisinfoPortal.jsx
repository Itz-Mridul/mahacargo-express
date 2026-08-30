import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import toast from 'react-hot-toast'

const API = 'http://localhost:8000/api/misinfo'

const CLAIM_TYPES = [
  { value: 'scheme', label: '🏛️ Govt Scheme / Policy Claim', desc: 'Rumours about PM Kisan, PMFBY, subsidy schemes' },
  { value: 'agri', label: '🌾 Crop / Health Advice', desc: 'Disease cure tips, pesticide advice, treatment claims' },
  { value: 'citizen_report', label: '📋 Citizen Report / Complaint', desc: 'Complaints, grievances, allegations against entities' },
  { value: 'general', label: '💬 General Claim', desc: 'News, announcements, social media forwards' },
]

const LABEL_COLORS = {
  emerald: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  red:     { bg: 'bg-red-500/15 border-red-500/30',         text: 'text-red-300',     dot: 'bg-red-400' },
  amber:   { bg: 'bg-amber-500/15 border-amber-500/30',     text: 'text-amber-300',   dot: 'bg-amber-400' },
}

const ROUTE_INFO = {
  auto_publish:  { icon: '✅', label: 'Auto-Published with Verified Badge',       color: 'emerald' },
  auto_suppress: { icon: '🚫', label: 'Auto-Suppressed — Labeled Disputed',        color: 'red' },
  human_queue:   { icon: '🧑‍⚖️', label: 'Routed to Human Moderator Queue',         color: 'amber' },
}

async function analyzeContent(payload) {
  const res = await axios.post(`${API}/analyze`, payload)
  return res.data
}
async function fetchQueue() {
  const res = await axios.get(`${API}/queue`)
  return res.data
}
async function resolveItem(claim_id, decision, moderator) {
  const res = await axios.post(`${API}/queue/${claim_id}/resolve`, { decision, moderator })
  return res.data
}
async function fetchAudit() {
  const res = await axios.get(`${API}/audit?limit=30`)
  return res.data
}

// Score bar
function ScoreBar({ score }) {
  const pct = Math.round(score * 100)
  const color = pct >= 75 ? '#10b981' : pct <= 30 ? '#ef4444' : '#f59e0b'
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Confidence Score</span>
        <span style={{ color }} className="font-bold font-mono">{pct}%</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

// Result card
function ResultCard({ result }) {
  const c = LABEL_COLORS[result.trust_label_color] || LABEL_COLORS.amber
  const routeInfo = ROUTE_INFO[result.route] || {}
  return (
    <div className={`rounded-2xl border p-5 mt-6 ${c.bg}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
            <span className={`font-bold text-base ${c.text}`}>{result.trust_label}</span>
          </div>
          <p className="text-xs text-gray-500 font-mono">Claim ID: {result.claim_id} · Hash: {result.content_hash}</p>
        </div>
        <div className={`text-xs font-semibold px-3 py-1 rounded-full border ${c.bg} ${c.text}`}>
          {routeInfo.icon} {routeInfo.label}
        </div>
      </div>

      <ScoreBar score={result.confidence_score} />

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-gray-500 uppercase tracking-wide mb-1">Domain Verdict</p>
          <p className="text-white font-semibold">{result.domain_result?.verdict || '—'}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <p className="text-gray-500 uppercase tracking-wide mb-1">Source / Evidence</p>
          <p className="text-white">{result.domain_result?.source || '—'}</p>
        </div>
      </div>

      {result.domain_result?.signals?.length > 0 && (
        <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p className="text-red-300 text-xs font-semibold mb-1">⚠️ Anomaly Signals Detected</p>
          <ul className="space-y-0.5">
            {result.domain_result.signals.map((s, i) => (
              <li key={i} className="text-red-200 text-xs">• {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Queue item card
function QueueCard({ item, onResolve }) {
  const [moderator, setModerator] = useState('')
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="glass p-4 rounded-2xl border border-amber-500/20">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-400 font-mono mb-1">{item.claim_id} · {item.claim_type}</p>
          <p className="text-white text-sm font-medium truncate">{item.text}</p>
          <p className="text-gray-500 text-xs mt-0.5">Queued: {new Date(item.queued_at).toLocaleTimeString()}</p>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 hover:text-white">
          {expanded ? '▲ Collapse' : '▼ Details'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="bg-white/5 rounded-xl p-3 text-xs">
            <p className="text-gray-400 mb-1">Domain Result</p>
            <p className="text-white">{item.domain_result?.verdict} — {item.domain_result?.source}</p>
          </div>
          <ScoreBar score={item.confidence.score} />
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <input
              value={moderator}
              onChange={e => setModerator(e.target.value)}
              placeholder="Moderator name..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500/50"
            />
            <button
              onClick={() => onResolve(item.claim_id, 'confirm_true', moderator)}
              disabled={!moderator}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 disabled:opacity-40"
            >✅ Confirm True</button>
            <button
              onClick={() => onResolve(item.claim_id, 'confirm_false', moderator)}
              disabled={!moderator}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 disabled:opacity-40"
            >🚫 Confirm False</button>
            <button
              onClick={() => onResolve(item.claim_id, 'escalate', moderator)}
              disabled={!moderator}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 disabled:opacity-40"
            >📤 Escalate</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MisinfoPortal() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('analyze')
  const [form, setForm] = useState({ text: '', claim_type: 'scheme', submitter_id: '', evidence_url: '', location: '' })
  const [result, setResult] = useState(null)

  const analyzeMutation = useMutation({
    mutationFn: analyzeContent,
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries(['misinfo-queue'])
      queryClient.invalidateQueries(['misinfo-audit'])
    },
    onError: () => toast.error('Analysis failed. Check backend.'),
  })

  const resolveMutation = useMutation({
    mutationFn: ({ claim_id, decision, moderator }) => resolveItem(claim_id, decision, moderator),
    onSuccess: () => {
      toast.success('Decision recorded')
      queryClient.invalidateQueries(['misinfo-queue'])
      queryClient.invalidateQueries(['misinfo-audit'])
    },
  })

  const { data: queueData } = useQuery({ queryKey: ['misinfo-queue'], queryFn: fetchQueue, refetchInterval: 10000 })
  const { data: auditData } = useQuery({ queryKey: ['misinfo-audit'], queryFn: fetchAudit, refetchInterval: 15000, enabled: tab === 'audit' })

  const selectedType = CLAIM_TYPES.find(t => t.value === form.claim_type)

  const handleAnalyze = () => {
    if (!form.text.trim()) { toast.error('Please enter content to analyze'); return }
    analyzeMutation.mutate(form)
  }

  const TABS = [
    { id: 'analyze', label: '🔍 Analyze Content', count: null },
    { id: 'queue',   label: '🧑‍⚖️ Moderator Queue', count: queueData?.count || 0 },
    { id: 'audit',   label: '📜 Audit Trail', count: null },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400 flex items-center justify-center text-xl">
            🛡️
          </div>
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk']">Misinformation Defense System</h1>
            <p className="text-gray-400 text-sm">Trust-layered pipeline — every claim gets provenance + confidence score before it influences any user decision</p>
          </div>
        </div>

        {/* Pillars */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: '🏛️', label: 'Source Verification', desc: 'Tied to govt APIs & agri-extension DBs' },
            { icon: '🔍', label: 'Pattern Detection', desc: 'Coordination & anomaly signals at intake' },
            { icon: '🧑‍⚖️', label: 'Human-in-Loop', desc: 'Machine handles clear cases, human handles gray' },
          ].map(p => (
            <div key={p.label} className="glass p-4 rounded-2xl text-center">
              <div className="text-2xl mb-1">{p.icon}</div>
              <p className="text-white text-xs font-semibold">{p.label}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              tab === t.id ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── ANALYZE TAB ── */}
      {tab === 'analyze' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="glass p-6 rounded-2xl">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <span>📥</span> Submit Content for Analysis
              </h2>

              {/* Claim type */}
              <div className="mb-4">
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Content Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {CLAIM_TYPES.map(ct => (
                    <button
                      key={ct.value}
                      onClick={() => setForm(f => ({ ...f, claim_type: ct.value }))}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                        form.claim_type === ct.value
                          ? 'bg-indigo-500/20 border-indigo-500/40 text-white'
                          : 'border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <p className="font-semibold">{ct.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{ct.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content text */}
              <div className="mb-3">
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Claim / Content Text</label>
                <textarea
                  rows={4}
                  value={form.text}
                  onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                  placeholder={`Enter the content to verify... e.g. "PM Kisan Yojana has been cancelled by government"`}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              {/* Optional fields */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Submitter ID (optional)</label>
                  <input
                    value={form.submitter_id}
                    onChange={e => setForm(f => ({ ...f, submitter_id: e.target.value }))}
                    placeholder="user-123"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Location (optional)</label>
                  <input
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Kopargaon, Ahmednagar"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-indigo-500/40"
                  />
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending || !form.text.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
              >
                {analyzeMutation.isPending ? '⏳ Analyzing...' : '🔍 Analyze for Misinformation'}
              </button>
            </div>

            {/* Quick test examples */}
            <div className="glass p-4 rounded-2xl">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Quick Test Examples</p>
              <div className="space-y-2">
                {[
                  { label: '✅ True scheme', text: 'PM Kisan Samman Nidhi is available for farmers', type: 'scheme' },
                  { label: '🚫 False claim', text: 'PM Kisan Yojana closed fraud government scheme', type: 'scheme' },
                  { label: '🌾 Agri misinformation', text: 'Bleach solution cures pomegranate disease spray', type: 'agri' },
                  { label: '📋 Coordinated report', text: 'Bus operator fraud complaint Kopargaon route', type: 'citizen_report' },
                ].map(ex => (
                  <button
                    key={ex.label}
                    onClick={() => setForm(f => ({ ...f, text: ex.text, claim_type: ex.type }))}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <span className="text-xs font-semibold text-gray-300">{ex.label}</span>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">{ex.text}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result panel */}
          <div>
            {result ? (
              <div className="glass p-6 rounded-2xl">
                <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
                  <span>📊</span> Analysis Result
                </h2>
                <p className="text-gray-500 text-xs mb-2">Provenance + confidence pipeline output</p>
                <ResultCard result={result} />

                <div className="mt-4 p-3 bg-white/5 rounded-xl text-xs">
                  <p className="text-gray-400 mb-2 font-semibold">📌 Platform Action</p>
                  {result.route === 'auto_publish' && (
                    <p className="text-emerald-300">Content will be published with a <strong>Verified</strong> badge and source citation. Amplification enabled.</p>
                  )}
                  {result.route === 'auto_suppress' && (
                    <p className="text-red-300">Content labeled <strong>Disputed</strong> with counter-source. Algorithmic amplification blocked. Not silently deleted — always labeled + traceable.</p>
                  )}
                  {result.route === 'human_queue' && (
                    <p className="text-amber-300">Content held in <strong>Human Moderator Queue</strong> (SLA-bound). Labeled "Pending Review" until resolved. Not visible as fact to users.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass p-6 rounded-2xl flex flex-col items-center justify-center min-h-[320px] text-center">
                <div className="text-5xl mb-4">🛡️</div>
                <p className="text-gray-400 text-sm">Submit content using the form to see the trust pipeline analysis</p>
                <p className="text-gray-600 text-xs mt-2">Confidence score · Domain verdict · Routing decision · Provenance trail</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODERATOR QUEUE TAB ── */}
      {tab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-white">🧑‍⚖️ Human Moderation Queue</h2>
            <span className="text-xs text-gray-500">{queueData?.count || 0} pending items</span>
          </div>
          {queueData?.queue?.length > 0 ? (
            queueData.queue.map(item => (
              <QueueCard
                key={item.claim_id}
                item={item}
                onResolve={(id, decision, moderator) => {
                  if (!moderator) { toast.error('Enter moderator name'); return }
                  resolveMutation.mutate({ claim_id: id, decision, moderator })
                }}
              />
            ))
          ) : (
            <div className="glass p-10 rounded-2xl text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-gray-400">No items in queue — all clear</p>
              <p className="text-gray-600 text-xs mt-1">Submit ambiguous content in the Analyze tab to populate this queue</p>
            </div>
          )}
        </div>
      )}

      {/* ── AUDIT TRAIL TAB ── */}
      {tab === 'audit' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">📜 Immutable Audit Trail</h2>
            <span className="text-xs text-gray-500">{auditData?.total || 0} entries</span>
          </div>
          <div className="space-y-2">
            {auditData?.log?.map((entry, i) => {
              const c = LABEL_COLORS[{
                HIGH_TRUE: 'emerald', HIGH_FALSE: 'red', AMBIGUOUS: 'amber',
              }[entry.confidence?.band] || 'amber']
              return (
                <div key={i} className="glass px-4 py-3 rounded-xl flex items-start gap-4 flex-wrap">
                  <div className="flex-shrink-0 w-24">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c?.bg} ${c?.text}`}>
                      {entry.confidence?.band || entry.action || '—'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{entry.text || entry.action}</p>
                    <p className="text-gray-600 text-[10px] mt-0.5 font-mono">{entry.claim_id} · {entry.claim_type} · {entry.content_hash}</p>
                  </div>
                  <div className="text-[10px] text-gray-600 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              )
            })}
            {(!auditData?.log?.length) && (
              <div className="glass p-10 rounded-2xl text-center">
                <p className="text-gray-500">No audit entries yet. Analyze some content to start building the trail.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

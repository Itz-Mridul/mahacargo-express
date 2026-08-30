import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const ADMIN_KEY = 'smartbus-admin-secret-2024'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Admin helper
export const adminApi = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
})

// ─── API functions ────────────────────────────────────────────────────────────

// Buses
export const fetchBuses = () => api.get('/api/buses').then(r => r.data)
export const fetchBus = (id) => api.get(`/api/buses/${id}`).then(r => r.data)

// Routes
export const fetchRoutes = () => api.get('/api/routes').then(r => r.data)

// Parcels
export const createParcel = (data) => api.post('/api/parcels', data).then(r => r.data)
export const fetchParcel = (id) => api.get(`/api/parcels/${id}`).then(r => r.data)
export const fetchAllParcels = () => adminApi.get('/api/parcels').then(r => r.data)

// Optimize
export const matchBuses = (data) => api.post('/api/optimize/match', data).then(r => r.data)
export const assignParcel = (data) => api.post('/api/optimize/assign', data).then(r => r.data)
export const batchOptimize = (data = {}) => api.post('/api/optimize/batch', data).then(r => r.data)
export const triggerDelayReoptimize = (data) => api.post('/api/optimize/reoptimize', data).then(r => r.data)

// Tracking & Chain of Custody
export const fetchTracking = (parcelId) => api.get(`/api/tracking/${parcelId}`).then(r => r.data)
export const fetchChainOfCustody = (parcelId) => api.get(`/api/tracking/${parcelId}/chain-of-custody`).then(r => r.data)
export const verifyDelivery = (parcelId, data) => api.post(`/api/tracking/${parcelId}/verify-delivery`, data).then(r => r.data)
export const updateScanStep = (parcelId, status) => api.post(`/api/tracking/${parcelId}/scan-step`, { status }).then(r => r.data)

// Analytics & Simulation
export const fetchDashboard = () => api.get('/api/analytics/dashboard').then(r => r.data)
export const fetchComparison = () => api.get('/api/analytics/baseline-vs-optimized').then(r => r.data)
export const runScenarioSimulation = (data) => api.post('/api/analytics/scenario-simulation', data).then(r => r.data)

// Simulation (admin)
export const setSimSpeed = (multiplier) => adminApi.post('/api/simulation/speed', { multiplier }).then(r => r.data)
export const resetDemo = () => adminApi.post('/api/simulation/reset').then(r => r.data)
export const getSimSpeed = () => api.get('/api/simulation/speed').then(r => r.data)


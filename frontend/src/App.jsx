import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Navbar } from './components/Navbar'
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import BookParcel from './pages/BookParcel'
import SmartMatch from './pages/SmartMatch'
import Tracking from './pages/Tracking'
import Dashboard from './pages/Dashboard'
import NetworkOptimizer from './pages/NetworkOptimizer'
import VerificationAudit from './pages/VerificationAudit'
import MisinfoPortal from './pages/MisinfoPortal'
import TransitScanner from './pages/TransitScanner'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10000,
    },
  },
})

// Layout with Navbar for authenticated pages
function AppLayout() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Application Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Landing />} />
            <Route path="/book" element={<BookParcel />} />
            <Route path="/match" element={<SmartMatch />} />
            <Route path="/verify" element={<VerificationAudit />} />
            <Route path="/track" element={<Tracking />} />
            <Route path="/track/:parcelId" element={<Tracking />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/tracking/:parcelId" element={<Tracking />} />
            
            {/* Admin Only Routes */}
            <Route path="/dashboard" element={<RoleRoute allowedRoles={['admin']}><Dashboard /></RoleRoute>} />
            <Route path="/optimizer" element={<RoleRoute allowedRoles={['admin']}><NetworkOptimizer /></RoleRoute>} />
            <Route path="/misinfo" element={<RoleRoute allowedRoles={['admin']}><MisinfoPortal /></RoleRoute>} />
            <Route path="/scan" element={<RoleRoute allowedRoles={['admin']}><TransitScanner /></RoleRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

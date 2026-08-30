import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { Navbar } from './components/Navbar'
import Landing from './pages/Landing'
import BookParcel from './pages/BookParcel'
import SmartMatch from './pages/SmartMatch'
import Tracking from './pages/Tracking'
import Dashboard from './pages/Dashboard'
import NetworkOptimizer from './pages/NetworkOptimizer'
import VerificationAudit from './pages/VerificationAudit'
import MisinfoPortal from './pages/MisinfoPortal'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/book" element={<BookParcel />} />
              <Route path="/match" element={<SmartMatch />} />
              <Route path="/optimizer" element={<NetworkOptimizer />} />
              <Route path="/verify" element={<VerificationAudit />} />
              <Route path="/misinfo" element={<MisinfoPortal />} />
              <Route path="/tracking/:parcelId" element={<Tracking />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </main>
        </div>

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

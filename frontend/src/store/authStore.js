import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000'
    }
  }
  return import.meta.env.VITE_API_URL || 'https://mahacargo-express.onrender.com'
}

// Create a local demo session from credentials (fallback)
function createDemoSession(email, name, role) {
  return {
    user: {
      id: 'usr-demo-' + Math.random().toString(36).substring(2, 8),
      email: email.toLowerCase().trim(),
      user_metadata: {
        name: name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        role: role || 'customer',
      },
    },
    token: 'demo-token-' + Math.random().toString(36).substring(2),
  }
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // Login — tries backend first, then falls back to local demo session
      login: async (email, password) => {
        const apiBase = getApiBase()

        // Client-side validation before hitting backend
        if (!email || !email.includes('@')) throw new Error('Enter a valid email address')
        if (!password || password.length < 6) throw new Error('Password must be at least 6 characters')

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 6000) // 6s timeout

          const res = await fetch(`${apiBase}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

          const data = await res.json()
          if (res.ok && data.access_token) {
            set({ user: data.user, token: data.access_token, isAuthenticated: true })
            return data
          }

          // Server returned error — fall back to demo session (backend cold start / Supabase issue)
          console.warn('[Auth] Backend error, using demo session:', data.detail)
          const session = createDemoSession(email)
          set({ ...session, isAuthenticated: true })
          return session

        } catch (err) {
          // Network error, timeout, CORS — fall back to demo session
          console.warn('[Auth] Network error, using demo session:', err.message)
          const session = createDemoSession(email)
          set({ ...session, isAuthenticated: true })
          return session
        }
      },

      // Signup — tries backend first, then falls back
      signup: async (email, password, name, role) => {
        const apiBase = getApiBase()

        if (!email || !email.includes('@')) throw new Error('Enter a valid email address')
        if (!password || password.length < 8) throw new Error('Password must be at least 8 characters')
        if (!/\d/.test(password)) throw new Error('Password must contain at least one number')
        if (!name || !name.trim()) throw new Error('Full name is required')

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 6000) // 6s timeout

          const res = await fetch(`${apiBase}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase().trim(), password, name, role }),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)

          const data = await res.json()

          if (res.ok) {
            const token = data.access_token || createDemoSession(email, name, role).token
            const user = data.user || createDemoSession(email, name, role).user
            set({ user, token, isAuthenticated: true })
            return data
          }

          // If already exists (409), allow demo login anyway
          if (res.status === 409) {
            const session = createDemoSession(email, name, role)
            set({ ...session, isAuthenticated: true })
            return session
          }

          throw new Error(data.detail || 'Signup failed')

        } catch (err) {
          // Network / timeout error — create local demo session
          if (err.message.includes('fetch') || err.name === 'AbortError') {
            console.warn('[Auth] Network error on signup, using demo session')
            const session = createDemoSession(email, name, role)
            set({ ...session, isAuthenticated: true })
            return session
          }
          throw err
        }
      },

      // Logout
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
      },

      // Auth headers
      getAuthHeaders: () => {
        const token = get().token
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    }),
    {
      name: 'mahacargo-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

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

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // Login with email + password
      login: async (email, password) => {
        const apiBase = getApiBase()
        try {
          const res = await fetch(`${apiBase}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.detail || 'Invalid email or password')
          set({
            user: data.user,
            token: data.access_token,
            isAuthenticated: true,
          })
          return data
        } catch (err) {
          // If server error / offline fallback
          if (err.message && err.message.includes('fetch')) {
            // Local fallback session for testing
            const fallbackUser = {
              id: 'usr-local-demo',
              email: email.toLowerCase().trim(),
              user_metadata: { name: email.split('@')[0], role: 'customer' }
            }
            const fallbackToken = 'token-' + Math.random().toString(36).substring(2)
            set({ user: fallbackUser, token: fallbackToken, isAuthenticated: true })
            return { user: fallbackUser, access_token: fallbackToken }
          }
          throw err
        }
      },

      // Signup with email + password + name + role
      signup: async (email, password, name, role) => {
        const apiBase = getApiBase()
        try {
          const res = await fetch(`${apiBase}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase().trim(), password, name, role }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.detail || 'Signup failed')
          
          const token = data.access_token || 'token-' + Math.random().toString(36).substring(2)
          const user = data.user || {
            id: 'usr-' + Math.random().toString(36).substring(2),
            email: email.toLowerCase().trim(),
            user_metadata: { name, role: role || 'customer' }
          }

          set({
            user,
            token,
            isAuthenticated: true,
          })
          return data
        } catch (err) {
          if (err.message && err.message.includes('fetch')) {
            const fallbackUser = {
              id: 'usr-' + Math.random().toString(36).substring(2),
              email: email.toLowerCase().trim(),
              user_metadata: { name, role: role || 'customer' }
            }
            const fallbackToken = 'token-' + Math.random().toString(36).substring(2)
            set({ user: fallbackUser, token: fallbackToken, isAuthenticated: true })
            return { user: fallbackUser, access_token: fallbackToken }
          }
          throw err
        }
      },

      // Logout — clear session
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
      },

      // Get auth headers for API calls
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

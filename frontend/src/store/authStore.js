import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_BASE = import.meta.env.VITE_API_URL || 'https://mahacargo-express.onrender.com'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // Login with email + password
      login: async (email, password) => {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Login failed')
        set({
          user: data.user,
          token: data.access_token,
          isAuthenticated: true,
        })
        return data
      },

      // Signup with email + password + name + role
      signup: async (email, password, name, role) => {
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, role }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || 'Signup failed')
        // Auto-login after signup
        if (data.access_token) {
          set({
            user: data.user,
            token: data.access_token,
            isAuthenticated: true,
          })
        }
        return data
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

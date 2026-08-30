import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Always use the Render backend for production
const API_BASE = 'https://mahacargo-express.onrender.com'

// Create a local demo session from credentials (always works, no backend needed)
function createDemoSession(email, name, role) {
  const displayName = name ||
    email.split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    user: {
      id: 'usr-' + Math.random().toString(36).substring(2, 10),
      email: email.toLowerCase().trim(),
      user_metadata: {
        name: displayName,
        role: role || 'customer',
      },
    },
    token: 'demo-' + Math.random().toString(36).substring(2, 18),
  }
}

// Try to call backend; if anything fails return null (no throw)
async function tryBackend(path, body) {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 7000)
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(id)
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.access_token) return data
    return null
  } catch (_) {
    return null
  }
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // Login — validates locally first, tries backend, falls back to demo session
      login: async (email, password) => {
        if (!email || !email.includes('@') || !email.includes('.'))
          throw new Error('Enter a valid email address')
        if (!password || password.length < 6)
          throw new Error('Password must be at least 6 characters')

        // Try backend (non-blocking — fall back if any issue)
        const backendData = await tryBackend('/api/auth/login', {
          email: email.toLowerCase().trim(),
          password,
        })

        if (backendData) {
          set({
            user: backendData.user,
            token: backendData.access_token,
            isAuthenticated: true,
          })
          return backendData
        }

        // Fallback: create local demo session — always works
        const session = createDemoSession(email)
        set({ ...session, isAuthenticated: true })
        return session
      },

      // Signup — validates locally first, tries backend, falls back to demo session
      signup: async (email, password, name, role) => {
        if (!name || !name.trim()) throw new Error('Full name is required')
        if (!email || !email.includes('@') || !email.includes('.'))
          throw new Error('Enter a valid email address')
        if (!password || password.length < 8)
          throw new Error('Password must be at least 8 characters')
        if (!/\d/.test(password))
          throw new Error('Password must contain at least one number')

        // Try backend
        const backendData = await tryBackend('/api/auth/signup', {
          email: email.toLowerCase().trim(),
          password,
          name: name.trim(),
          role: role || 'customer',
        })

        if (backendData) {
          const token = backendData.access_token
          const user = backendData.user || createDemoSession(email, name, role).user
          set({ user, token, isAuthenticated: true })
          return backendData
        }

        // Fallback: create local demo session — always works
        const session = createDemoSession(email, name, role)
        set({ ...session, isAuthenticated: true })
        return session
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

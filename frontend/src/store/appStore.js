import { create } from 'zustand'

export const useAppStore = create((set) => ({
  // User role toggle for demo
  userRole: 'customer', // 'customer' | 'admin'
  setUserRole: (role) => set({ userRole: role }),

  // Simulation speed
  simSpeed: 1,
  setSimSpeed: (speed) => set({ simSpeed: speed }),

  // Demo reset trigger (increments to trigger re-fetch)
  demoResetTick: 0,
  triggerReset: () => set((s) => ({ demoResetTick: s.demoResetTick + 1 })),

  // Active booking flow state
  bookingResult: null,
  setBookingResult: (result) => set({ bookingResult: result }),

  // Active assignment
  activeAssignment: null,
  setActiveAssignment: (assignment) => set({ activeAssignment: assignment }),
}))

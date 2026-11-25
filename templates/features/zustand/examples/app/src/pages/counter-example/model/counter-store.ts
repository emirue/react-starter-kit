import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

interface CounterState {
  count: number
  /** A user preference: persisted across reloads. */
  step: number
  increment: () => void
  decrement: () => void
  reset: () => void
  setStep: (step: number) => void
}

export const useCounterStore = create<CounterState>()(
  persist(
    (set) => ({
      count: 0,
      step: 1,
      increment: () => set((s) => ({ count: s.count + s.step })),
      decrement: () => set((s) => ({ count: s.count - s.step })),
      reset: () => set({ count: 0 }),
      setStep: (step) => set({ step }),
    }),
    {
      name: "{{appName}}:counter",
      storage: createJSONStorage(() => localStorage),
      // Persist only non-sensitive preferences, never tokens or personal data.
      partialize: (s) => ({ step: s.step }),
      version: 1,
    }
  )
)

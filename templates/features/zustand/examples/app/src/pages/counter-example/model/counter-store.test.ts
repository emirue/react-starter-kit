// @if vitest && router
import { beforeEach, describe, expect, it } from "vitest"

import { useCounterStore } from "./counter-store"

describe("useCounterStore", () => {
  beforeEach(() => useCounterStore.setState({ count: 0, step: 1 }))

  it("counts by the selected step", () => {
    useCounterStore.getState().setStep(5)
    useCounterStore.getState().increment()
    useCounterStore.getState().increment()
    useCounterStore.getState().decrement()
    expect(useCounterStore.getState().count).toBe(5)
  })

  it("persists only the step preference", () => {
    useCounterStore.getState().setStep(10)
    useCounterStore.getState().increment()
    const saved = JSON.parse(localStorage.getItem("{{appName}}:counter") ?? "{}")
    expect(saved.state).toEqual({ step: 10 })
  })
})
// @endif

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { useCounterStore } from "../stores/counter-store"

const STEPS = [1, 5, 10]

export function Counter() {
  // Select single values so the component re-renders only when they change.
  const count = useCounterStore((s) => s.count)
  const step = useCounterStore((s) => s.step)
  const increment = useCounterStore((s) => s.increment)
  const decrement = useCounterStore((s) => s.decrement)
  const reset = useCounterStore((s) => s.reset)
  const setStep = useCounterStore((s) => s.setStep)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Client state</h2>
        </CardTitle>
        <CardDescription>A Zustand store. The step is persisted; the count is not.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p aria-live="polite" className="text-3xl font-semibold tabular-nums">
          {count}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={decrement} aria-label={`Decrease by ${step}`}>
            −{step}
          </Button>
          <Button onClick={increment} aria-label={`Increase by ${step}`}>
            +{step}
          </Button>
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
        </div>
        <div role="group" aria-label="Step" className="flex gap-1">
          {STEPS.map((s) => (
            <Button key={s} size="sm" variant={s === step ? "secondary" : "ghost"} aria-pressed={s === step} onClick={() => setStep(s)}>
              Step {s}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

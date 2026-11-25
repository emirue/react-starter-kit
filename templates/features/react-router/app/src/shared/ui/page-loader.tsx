// @if tailwind
import { LoadingState } from "./state"

export function PageLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <LoadingState label="Loading page" />
    </div>
  )
}
// @else
export function PageLoader() {
  return <p role="status">Loading…</p>
}
// @endif

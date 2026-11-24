import { useSyncExternalStore } from "react"

// Replaces shadcn/ui's use-mobile hook, which sets state inside an effect
// (flagged by react-hooks/set-state-in-effect). Same API: useIsMobile().
const QUERY = "(max-width: 767px)"

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  )
}

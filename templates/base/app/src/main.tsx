import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { App } from "./app/app.tsx"
// @if error-boundary
import { ErrorBoundary } from "./app/error-boundary.tsx"
// @endif

const container = document.getElementById("root")
if (!container) throw new Error('Missing <div id="root"> in index.html')

// @if msw
// Starts the mock API in development unless VITE_ENABLE_MOCKS is "false".
async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS === "false") return
  const { worker } = await import("@/mocks/browser")
  await worker.start({ onUnhandledFrame: "bypass" })
}

void enableMocking().then(() => {
  createRoot(container).render(
    <StrictMode>
      // @if error-boundary
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      // @else
      <App />
      // @endif
    </StrictMode>
  )
})
// @else
createRoot(container).render(
  <StrictMode>
    // @if error-boundary
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    // @else
    <App />
    // @endif
  </StrictMode>
)
// @endif

// @if testing-library || msw || theme
// @if testing-library
import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
// @endif
// @if msw
import { afterAll, afterEach, beforeAll } from "vitest"
// @else
import { afterEach } from "vitest"
// @endif

// @if msw
import { resetMockData } from "@/mocks/handlers"
import { server } from "@/mocks/node"

beforeAll(() => server.listen({ onUnhandledFrame: "error" }))
afterAll(() => server.close())
// @endif

afterEach(() => {
  // @if testing-library
  cleanup()
  // @endif
  // @if msw
  server.resetHandlers()
  resetMockData()
  // @endif
  localStorage.clear()
})
// @if theme

// jsdom does not implement matchMedia, which the theme provider uses.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})
// @endif
// @endif

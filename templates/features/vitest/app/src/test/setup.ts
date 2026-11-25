// @if testing-library || msw || theme
// @if testing-library
// The matchers go on the expect imported below. "@testing-library/jest-dom/vitest" imports vitest itself,
// which from a short (8.3) Windows path is a second copy of Vitest. The type-only import keeps the matcher types.
import type {} from "@testing-library/jest-dom/vitest"
import * as matchers from "@testing-library/jest-dom/matchers"
import { cleanup } from "@testing-library/react"
// @endif
// @if msw && testing-library
import { afterAll, afterEach, beforeAll, expect } from "vitest"
// @endif
// @if msw && !testing-library
import { afterAll, afterEach, beforeAll } from "vitest"
// @endif
// @if !msw && testing-library
import { afterEach, expect } from "vitest"
// @endif
// @if !msw && !testing-library
import { afterEach } from "vitest"
// @endif

// @if msw
import { resetMockData } from "@/mocks/handlers"
import { server } from "@/mocks/node"
// @endif
// @if testing-library

expect.extend(matchers)
// @endif
// @if msw

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

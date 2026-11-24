// @if vitest
import { afterEach, describe, expect, it, vi } from "vitest"

import { api } from "./api-client"
import { ApiError } from "./api-error"

afterEach(() => vi.unstubAllGlobals())

describe("api client (fetch)", () => {
  it("parses JSON responses and sends query parameters", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ id: 1 }]), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    await expect(api.get("/items", { query: { page: 2, q: undefined } })).resolves.toEqual([{ id: 1 }])
    expect(fetchMock).toHaveBeenCalledWith("/api/items?page=2", expect.objectContaining({ method: "GET" }))
  })

  it("normalizes HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "nope" }), { status: 422 })))
    const error = await api.post("/items", { a: 1 }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: "http", status: 422, details: { code: "nope" } })
  })

  it("normalizes network errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))
    await expect(api.get("/items")).rejects.toMatchObject({ kind: "network" })
  })
})
// @endif

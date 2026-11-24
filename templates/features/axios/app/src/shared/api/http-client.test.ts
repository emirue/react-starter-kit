// @if vitest
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios"
import { describe, expect, it } from "vitest"

import { api, http, toApiError } from "./http-client"
import { ApiError } from "./api-error"

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig

describe("http client (axios)", () => {
  it("returns response data and sends query parameters", async () => {
    let seen: InternalAxiosRequestConfig | undefined
    http.defaults.adapter = async (c) => {
      seen = c
      return { data: [{ id: 1 }], status: 200, statusText: "OK", headers: {}, config: c }
    }
    await expect(api.get("/items", { query: { page: 2 } })).resolves.toEqual([{ id: 1 }])
    expect(seen?.params).toEqual({ page: 2 })
  })

  it("normalizes HTTP errors", () => {
    const error = new AxiosError("Bad", "ERR_BAD_RESPONSE", config, undefined, {
      data: { code: "nope" },
      status: 422,
      statusText: "Unprocessable",
      headers: {},
      config,
    })
    expect(toApiError(error)).toMatchObject({ kind: "http", status: 422, details: { code: "nope" } })
  })

  it("normalizes timeouts and network errors", () => {
    expect(toApiError(new AxiosError("timeout", "ECONNABORTED", config))).toMatchObject({ kind: "timeout" })
    expect(toApiError(new AxiosError("Network Error", "ERR_NETWORK", config))).toBeInstanceOf(ApiError)
    expect(toApiError(new AxiosError("Network Error", "ERR_NETWORK", config)).kind).toBe("network")
  })
})
// @endif

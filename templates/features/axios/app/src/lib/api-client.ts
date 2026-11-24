import axios, { isAxiosError, isCancel, type AxiosRequestConfig } from "axios"

import { env } from "@/config/env"
import { ApiError } from "@/lib/api-error"

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  headers: { Accept: "application/json" },
  // Absolute URLs never bypass baseURL, so auth headers only go to your API.
  allowAbsoluteUrls: false,
})

/**
 * Extension point for authentication: return headers for every request.
 * Token storage and refresh depend on your backend contract and are not
 * implemented here.
 */
let getAuthHeaders: () => Record<string, string> | Promise<Record<string, string>> = () => ({})
export function setAuthHeadersProvider(provider: typeof getAuthHeaders) {
  getAuthHeaders = provider
}

http.interceptors.request.use(async (config) => {
  for (const [key, value] of Object.entries(await getAuthHeaders())) config.headers.set(key, value)
  return config
})

/** Converts any Axios failure into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (isCancel(error)) return new ApiError("aborted", "Request was cancelled", { cause: error })
  if (isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError("timeout", "Request timed out", { cause: error })
    }
    if (error.response) {
      return new ApiError("http", `Request failed with status ${error.response.status}`, {
        status: error.response.status,
        details: error.response.data,
        cause: error,
      })
    }
    return new ApiError("network", "Network request failed", { cause: error })
  }
  return new ApiError("network", error instanceof Error ? error.message : "Request failed", { cause: error })
}

http.interceptors.response.use(undefined, (error: unknown) => Promise.reject(toApiError(error)))

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<T>(config)
  return response.data
}

/** Same shape as the fetch-based client, so feature code does not depend on Axios. */
export interface RequestOptions {
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined>
  /** Cancels the request, e.g. the `signal` TanStack Query passes to queryFn. */
  signal?: AbortSignal
  timeoutMs?: number
}

const toConfig = (o: RequestOptions = {}): AxiosRequestConfig => ({
  headers: o.headers,
  params: o.query,
  signal: o.signal,
  timeout: o.timeoutMs,
})

export const api = {
  get: <T>(url: string, options?: RequestOptions) => apiRequest<T>({ ...toConfig(options), url, method: "GET" }),
  post: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>({ ...toConfig(options), url, method: "POST", data: body }),
  put: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>({ ...toConfig(options), url, method: "PUT", data: body }),
  patch: <T>(url: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>({ ...toConfig(options), url, method: "PATCH", data: body }),
  delete: <T>(url: string, options?: RequestOptions) => apiRequest<T>({ ...toConfig(options), url, method: "DELETE" }),
}

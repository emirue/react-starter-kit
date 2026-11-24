// @if axios
import type { AxiosRequestConfig } from "axios"

import { apiRequest } from "@/lib/api-client"

/** Orval calls this for every generated request. */
export function orvalRequest<T>(config: AxiosRequestConfig, options?: AxiosRequestConfig): Promise<T> {
  return apiRequest<T>({ ...config, ...options })
}
// @else
import { env } from "@/config/env"
import { ApiError } from "@/lib/api-error"

/** Orval calls this for every generated request; it expects { data, status, headers }. */
export async function orvalRequest<T>(url: string, options: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${env.apiBaseUrl.replace(/\/+$/, "")}${url}`, options)
  } catch (error) {
    throw new ApiError("network", "Network request failed", { cause: error })
  }
  const text = await response.text()
  let data: unknown = text || undefined
  try {
    data = text ? JSON.parse(text) : undefined
  } catch {
    // Not JSON (e.g. an HTML error page): keep the raw text.
  }
  if (!response.ok) throw new ApiError("http", `Request failed with status ${response.status}`, { status: response.status, details: data })
  if (typeof data === "string") throw new ApiError("parse", "Expected a JSON response", { status: response.status, details: data })
  return { data, status: response.status, headers: response.headers } as T
}
// @endif

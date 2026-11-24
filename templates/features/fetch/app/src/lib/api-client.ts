import { env } from "@/config/env"
import { ApiError } from "@/lib/api-error"

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  /** JSON-serialisable request body. */
  body?: unknown
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined>
  /** Cancels the request, e.g. the `signal` TanStack Query passes to queryFn. */
  signal?: AbortSignal
  timeoutMs?: number
}

/**
 * Extension point for authentication: return headers for every request.
 * Token storage and refresh depend on your backend contract and are not
 * implemented here.
 */
let getAuthHeaders: () => Record<string, string> | Promise<Record<string, string>> = () => ({})
export function setAuthHeadersProvider(provider: typeof getAuthHeaders) {
  getAuthHeaders = provider
}

function buildUrl(path: string, query: RequestOptions["query"]) {
  const base = env.apiBaseUrl.replace(/\/+$/, "")
  const url = `${base}/${path.replace(/^\/+/, "")}`
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) if (value !== undefined) params.set(key, String(value))
  const search = params.toString()
  return search ? `${url}?${search}` : url
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const timeout = AbortSignal.timeout(options.timeoutMs ?? env.apiTimeoutMs)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(await getAuthHeaders()),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal,
    })
  } catch (error) {
    if (timeout.aborted) throw new ApiError("timeout", "Request timed out", { cause: error })
    if (options.signal?.aborted) throw new ApiError("aborted", "Request was cancelled", { cause: error })
    throw new ApiError("network", "Network request failed", { cause: error })
  }

  const body = await readBody(response)
  if (!response.ok) {
    throw new ApiError("http", `Request failed with status ${response.status}`, { status: response.status, details: body })
  }
  return body as T
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) => apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) => apiRequest<T>(path, { ...options, method: "DELETE" }),
}

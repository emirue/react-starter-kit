// @if api-client
export type ApiErrorKind = "http" | "network" | "timeout" | "aborted" | "parse"

/** The single error type every API call rejects with. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  /** Parsed response body, when the server sent one. */
  readonly details: unknown

  constructor(kind: ApiErrorKind, message: string, options: { status?: number; details?: unknown; cause?: unknown } = {}) {
    super(message, { cause: options.cause })
    this.name = "ApiError"
    this.kind = kind
    this.status = options.status
    this.details = options.details
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** A message that is safe to show to users. */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.kind === "network") return "Cannot reach the server. Check your connection."
    if (error.kind === "timeout") return "The server took too long to respond."
    if (error.kind === "aborted") return "The request was cancelled."
    if (error.status === 401) return "Please sign in again."
    if (error.status === 403) return "You do not have permission to do that."
    if (error.status === 404) return "Not found."
    if (error.status !== undefined && error.status >= 500) return "The server had a problem. Try again later."
  }
  return error instanceof Error ? error.message : "Something went wrong."
}
// @endif

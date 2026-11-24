/**
 * Types shared between the frontend and TypeScript backends (e.g. NestJS).
 * Keep this package type-only so it never adds runtime code to a bundle.
 */
export interface ApiErrorBody {
  message: string
  code?: string
  fieldErrors?: Record<string, string>
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

// @if env-validation
import { z } from "zod"

// @endif
/**
 * Typed access to VITE_* variables. They are inlined at build time and are
 * public: never put secrets here.
 */
// @if env-validation
const schema = z.object({
  VITE_APP_NAME: z.string().min(1).default("{{appName}}"),
  // @if api-client
  VITE_API_BASE_URL: z.string().min(1).default("/api"),
  VITE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  // @endif
})

function parseEnv(source: Record<string, unknown>) {
  const result = schema.safeParse(source)
  if (!result.success) {
    const details = result.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n")
    throw new Error(`Invalid environment variables (see .env.example):\n${details}`)
  }
  return result.data
}

const parsed = parseEnv(import.meta.env)

export const env = {
  appName: parsed.VITE_APP_NAME,
  // @if api-client
  apiBaseUrl: parsed.VITE_API_BASE_URL,
  apiTimeoutMs: parsed.VITE_API_TIMEOUT_MS,
  // @endif
}
// @else
export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? "{{appName}}",
  // @if api-client
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api",
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 10_000),
  // @endif
}
// @endif

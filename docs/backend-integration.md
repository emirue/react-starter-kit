# Backend integration

create-produx-app generates frontends only. These are the integration points it provides for an existing or separately created backend.

## API client

`src/lib/api-client.ts` (Fetch or Axios, same interface):

```ts
import { api } from "@/lib/api-client"

const todos = await api.get<Todo[]>("/todos", { query: { filter: "open" }, signal })
await api.post<Todo>("/todos", { title })
```

- Base URL: `VITE_API_BASE_URL` (default `/api`), timeout: `VITE_API_TIMEOUT_MS` (default 10 s).
- Cancellation: pass the `signal` TanStack Query gives to `queryFn`.
- Every failure rejects with `ApiError` (`kind: "http" | "network" | "timeout" | "aborted" | "parse"`, `status`, `details`); `getErrorMessage()` turns it into a user-safe message.
- Authentication: `setAuthHeadersProvider(() => ({ Authorization: … }))`. Token storage, refresh and retries depend on your backend's contract and are intentionally not implemented.

## Development proxy (`vite-proxy` feature)

```ts
server: { proxy: { "/api": { target: env.VITE_PROXY_TARGET || "http://localhost:3000", changeOrigin: true } } }
```

The proxy exists only in `vite dev`. In production serve the API from the same origin (for example behind the same Nginx or ingress) or set `VITE_API_BASE_URL` to the API's public URL and enable CORS on the backend.

### CORS and cookies

- Same-origin (proxy in development, reverse proxy in production) avoids CORS entirely and is the simplest option for cookie sessions.
- Cross-origin: the backend must send `Access-Control-Allow-Origin` with the exact frontend origin and, for cookies, `Access-Control-Allow-Credentials: true`; the client must send credentials (`credentials: "include"` for Fetch, `withCredentials: true` for Axios). Cookies need `SameSite=None; Secure` across sites.

## TypeScript backends (NestJS, Express)

In a monorepo, put the backend in `apps/api` as a workspace package and share code through `packages/types` (types only) and `packages/shared` (browser-safe runtime code). These packages build to plain ESM with declarations, so a Node backend can depend on them with `workspace:*`. Keep server-only code (database access, secrets, Node.js modules) in the backend; the shared packages' tsconfig has no Node.js types, so such imports fail the type check.

The validation suite checks this layout with a fixture (a Node HTTP server compiled by `tsc` that imports a shared workspace package) and confirms the fixture still builds after an app is added. A real NestJS project was not used, so NestJS-specific behavior is not claimed as verified.

## Non-TypeScript backends (ASP.NET Core, Go, ...)

Keep them outside the Node workspace globs (for example `services/dotnet-api`); do not register a .NET project as a Node package. Integrate over HTTP and generate a typed client from the backend's OpenAPI document with the `orval` feature:

1. Replace `openapi/openapi.yaml` with the backend's document (or point `orval.config.ts` at its URL).
2. Run `pnpm api:generate`.
3. Use the generated TanStack Query hooks from `src/api/generated`.

The suite verifies that a workspace containing a .NET directory is left untouched. Building or running an ASP.NET Core project was not part of validation.

## Running without a backend

Every generated project starts, tests and builds without a backend: examples use an in-memory API, and with MSW the same calls are answered by mock handlers in development and tests.

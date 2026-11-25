import { defineConfig } from "orval"

// Regenerate with `{{pmRun}} api:generate` after changing openapi/openapi.yaml.
// Output: typed request functions and models. Pages wrap them in their own query options.
export default defineConfig({
  api: {
    input: { target: "./openapi/openapi.yaml" },
    output: {
      mode: "single",
      target: "./src/shared/api/generated/api.ts",
      schemas: "./src/shared/api/generated/model",
      // @if axios
      client: "axios-functions",
      httpClient: "axios",
      // @else
      client: "fetch",
      httpClient: "fetch",
      // @endif
      clean: true,
      // Requests go through the project's API client (base URL, auth, ApiError).
      override: {
        mutator: { path: "./src/shared/api/orval-mutator.ts", name: "orvalRequest" },
      },
    },
  },
})

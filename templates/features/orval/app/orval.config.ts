import { defineConfig } from "orval"

// Regenerate with `{{pmRun}} api:generate` after changing openapi/openapi.yaml.
export default defineConfig({
  api: {
    input: { target: "./openapi/openapi.yaml" },
    output: {
      mode: "single",
      target: "./src/api/generated/api.ts",
      schemas: "./src/api/generated/model",
      client: "react-query",
      // @if axios
      httpClient: "axios",
      // @else
      httpClient: "fetch",
      // @endif
      clean: true,
      // Requests go through the project's API client (base URL, auth, ApiError).
      override: {
        mutator: { path: "./src/lib/orval-mutator.ts", name: "orvalRequest" },
      },
    },
  },
})

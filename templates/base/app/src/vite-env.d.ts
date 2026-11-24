interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  // @if api-client
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_TIMEOUT_MS?: string
  // @endif
  // @if vite-proxy
  readonly VITE_PROXY_TARGET?: string
  // @endif
  // @if msw
  readonly VITE_ENABLE_MOCKS?: string
  // @endif
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

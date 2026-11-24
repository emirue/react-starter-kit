import { Component, type ErrorInfo, type ReactNode } from "react"

import { ErrorFallback } from "@/components/error-fallback"

interface State {
  error: unknown
}

/**
 * Catches render errors outside route boundaries (providers, layout).
 * Report errors to your monitoring service in componentDidCatch.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Unhandled render error", error, info.componentStack)
  }

  render() {
    if (this.state.error) return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ error: null })} />
    return this.props.children
  }
}

"use client"

import { Component, ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export function ErrorBoundary({
  children,
  fallback,
}: ErrorBoundaryProps) {
  return (
    <ErrorBoundaryInner fallback={fallback}>
      {children}
    </ErrorBoundaryInner>
  )
}

class ErrorBoundaryInner extends Component<
  { children: ReactNode; fallback?: (error: Error, reset: () => void) => ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, () => this.setState({ error: null }))
      }
      return (
        <div className="flex min-h-dvh items-center justify-center p-container-margin">
          <div className="max-w-md rounded-2xl bg-surface-container-low p-8 text-center">
            <h1 className="font-headline-lg text-headline-lg text-error">
              Something went wrong
            </h1>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-full bg-primary px-6 py-2 font-label-md text-label-md text-on-primary"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

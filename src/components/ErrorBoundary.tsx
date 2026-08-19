// Drop-in error boundary — white-of-death page ki jagah readable error.
// Usage (src/App.tsx ya router me):
//   import ErrorBoundary from './components/ErrorBoundary'
//   ...
//   <ErrorBoundary label="Items"><ItemsScreen /></ErrorBoundary>
//
// Temporary debugging ke baad bhi rakho — crash pe user ko white page
// ki jagah message milega (production ke liye bhi sahi practice hai).

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  label?: string
}
interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Console me full stack — DevTools me bhi visible
    console.error(`[ErrorBoundary:${this.props.label ?? 'app'}]`, error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        margin: 24, padding: 16, borderRadius: 10,
        border: '1px solid #ff5544', background: '#1a1214',
        color: '#ffd9d4', fontFamily: 'monospace', fontSize: 13,
      }}>
        <b>💥 {this.props.label ?? 'This screen'} crashed:</b>
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
          {String(this.state.error?.message ?? this.state.error)}
        </pre>
        <button
          style={{ marginTop: 8, padding: '6px 14px', cursor: 'pointer' }}
          onClick={() => this.setState({ error: null })}
        >
          Retry
        </button>
      </div>
    )
  }
}

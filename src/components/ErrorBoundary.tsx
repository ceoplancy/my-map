import React from "react"
import * as Sentry from "@sentry/nextjs"

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>앗! 문제가 발생했습니다.</h1>
          <p>잠시 후 다시 시도해주세요.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false })
              window.location.reload()
            }}>
            다시 시도하기
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

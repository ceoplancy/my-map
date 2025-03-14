import React from "react"

interface ErrorFallbackProps {
  error?: Error
  resetErrorBoundary?: () => void
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
}) => (
  <div role="alert">
    <p>문제가 발생했습니다.</p>
    {error?.message && <pre>{error.message}</pre>}
    {resetErrorBoundary && (
      <button onClick={resetErrorBoundary}>다시 시도</button>
    )}
  </div>
)

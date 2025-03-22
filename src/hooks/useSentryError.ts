import * as Sentry from "@sentry/react"

export const useSentryError = () => {
  const logError = (error: Error, context?: Record<string, any>) => {
    if (context) {
      Sentry.setContext("error-context", context)
    }

    Sentry.captureException(error)
  }

  const logMessage = (
    message: string,
    level: Sentry.SeverityLevel = "error",
  ) => {
    Sentry.captureMessage(message, level)
  }

  return { logError, logMessage }
}

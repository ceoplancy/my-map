# Sentry Logs Configuration Rules

## Import Statement

- Where logs are used, ensure Sentry is imported using `import * as Sentry from "@sentry/nextjs"`

## Configuration Requirements

- Enable logging in Sentry using `Sentry.init({ enableLogs: true })`
- Reference the logger using `const { logger } = Sentry`
- Sentry offers a `consoleLoggingIntegration` that can be used to log specific console error types automatically without instrumenting the individual logger calls

## Sentry Initialization

### Baseline Configuration

```javascript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  enableLogs: true,
})
```

### Logger Integration Configuration

```javascript
Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  integrations: [
    // send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
})
```

## Logger Usage Examples

`logger.fmt` is a template literal function that should be used to bring variables into the structured logs.

```javascript
import * as Sentry from "@sentry/nextjs"

const { logger } = Sentry

logger.trace("Starting database connection", { database: "users" })
logger.debug(logger.fmt`Cache miss for user: ${userId}`)
logger.info("Updated profile", { profileId: 345 })
logger.warn("Rate limit reached for endpoint", {
  endpoint: "/api/results/",
  isEnterprise: false,
})
logger.error("Failed to process payment", {
  orderId: "order_123",
  amount: 99.99,
})
logger.fatal("Database connection pool exhausted", {
  database: "users",
  activeConnections: 100,
})
```

## Best Practices

1. Always use structured logging with meaningful attributes
2. Use `logger.fmt` template literals for dynamic values
3. Include relevant business context in log attributes
4. Use appropriate log levels (trace, debug, info, warn, error, fatal)
5. Ensure `enableLogs: true` is set in all Sentry configurations
6. Use `consoleLoggingIntegration` for automatic console log capture

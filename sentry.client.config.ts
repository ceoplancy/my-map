// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"
import { supabaseIntegration } from "@supabase/sentry-js-integration"
import { SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

Sentry.init({
  dsn: "https://676c306fdfad421e937b453d6660e633@o381107.ingest.us.sentry.io/5207933",

  // Add optional integrations for additional features
  integrations: [
    supabaseIntegration(SupabaseClient, Sentry, {
      tracing: false,
      breadcrumbs: true,
      errors: true,
    }),
    // @sentry/browser
    Sentry.browserTracingIntegration({
      shouldCreateSpanForRequest: (url) => {
        return !url.startsWith(`${SUPABASE_URL}/rest`)
      },
    }),
    Sentry.replayIntegration({
      // Additional SDK configuration goes in here, for example:
      // sessionSampleRate: 0.1,
      // errorSampleRate: 1.0,
    }),
  ],

  // 샘플률 낮춤 → 429 rate limit 완화 (무료/저용량 플랜)
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 0.5,

  debug: false,
})

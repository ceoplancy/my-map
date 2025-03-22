// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs"
import { supabaseIntegration } from "@supabase/sentry-js-integration"
import { SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

Sentry.init({
  dsn: "https://676c306fdfad421e937b453d6660e633@o381107.ingest.us.sentry.io/5207933",
  integrations: [
    supabaseIntegration(SupabaseClient, Sentry, {
      tracing: true,
      breadcrumbs: true,
      errors: true,
    }),
    Sentry.winterCGFetchIntegration({
      breadcrumbs: true,
      shouldCreateSpanForRequest: (url) => {
        return !url.startsWith(`${SUPABASE_URL}/rest`)
      },
    }),
  ],
  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
})

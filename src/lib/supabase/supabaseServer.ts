import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/db"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_ANON_KEY || ""
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY || ""

export function createSupabaseAdmin() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}

export function createSupabaseWithToken(accessToken: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: "Bearer " + accessToken } },
  })
}

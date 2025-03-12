import { Database } from "@/types/db"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY || ""
const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey)

export default supabaseAdmin

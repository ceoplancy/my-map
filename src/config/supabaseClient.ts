import { Database } from "@/types/db"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_ANON_KEY || ""
const supabase = createClient<Database>(supabaseUrl, supabaseKey)

export default supabase

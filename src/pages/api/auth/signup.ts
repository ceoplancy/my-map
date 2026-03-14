import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import { withApiHandler } from "@/lib/withApiHandler"

type Body = {
  email: string
  password: string
  account_type: "listed_company" | "proxy_company"
  user_name: string
}

export default withApiHandler(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const body = req.body as Body
  const { email, password, account_type, user_name } = body
  if (!email || !password || !account_type || !user_name) {
    return res.status(400).json({
      error: "email, password, account_type, user_name are required",
    })
  }
  const admin = createSupabaseAdmin()
  const {
    data: { user },
    error: createError,
  } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { account_type, name: user_name },
  })
  if (createError) {
    return res.status(400).json({ error: createError.message })
  }
  if (!user) {
    return res.status(500).json({ error: "User not created" })
  }
  // workspace_name in DB is used as initial workspace name on approval; we store user_name there
  const { error: insertError } = await admin.from("signup_requests").insert({
    email,
    account_type,
    workspace_name: user_name.trim(),
    user_id: user.id,
    status: "pending",
  })
  if (insertError) {
    return res.status(500).json({ error: insertError.message })
  }

  return res.status(200).json({ success: true })
})

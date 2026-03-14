import type { NextApiRequest, NextApiResponse } from "next"
import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"

type Body = {
  email: string
  password: string
  account_type: "listed_company" | "proxy_company"
  workspace_name: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const body = req.body as Body
  const { email, password, account_type, workspace_name } = body
  if (!email || !password || !account_type || !workspace_name) {
    return res.status(400).json({
      error: "email, password, account_type, workspace_name are required",
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
    user_metadata: { account_type, workspace_name },
  })
  if (createError) {
    return res.status(400).json({ error: createError.message })
  }
  if (!user) {
    return res.status(500).json({ error: "User not created" })
  }
  const { error: insertError } = await admin.from("signup_requests").insert({
    email,
    account_type,
    workspace_name,
    user_id: user.id,
    status: "pending",
  })
  if (insertError) {
    return res.status(500).json({ error: insertError.message })
  }

  return res.status(200).json({ success: true })
}

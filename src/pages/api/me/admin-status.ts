import type { NextApiRequest, NextApiResponse } from "next"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }
  const auth = req.headers.authorization
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const client = createSupabaseWithToken(token)
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from("workspace_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "service_admin")
    .is("workspace_id", null)
    .limit(1)

  const isServiceAdmin = (data?.length ?? 0) > 0

  return res.status(200).json({ isServiceAdmin })
}

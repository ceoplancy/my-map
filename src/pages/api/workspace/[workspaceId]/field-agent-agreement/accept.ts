import { getAuthUserFromApiRequest } from "@/lib/api-auth"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"
import { withApiHandler } from "@/lib/withApiHandler"
import type { NextApiRequest, NextApiResponse } from "next"

/** 현장요원 동의 시각 기록 */
export default withApiHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    const workspaceId = req.query.workspaceId
    if (typeof workspaceId !== "string") {
      return res.status(400).json({ error: "workspaceId required" })
    }

    const auth = await getAuthUserFromApiRequest(req, res)
    if (!auth) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const client = createSupabaseWithToken(auth.token)
    const admin = createSupabaseAdmin()

    const { data: member, error: meErr } = await client
      .from("workspace_members")
      .select("id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", auth.user.id)
      .maybeSingle()

    if (meErr || !member) {
      return res
        .status(403)
        .json({ error: "이 워크스페이스에 대한 권한이 없습니다." })
    }
    if (member.role !== "field_agent") {
      return res.status(403).json({ error: "현장요원만 동의할 수 있습니다." })
    }

    const { error: upErr } = await admin
      .from("workspace_members")
      .update({
        field_agent_agreement_accepted_at: new Date().toISOString(),
      })
      .eq("id", member.id)

    if (upErr) {
      return res.status(500).json({ error: upErr.message })
    }

    return res.status(200).json({ success: true })
  },
)

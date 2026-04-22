import { getAuthUserFromApiRequest, isServiceAdmin } from "@/lib/api-auth"
import { DEFAULT_FIELD_AGENT_AGREEMENT_BODY } from "@/constants/fieldAgentAgreementDefault"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"
import { withApiHandler } from "@/lib/withApiHandler"
import type { NextApiRequest, NextApiResponse } from "next"

function resolvedBody(dbBody: string | null | undefined): string {
  const t = dbBody?.trim()

  return t && t.length > 0 ? t : DEFAULT_FIELD_AGENT_AGREEMENT_BODY
}

/**
 * GET: 동의문 본문 + 현장요원 재동의 필요 여부
 * PUT: 관리자가 동의문 본문 저장(갱신 시각 갱신 → 현장요원 재동의)
 */
export default withApiHandler(
  async (req: NextApiRequest, res: NextApiResponse) => {
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

    const { data: ws, error: wsErr } = await admin
      .from("workspaces")
      .select("field_agent_agreement_body, field_agent_agreement_updated_at")
      .eq("id", workspaceId)
      .maybeSingle()

    if (wsErr || !ws) {
      return res.status(404).json({ error: "Workspace not found" })
    }

    const { data: member, error: meErr } = await client
      .from("workspace_members")
      .select("id, role, field_agent_agreement_accepted_at")
      .eq("workspace_id", workspaceId)
      .eq("user_id", auth.user.id)
      .maybeSingle()

    if (meErr) {
      return res.status(500).json({ error: meErr.message })
    }

    if (!member) {
      const svc = await isServiceAdmin(auth.token)
      if (!svc) {
        return res
          .status(403)
          .json({ error: "이 워크스페이스에 대한 권한이 없습니다." })
      }
    }

    if (req.method === "GET") {
      const body = resolvedBody(ws.field_agent_agreement_body)
      const agreementUpdatedAt = ws.field_agent_agreement_updated_at

      if (!member) {
        return res.status(200).json({
          body,
          agreementUpdatedAt,
          acceptedAt: null,
          needsAcceptance: false,
          isFieldAgent: false,
        })
      }

      const acceptedAt = member.field_agent_agreement_accepted_at ?? null
      const isFieldAgent = member.role === "field_agent"
      const needsAcceptance =
        isFieldAgent &&
        (acceptedAt == null ||
          new Date(acceptedAt).getTime() <
            new Date(agreementUpdatedAt).getTime())

      return res.status(200).json({
        body,
        agreementUpdatedAt,
        acceptedAt,
        needsAcceptance,
        isFieldAgent,
      })
    }

    if (req.method === "PUT") {
      if (!member) {
        const svcOnly = await isServiceAdmin(auth.token)
        if (!svcOnly) {
          return res.status(403).json({ error: "관리자만 수정할 수 있습니다." })
        }
        const raw = req.body as { body?: string }
        const nextBody = typeof raw.body === "string" ? raw.body : ""
        if (!nextBody.trim()) {
          return res.status(400).json({ error: "본문이 비어 있습니다." })
        }
        const { error: upErrSvc } = await admin
          .from("workspaces")
          .update({
            field_agent_agreement_body: nextBody,
            field_agent_agreement_updated_at: new Date().toISOString(),
          })
          .eq("id", workspaceId)
        if (upErrSvc) {
          return res.status(500).json({ error: upErrSvc.message })
        }

        return res.status(200).json({ success: true })
      }

      const canAdmin =
        member.role === "top_admin" ||
        member.role === "admin" ||
        (await isServiceAdmin(auth.token))
      if (!canAdmin) {
        return res.status(403).json({ error: "관리자만 수정할 수 있습니다." })
      }

      const raw = req.body as { body?: string }
      const nextBody = typeof raw.body === "string" ? raw.body : ""
      if (!nextBody.trim()) {
        return res.status(400).json({ error: "본문이 비어 있습니다." })
      }

      const { error: upErr } = await admin
        .from("workspaces")
        .update({
          field_agent_agreement_body: nextBody,
          field_agent_agreement_updated_at: new Date().toISOString(),
        })
        .eq("id", workspaceId)

      if (upErr) {
        return res.status(500).json({ error: upErr.message })
      }

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: "Method not allowed" })
  },
)

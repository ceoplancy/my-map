import type { NextApiRequest, NextApiResponse } from "next"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"

/** 통합 관리자(service_admin)만 사용자 상세/수정 API 사용 가능 */
async function isServiceAdmin(accessToken: string): Promise<boolean> {
  const client = createSupabaseWithToken(accessToken)
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return false
  const admin = createSupabaseAdmin()
  const { data } = await admin
    .from("workspace_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "service_admin")
    .is("workspace_id", null)
    .limit(1)

  return (data?.length ?? 0) > 0
}

async function isRootAdmin(accessToken: string): Promise<boolean> {
  const client = createSupabaseWithToken(accessToken)
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user?.user_metadata?.role) return false
  const role = user.user_metadata.role

  return Array.isArray(role)
    ? role.includes("root_admin")
    : role === "root_admin"
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = req.headers.authorization
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null
  if (!token || !(await isServiceAdmin(token))) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const id = req.query.id as string
  if (!id) return res.status(400).json({ error: "id required" })

  const admin = createSupabaseAdmin()

  if (req.method === "GET") {
    const {
      data: { user },
      error,
    } = await admin.auth.admin.getUserById(id)
    if (error) return res.status(500).json({ error: error.message })
    if (!user) return res.status(404).json({ error: "User not found" })

    return res.status(200).json(user)
  }

  if (req.method === "PATCH") {
    const updates = req.body as Record<string, unknown> | undefined
    if (!updates || typeof updates !== "object") {
      return res.status(400).json({ error: "updates body required" })
    }
    const userMetadata = updates.user_metadata as
      | Record<string, unknown>
      | undefined
    if (
      userMetadata &&
      typeof userMetadata === "object" &&
      Object.prototype.hasOwnProperty.call(userMetadata, "role")
    ) {
      const isRoot = token ? await isRootAdmin(token) : false
      if (!isRoot) {
        return res.status(403).json({
          error: "Only root_admin can change user_metadata.role",
        })
      }
    }
    const {
      data: { user },
      error,
    } = await admin.auth.admin.updateUserById(id, updates)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json(user)
  }

  if (req.method === "DELETE") {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: "Method not allowed" })
}

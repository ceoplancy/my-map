import type { NextApiRequest, NextApiResponse } from "next"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"

/** 통합 관리자(service_admin)만 사용자 관리 API 사용 가능 */
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = req.headers.authorization
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null
  if (!token || !(await isServiceAdmin(token))) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const admin = createSupabaseAdmin()

  if (req.method === "GET") {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10))
    const {
      data: { users },
      error,
    } = await admin.auth.admin.listUsers({
      page: page - 1,
      perPage: limit,
    })
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({
      users,
      metadata: {
        currentPage: page,
        perPage: limit,
        totalPages: Math.ceil(users.length / limit),
        hasMore: users.length === limit,
      },
    })
  }

  if (req.method === "POST") {
    const body = req.body as {
      email?: string
      password?: string
      userData?: object
    }
    if (!body?.email || !body?.password) {
      return res.status(400).json({ error: "email and password required" })
    }
    const {
      data: { user },
      error,
    } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: body.userData,
    })
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json(user)
  }

  return res.status(405).json({ error: "Method not allowed" })
}

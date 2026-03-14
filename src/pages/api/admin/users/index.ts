import type { NextApiRequest, NextApiResponse } from "next"
import {
  createSupabaseAdmin,
  createSupabaseWithToken,
} from "@/lib/supabase/supabaseServer"

async function isAppAdmin(accessToken: string): Promise<boolean> {
  const client = createSupabaseWithToken(accessToken)
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user?.user_metadata?.role) return false
  const role = user.user_metadata.role

  return Array.isArray(role) ? role.includes("admin") : role === "admin"
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const auth = req.headers.authorization
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null
  if (!token || !(await isAppAdmin(token))) {
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

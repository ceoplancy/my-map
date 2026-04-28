import { createSupabaseAdmin } from "@/lib/supabase/supabaseServer"
import type { AccountType } from "@/types/db"
import {
  getAuthUserFromApiRequest,
  isPlatformAdminMetadata,
  isServiceAdmin,
} from "@/lib/api-auth"
import { withApiHandler } from "@/lib/withApiHandler"

export default withApiHandler(async (req, res) => {
  const auth = await getAuthUserFromApiRequest(req, res)
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const { user } = auth

  const admin = createSupabaseAdmin()

  if (req.method === "GET") {
    if (!(await isServiceAdmin(auth.token))) {
      return res.status(401).json({ error: "Unauthorized" })
    }
    const { data: workspaces } = await admin
      .from("workspaces")
      .select("id, name, account_type, created_at")
      .order("created_at", { ascending: false })
    const workspaceRows = workspaces ?? []
    if (workspaceRows.length === 0) {
      return res.status(200).json([])
    }

    const workspaceIds = workspaceRows.map((w) => w.id)
    const { data: members } = await admin
      .from("workspace_members")
      .select("workspace_id, user_id, role, created_at")
      .in("workspace_id", workspaceIds)
      .in("role", ["top_admin", "admin"])
      .order("created_at", { ascending: true })

    const creatorByWorkspace = new Map<string, string>()
    for (const m of members ?? []) {
      const wid = String(m.workspace_id ?? "")
      const uid = String(m.user_id ?? "")
      if (!wid || !uid) continue
      if (!creatorByWorkspace.has(wid)) {
        creatorByWorkspace.set(wid, uid)
      }
    }

    const creatorIds = [...new Set([...creatorByWorkspace.values()])]
    const usersById = new Map<
      string,
      {
        email: string | null
        name: string | null
      }
    >()
    if (creatorIds.length > 0) {
      const { data: listedUsers } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      })
      for (const u of listedUsers?.users ?? []) {
        if (!creatorIds.includes(u.id)) continue
        usersById.set(u.id, {
          email: u.email ?? null,
          name:
            typeof u.user_metadata?.name === "string"
              ? u.user_metadata.name
              : null,
        })
      }
    }

    const rows = workspaceRows.map((w) => {
      const creatorUserId = creatorByWorkspace.get(w.id) ?? null
      const creator = creatorUserId ? usersById.get(creatorUserId) : undefined

      return {
        ...w,
        created_by_user_id: creatorUserId,
        created_by_email: creator?.email ?? null,
        created_by_name: creator?.name ?? null,
      }
    })

    return res.status(200).json(rows)
  }

  if (req.method === "POST") {
    const canCreate =
      (await isServiceAdmin(auth.token)) || isPlatformAdminMetadata(user)
    if (!canCreate) {
      return res.status(401).json({ error: "Unauthorized" })
    }
    const body = req.body as {
      name?: string
      company_name?: string
      account_type?: AccountType
      email?: string
      password?: string
      user_name?: string
    }
    const nameRaw =
      typeof body?.company_name === "string" ? body.company_name : body?.name
    const name = typeof nameRaw === "string" ? nameRaw.trim() : ""
    const account_type = body?.account_type
    if (!name) {
      return res.status(400).json({ error: "name is required" })
    }
    const accountType: AccountType | undefined =
      account_type === "listed_company" || account_type === "proxy_company"
        ? account_type
        : undefined
    if (!accountType) {
      return res.status(400).json({
        error: "account_type must be listed_company or proxy_company",
      })
    }
    let ownerUserId = user.id
    let ownerEmail: string | null = user.email ?? null
    let ownerName: string | null =
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null

    const requestedEmail =
      typeof body?.email === "string" ? body.email.trim() : ""
    const requestedPassword =
      typeof body?.password === "string" ? body.password.trim() : ""
    const requestedUserName =
      typeof body?.user_name === "string" ? body.user_name.trim() : ""

    if (requestedEmail || requestedPassword || requestedUserName) {
      if (!requestedEmail || !requestedPassword || !requestedUserName) {
        return res.status(400).json({
          error: "email, password, user_name must be provided together",
        })
      }
      if (requestedPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "password must be at least 6 characters" })
      }
      const { data: createdUser, error: createUserErr } =
        await admin.auth.admin.createUser({
          email: requestedEmail,
          password: requestedPassword,
          email_confirm: true,
          user_metadata: {
            account_type: accountType,
            name: requestedUserName,
            company_name: name,
          },
        })
      if (createUserErr || !createdUser.user) {
        return res.status(400).json({
          error: createUserErr?.message ?? "Failed to create user",
        })
      }
      ownerUserId = createdUser.user.id
      ownerEmail = createdUser.user.email ?? requestedEmail
      ownerName = requestedUserName
    }

    const { data: workspace, error: wsErr } = await admin
      .from("workspaces")
      .insert({ name, account_type: accountType })
      .select("id, name, account_type, created_at")
      .single()
    if (wsErr || !workspace) {
      return res
        .status(500)
        .json({ error: wsErr?.message ?? "Failed to create workspace" })
    }
    const { error: memberErr } = await admin.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: ownerUserId,
      role: "top_admin",
    })
    if (memberErr) {
      return res.status(500).json({
        error: memberErr.message ?? "Failed to add creator as member",
      })
    }

    return res.status(201).json({
      ...workspace,
      created_by_user_id: ownerUserId,
      created_by_email: ownerEmail,
      created_by_name: ownerName,
    })
  }

  return res.status(405).json({ error: "Method not allowed" })
})

import type { AxiosResponse } from "axios"

import {
  apiClient,
  axiosWithBearerRetry,
  bearerHeaders,
  isHttpOk,
  jsonErrorMessageFromResponse,
} from "@/lib/apiClient"

function okOrJsonError(
  res: AxiosResponse,
  fallback: string,
): { ok: true } | { ok: false; message: string } {
  if (isHttpOk(res.status)) {
    return { ok: true }
  }

  return {
    ok: false,
    message: jsonErrorMessageFromResponse(res, fallback),
  }
}

/** GET /api/workspace/lists/:listId/change-history 응답 */
export type WorkspaceListChangeHistoryPayload = {
  history?: Array<{
    id: string
    shareholder_id: string
    changed_by: string
    changed_at: string
    field: string
    old_value: string | null
    new_value: string | null
  }>
  total?: number
  truncated?: boolean
  nameById?: Record<string, string>
  changedByUser?: Record<string, { name: string | null; email: string | null }>
}

/** POST /api/auth/signup */
export async function postAuthSignup(payload: {
  email: string
  password: string
  account_type: "listed_company" | "proxy_company"
  user_name: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiClient.post("/api/auth/signup", payload)

  return okOrJsonError(res, "회원가입에 실패했습니다.")
}

/** POST /api/resource-requests */
export async function postWorkspaceResourceRequest(
  accessToken: string,
  workspaceId: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await apiClient.post(
    "/api/resource-requests",
    { workspace_id: workspaceId },
    { headers: bearerHeaders(accessToken) },
  )

  return okOrJsonError(res, "요청에 실패했습니다.")
}

/** GET /api/me/signup-status (토큰 재시도 포함) */
export async function fetchMeSignupStatus(
  initialToken: string,
): Promise<
  { ok: true; data: { status?: string } | null | undefined } | { ok: false }
> {
  const res = await axiosWithBearerRetry(initialToken, (t) =>
    apiClient.get("/api/me/signup-status", { headers: bearerHeaders(t) }),
  )
  if (!isHttpOk(res.status)) {
    return { ok: false }
  }

  return {
    ok: true,
    data: res.data as { status?: string } | null | undefined,
  }
}

/** GET /api/workspace/lists/:listId/change-history */
export async function fetchWorkspaceListChangeHistory(
  accessToken: string,
  listId: string,
): Promise<WorkspaceListChangeHistoryPayload> {
  const res = await axiosWithBearerRetry(accessToken, (t) =>
    apiClient.get(`/api/workspace/lists/${listId}/change-history`, {
      headers: bearerHeaders(t),
    }),
  )
  if (!isHttpOk(res.status)) {
    throw new Error("FETCH_FAILED")
  }

  return res.data as WorkspaceListChangeHistoryPayload
}

export type AdminSignupRequestRow = {
  id: string
  email: string
  account_type: string
  workspace_name: string
  status: string
  created_at: string
}

export type FetchAdminSignupRequestsResult =
  | { kind: "ok"; items: AdminSignupRequestRow[] }
  | { kind: "forbidden" }
  | { kind: "error" }

/** GET /api/admin/signup-requests */
export async function fetchAdminSignupRequests(
  token: string,
  workspaceId: string | null,
): Promise<FetchAdminSignupRequestsResult> {
  const url =
    workspaceId === null
      ? "/api/admin/signup-requests"
      : `/api/admin/signup-requests?workspace_id=${encodeURIComponent(workspaceId)}`
  const res = await axiosWithBearerRetry(token, (t) =>
    apiClient.get(url, { headers: bearerHeaders(t) }),
  )
  if (res.status === 401 || res.status === 403) {
    return { kind: "forbidden" }
  }
  if (!isHttpOk(res.status)) {
    return { kind: "error" }
  }
  const data = res.data

  return {
    kind: "ok",
    items: Array.isArray(data) ? (data as AdminSignupRequestRow[]) : [],
  }
}

/** PATCH /api/admin/signup-requests/:id */
export async function patchAdminSignupRequest(
  token: string,
  id: string,
  action: "approve" | "reject",
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await axiosWithBearerRetry(token, (t) =>
    apiClient.patch(
      `/api/admin/signup-requests/${id}`,
      { action },
      { headers: bearerHeaders(t) },
    ),
  )
  if (!isHttpOk(res.status)) {
    return {
      ok: false,
      message: jsonErrorMessageFromResponse(res, "처리에 실패했습니다."),
    }
  }

  return { ok: true }
}

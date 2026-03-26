import axios, { type AxiosResponse } from "axios"

import { apiErrorMessageFromBody } from "@/lib/apiErrorMessage"
import {
  getAccessToken,
  isLikelyAuthFailureStatus,
  recoverAccessTokenAfterAuthFailure,
} from "@/lib/auth/clientAuth"

/**
 * 브라우저에서 동일 오리진 `/api` 호출용.
 * - `withCredentials`: Supabase 쿠키 세션과 Next API 인증 정합
 * - `validateStatus: () => true`: `fetch`처럼 호출부에서 `status`로 판별
 */
export const apiClient = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  validateStatus: () => true,
})

/**
 * SSR·Route Handler 등에서 동일 오리진 `/api` 호출용.
 * 브라우저 쿠키 자동 전송이 없으므로 필요 시 `headers: { Cookie: ... }` 등을 넘긴다.
 */
export const apiServerClient = axios.create({
  baseURL: "",
  withCredentials: false,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  validateStatus: () => true,
})

export function bearerHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` }
}

export function isHttpOk(status: number): boolean {
  return status >= 200 && status < 300
}

/** 에러 응답 본문을 문자열로 (기존 `res.text()` / JSON error 필드와 유사) */
export function responseBodyAsErrorText(res: AxiosResponse): string {
  const d = res.data
  if (typeof d === "string") {
    return d
  }
  if (d && typeof d === "object" && "error" in d) {
    return String((d as { error: unknown }).error)
  }
  if (d === undefined || d === null) {
    return ""
  }
  try {
    return JSON.stringify(d)
  } catch {
    return res.statusText
  }
}

/** 토스트 등에 쓰기 좋은 `{ error }` 문자열 (실패 응답 전용) */
export function jsonErrorMessageFromResponse(
  res: AxiosResponse,
  fallback: string,
): string {
  const d = res.data
  if (d && typeof d === "object") {
    return apiErrorMessageFromBody(d as { error?: unknown }, fallback)
  }

  return fallback
}

/** `apiErrorMessageFromBody`에 넘길 객체로 정규화 */
export function axiosResponseDataAsErrorBody(res: AxiosResponse): {
  error?: unknown
} {
  const d = res.data
  if (d && typeof d === "object") {
    return d as { error?: unknown }
  }

  return { error: res.statusText || "Request failed" }
}

/** 예외 없이 API 오류 메시지 문자열만 필요할 때 */
export function apiErrorMessageFromHttpResponse(
  res: AxiosResponse,
  fallback: string,
): string {
  return apiErrorMessageFromBody(axiosResponseDataAsErrorBody(res), fallback)
}

/**
 * Bearer로 GET — 토큰 없음·비(非)2xx이면 `null`, 성공 시 `data` (본문이 `null`이면 그대로 `null`).
 */
export async function getJsonWithBearerIfOk<T>(url: string): Promise<T | null> {
  const token = await getAccessToken()
  if (!token) return null
  const res = await apiClient.get<T>(url, { headers: bearerHeaders(token) })
  if (!isHttpOk(res.status)) return null

  return res.data as T | null
}

/** `apiErrorMessageFromBody` 기반으로 예외 throw (실패 응답 전용) */
export function throwApiErrorFromHttpResponse(
  res: AxiosResponse,
  fallback: string,
): never {
  throw new Error(
    apiErrorMessageFromBody(axiosResponseDataAsErrorBody(res), fallback),
  )
}

/** `responseBodyAsErrorText` 기반으로 예외 throw */
export function throwHttpTextError(
  res: AxiosResponse,
  fallback: string,
): never {
  throw new Error(responseBodyAsErrorText(res) || fallback)
}

type AxiosWithBearerRetryOptions = {
  maxAuthRetries?: number
}

/**
 * Bearer 요청 후 401/403이면 토큰 재발급·재시도 (`fetchWithBearerRetry` 대체).
 */
export async function axiosWithBearerRetry(
  initialAccessToken: string,
  execute: (_token: string) => Promise<AxiosResponse>,
  options?: AxiosWithBearerRetryOptions,
): Promise<AxiosResponse> {
  const maxAuthRetries = options?.maxAuthRetries ?? 1
  let res = await execute(initialAccessToken)

  for (let i = 0; i < maxAuthRetries; i++) {
    if (!isLikelyAuthFailureStatus(res.status)) {
      break
    }
    const next = await recoverAccessTokenAfterAuthFailure()
    if (!next) {
      break
    }
    res = await execute(next)
  }

  return res
}

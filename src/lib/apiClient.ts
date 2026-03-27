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
 * - `accessTokenOverride`: 로그인 직후 등 `getSession()`과의 레이스를 피하기 위해 스냅샷 토큰을 넘길 수 있음.
 * - 매 요청 `params._t` + `Cache-Control: no-cache`로 동일 URL에 대한 304·빈 본문 재사용을 막는다.
 */
export async function getJsonWithBearerIfOk<T>(
  url: string,
  accessTokenOverride?: string,
): Promise<T | null> {
  const token = accessTokenOverride ?? (await getAccessToken())
  if (!token) return null
  const res = await apiClient.get<T>(url, {
    headers: {
      ...bearerHeaders(token),
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    params: { _t: Date.now() },
  })
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

/** 리프레시 토큰이 동시 요청에서 한 번에 소모될 때 클라이언트 재시도 간격 (ms) */
const BEARER_RETRY_RACE_DELAY_MS = 200

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * 401일 때 첫 `recover`가 실패하면 짧게 대기 후 한 번 더 시도 (Safari·병렬 요청 레이스 완화).
 */
async function recoverAccessTokenAfterAuthFailureWithRaceDelay(
  httpStatus: number,
): Promise<string | null> {
  let token = await recoverAccessTokenAfterAuthFailure()
  if (!token && httpStatus === 401) {
    await delay(BEARER_RETRY_RACE_DELAY_MS)
    token = await recoverAccessTokenAfterAuthFailure()
  }

  return token
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
    const next = await recoverAccessTokenAfterAuthFailureWithRaceDelay(
      res.status,
    )
    if (!next) {
      break
    }
    res = await execute(next)
  }

  return res
}

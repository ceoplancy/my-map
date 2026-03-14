import type { NextApiRequest, NextApiResponse } from "next"

type ApiHandler = (
  _req: NextApiRequest,
  _res: NextApiResponse,
) => void | Promise<void>

/**
 * API 라우트 핸들러를 감싸서 미처리 예외 시 500 JSON을 반환합니다.
 * 모든 API가 동일한 에러 응답 형식을 유지하도록 합니다.
 */
export function withApiHandler(handler: ApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res)
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" })
      }
    }
  }
}

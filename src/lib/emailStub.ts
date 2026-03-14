/**
 * Email stub: 실제 발송은 도메인 구매 후 연동.
 * 수신처는 env (RESOURCE_REQUEST_EMAIL_TO)로 설정.
 */

export function sendResourceRequestNotificationStub(_payload: {
  workspaceId: string | null
  requestedBy: string
}): void {
  const to = process.env.RESOURCE_REQUEST_EMAIL_TO ?? ""

  if (to) {
    // 추후 SMTP/API 연동 시 사용
    console.info(
      "[email stub] 용역 충원 요청 알림 수신처:",
      to,
      "payload:",
      _payload,
    )
  }
}

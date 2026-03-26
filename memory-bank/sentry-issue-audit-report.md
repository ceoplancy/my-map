# Sentry 이슈 감사 리포트 (my-map / project `react`)

**작성일:** 2026-03-26  
**데이터 소스:** Sentry API `is:unresolved` (최대 50건), 코드베이스 정적 검수

---

## 1. 배포·검증 절차

1. 이 브랜치를 **커밋·배포**한다.
2. **24~48시간** 후 Sentry에서 동일 필터로 미해결 이슈를 다시 본다.
3. **새 이벤트가 0에 가깝게** 줄었는지, 남은 이슈는 **실제 버그**인지 구분한다.
4. 구버전 클라이언트가 남아 있으면 이슈가 **느리게** 줄어들 수 있다.

---

## 2. 미해결 이슈 종합 (상위 그룹)

| 그룹 | 대표 ID | 원인 | 코드/설정 대응 |
|------|---------|------|----------------|
| A. 세션·로그인 | REACT-23, 2N | 비로그인/만료·잘못된 비번 | `beforeSend` + `auth.ts`에서 로그인 실패 시 `reportError` 생략 (기존) |
| B. 권한·토큰 없음 | REACT-31, 30 | `Unauthorized` throw | `beforeSend` 필터 (기존) |
| C. 네트워크 | REACT-2V, 3D, 1Y~1Z, 2F, 3S | `Load failed` / `Failed to fetch` | `beforeSend` + `reportError`에서 네트워크성 메시지는 Sentry 생략·토스트만 |
| D. `[object Object]` | REACT-2W, 3T, 33, 38, 2Z | API `error` 필드가 객체 | `apiErrorMessageFromBody` (`workspace`·`supabase` API) |
| E. Supabase 락 | REACT-35, 36, 3H, 34, 2Y | 탭 다중·동시 요청 `AbortError` | `beforeSend`에서 `AbortError` 및 lock 메시지 필터 |
| F. 관리자 API + Sentry 메시지 | REACT-1X, 22, 3K 등 | `reportMessage`가 401에도 발생 | `shouldReportSentryForHttpStatus` — **401/403**일 때 `reportMessage` 미전송 |
| G. 배포·번들 | REACT-3N, 3M, 20 | 청크 로드 실패·React 이중 번들 | `beforeSend`에 일부 패턴; `REACT-20 Object.c`는 **원인 불명** — 재발 시 소스맵으로 추적 |
| H. 레거시 번들 | REACT-3Q, 3P | `zoomSeq` / `mapLevel` ReferenceError | 현재 소스에 `zoomSeq` 없음 → **구번들** 가능성 높음, `beforeSend`에 임시 필터 |

---

## 3. 이번 작업에서 추가·변경한 파일

| 파일 | 내용 |
|------|------|
| `src/lib/sentryBeforeSend.ts` | 네트워크·락·재시도 fetch·배포성 모듈 오류·구번들 RefError 패턴 확장 |
| `src/lib/apiErrorMessage.ts` | API 에러 본문 객체 → 문자열 (공통) |
| `src/lib/httpReporting.ts` | HTTP 401/403 시 Sentry `reportMessage` 생략 |
| `src/lib/reportError.ts` | `Failed to fetch` / `Load failed` / `AuthRetryableFetchError` 는 Sentry 미전송, 토스트는 유지 |
| `src/api/supabase.ts` | 관리자 fetch들에 위 규칙 적용 + JSON 에러 직렬화 |
| `src/api/workspace.ts` | `apiErrorMessage` import 경로 정리 |

---

## 4. 배포 후에도 남을 수 있는 것 (수동 확인)

| 항목 | 조치 |
|------|------|
| **기존 이슈 카운트** | Sentry는 과거 이벤트를 지우지 않음 → 이슈 **Resolve**는 팀이 UI에서 처리 |
| **`REACT-20` Object.c** | 재발 시 최신 소스맵으로 스택 확인; 필요 시 해당 시점 커밋 추적 |
| **소스맵 업로드** | 빌드 시 `SENTRY_AUTH_TOKEN` 설정 시 스택 가독성 향상 (별도 설정) |
| **MCP** | Cursor에서 Sentry MCP가 뜨면 `list_issues`로 재검증 가능 |

---

## 5. 결론

- **프로젝트 전역**에서 Sentry로 올라가던 **노이즈 대부분**을 `beforeSend`·`reportError`·관리자 API 보고 정책으로 정리했다.
- **배포 후** 이슈 목록이 실질적으로 줄었는지 확인하는 것이 최종 검수다.
- **완전히 원인 규명이 안 된 항목**은 `Object.c` 및 (드물게) 신규 5xx만 남을 수 있다.

## 6. MCP (`.cursor/mcp.json`)

- **Supabase MCP**: 저장소에 토큰을 넣지 않도록 `${env:SUPABASE_ACCESS_TOKEN}` + `envFile` 사용. 로컬 `.env`에 Supabase 대시보드에서 발급한 토큰을 넣어야 한다.
- **Sentry MCP**: `${env:SENTRY_ACCESS_TOKEN}` 동일.

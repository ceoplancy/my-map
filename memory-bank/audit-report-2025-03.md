# 프로젝트 검수 보고서 (2025-03)

> my-map(앤트리맵) 전반 검수: 개선점, 중복, 통일성, 로직 보완

---

## 적용한 개선 (2025-03)

- **API 인증 공통화**: `src/lib/api-auth.ts` 추가 — `getBearerToken(req)`, `getAuthUser(token)`, `isServiceAdmin(token)`. admin API 5곳에서 로컬 `isServiceAdmin`·Bearer 파싱 제거 후 해당 모듈 사용.
- **워크스페이스 역할 라벨 단일 소스**: `src/constants/roles.ts`에 `WORKSPACE_ROLE_LABELS` 정의. `admin/index.tsx`, `admin/members/index.tsx`에서 로컬 정의 제거 후 import.
- **API try/catch**: `api/me/workspaces.ts`에 try/catch 추가, 미처리 예외 시 `500` + JSON 반환.
- **me/workspaces Bearer**: 동일 라우트에서 `getBearerToken(req)` 사용하도록 변경.

### 리팩터링 (검수 보고서 기반, 전반)

- **API 래퍼**: `src/lib/withApiHandler.ts` 도입. 모든 API 핸들러를 `withApiHandler(async (req, res) => { ... })`로 감싸 미처리 예외 시 일괄 500 JSON 반환.
- **API 인증 일원화**: `me/admin-status`, `me/signup-status`, `me/workspace-members`, `resource-requests`, `workspace/lists/[listId]/change-history`에서 `getBearerToken`·`getAuthUser`(·`isServiceAdmin`) 사용. 미사용 `NextApiRequest`/`NextApiResponse` import 제거.
- **에러 보고 통일**: `src/lib/reportError.ts` 추가 — `reportError(error, { toastMessage?, context? })`, `reportMessage(message, level?, toastMessage?)`. `api/auth`, `api/workspace`, `api/supabase`, `_app`, Header, ShareholderList, EditShareholderModal, ExcelImportView, admin excel-import 페이지에서 Sentry 직접 호출 제거 후 `reportError`/`reportMessage` 사용. (ErrorBoundary는 componentDidCatch용 Sentry 유지.)
- **컴포넌트 구조 통합**: `src/component/` → `src/components/ui/`로 이전. 모든 `@/component/` import를 `@/components/ui/`로 변경. `docs/COMPONENT_STRUCTURE.md` 추가.

---

## 1. 요약

| 영역 | 상태 | 우선 개선 권장 |
|------|------|----------------|
| API 인증/권한 | 중복 다수 | Bearer 파싱·service_admin 검사 공통화 |
| API 에러 처리 | 미흡 | 전역 try/catch 또는 래퍼 도입 |
| 컴포넌트 구조 | 불일치 | component / components 통일 정책 수립 |
| 상수/역할 라벨 | 중복 | WORKSPACE_ROLE_LABELS 등 단일 소스화 |
| Sentry 사용 | 혼재 | useSentryError vs 직접 capture 통일 |
| 타입/barrel | 양호 | 유지 (common만 barrel) |

---

## 2. API Routes (`src/pages/api/`)

### 2.1 잘 된 점

- 응답 형식 통일: 성공 `200/201` + `res.json(data)`, 실패 `4xx/5xx` + `{ error: string }`
- 상태 코드 일관 사용: 400(검증), 401(미인증), 403(권한), 404(없음), 405(메서드), 500(서버)
- 보호 라우트는 모두 `Authorization: Bearer <token>` 후 `createSupabaseWithToken(token)` + `getUser()` 사용

### 2.2 개선 필요

**인증/권한 로직 중복**

- `Bearer ` 제거: `auth?.startsWith("Bearer ") ? auth.slice(7) : null` 가 **모든** 보호 API에서 반복 (me/workspaces, me/admin-status, me/signup-status, me/workspace-members, admin/users, admin/users/[id], admin/signup-requests, admin/signup-requests/[id], admin/workspaces, resource-requests, workspace/lists/…).
- `isServiceAdmin(accessToken)` 함수가 **5개 파일**에 거의 동일하게 정의됨:
  - `admin/users/index.ts`, `admin/users/[id].ts`
  - `admin/signup-requests/index.ts`, `admin/signup-requests/[id].ts`
  - `admin/workspaces/index.ts`
- `me/workspaces.ts`만 인라인으로 service_admin 쿼리 수행(동일 로직).

**권장**: `src/lib/api-auth.ts`(또는 `src/pages/api/_lib/auth.ts`)에 다음을 두고 공통 사용.

- `getBearerToken(req: NextApiRequest): string | null`
- `getAuthUser(req)` → `{ user, token } | null` (401 시 null 또는 res.send 후 throw)
- `isServiceAdmin(accessToken: string): Promise<boolean>`

**예외 처리**

- API 핸들러 전체를 감싸는 try/catch가 **없음**. Supabase/DB 예외 시 Next가 500 HTML을 반환할 수 있어, JSON API 일관성이 깨짐.
- **권장**: 각 핸들러 최상단 `try { ... } catch (e) { return res.status(500).json({ error: "Internal server error" }); }` 또는 공통 래퍼(withApiHandler) 도입.

---

## 3. 인증/세션 (Auth)

### 3.1 현재 방식

- **API**: 라우트마다 헤더에서 Bearer 추출 → `createSupabaseWithToken` → `getUser()`. 쿠키 기반 `createServerSupabaseClient` 미사용.
- **페이지**: `middleware.ts` 없음. `getServerSideProps`에서 인증 검사 없음. 클라이언트에서만 `getSession()` / `onAuthStateChange`로 리다이렉트(예: AdminLayout, workspaces).

### 3.2 리스크

- 보호 페이지 직접 URL 접근 시 잠깐 로딩 후 리다이렉트 → SEO·UX·보안 측면에서 서버 측 인증이 더 안전함.
- **권장(단기)**: 최소한 API 쪽 인증만 공통화. (장기) 중요 라우트는 `getServerSideProps`에서 세션 확인 후 리다이렉트 검토.

---

## 4. 컴포넌트 구조 (`component` vs `components`)

### 4.1 현황

| 디렉터리 | 파일 수 | 용도 | 파일명 규칙 |
|----------|---------|------|-------------|
| `src/component/` | 15 | UI 원시/맵/모달/테이블 | kebab-case |
| `src/components/` | 13 | 에러바운더리, FullPageLoader, Admin, Excel 등 | PascalCase/혼합 |

- 두 폴더가 동급으로 존재하며 “단수 vs 복수”만 다름. 문서화된 규칙 없음.

### 4.2 권장

- **옵션 A**: 한 폴더로 통합(예: `src/components/`). 하위에 `primitives/`, `admin/`, `excel-import/` 등으로 구분.
- **옵션 B**: 유지 시 `.cursorrules` 또는 `docs/`에 “`component/` = 공통 UI 조각, `components/` = 기능/도메인 단위” 등으로 명시하고, 신규 파일은 한쪽 규칙만 사용.

---

## 5. 상수·역할 라벨

### 5.1 중복

- **워크스페이스 역할 라벨** `WORKSPACE_ROLE_LABELS`가 **동일 내용**으로 두 곳에 정의:
  - `src/pages/admin/index.tsx` (354행 근처)
  - `src/pages/admin/members/index.tsx` (94행 근처)
- 역할 값 `"service_admin"`, `"top_admin"`, `"admin"`, `"field_agent"`는 API·페이지·`db.ts`에 산재.

### 5.2 권장

- `src/types/auth.ts`에 워크스페이스 역할 타입·라벨 추가 또는 `src/constants/roles.ts` 생성.
  - 예: `WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string>` 한 곳만 정의하고 admin 페이지들은 import.

---

## 6. 에러 처리·Sentry

### 6.1 현황

- **ErrorBoundary**: `_app.tsx`에서 앱 전체를 감쌈. 에러 시 Sentry + “다시 시도하기” UI. 적절함.
- **Toast**: `react-toastify` 전역 사용. API 실패 시 각 호출부에서 `toast.error` 호출. 공통 “API 실패 → 토스트” 헬퍼 없음.
- **Sentry**: `useSentryError` 훅(`logError`/`logMessage`)이 있으나, 많은 파일이 **직접** `Sentry.captureException` / `Sentry.captureMessage` 호출:
  - `api/auth.ts`, `api/workspace.ts`, `api/supabase.ts`, `_app.tsx`, ErrorBoundary, Header, ShareholderList, EditShareholderModal, ExcelImportView, admin excel-import 페이지 등.

### 6.2 권장

- 새 코드는 `useSentryError`의 `logError`/`logMessage` 사용으로 통일.
- (선택) “에러 로깅 + 사용자 메시지” 공통 함수 하나 두고(예: `reportError(error, userMessage?)`) Sentry + toast 한 번에 처리.

---

## 7. 훅 (`src/hooks/`)

- 7개 훅 역할이 명확하고, 훅 간 중복 로직은 없음.
- `useFilteredStats`와 다른 Supabase 조회는 “비슷한 데이터 접근” 수준이며, 훅으로 더 묶을 필요는 낮음.

---

## 8. 타입 (`src/types/`)

- `index.ts`는 `common`만 re-export. `db`, `auth`, `excel`은 개별 import. barrel 과다 노출 없음. 유지 권장.
- `db.ts`에 수동 타입(MyWorkspaceItem 등) 혼재는 실용적. 도메인 타입이 늘어나면 `types/workspace.ts` 등으로 분리 검토.

---

## 9. 라우트·경로 상수

- `src/lib/admin-routes.ts`에 `ADMIN`, `INTEGRATED_PATH_PREFIXES`, `WORKSPACE_ADMIN_SEGMENTS`, `WORKSPACE_ADMIN_SEGMENT_LABELS`, `getWorkspaceAdminBase` 잘 정의됨. 일관 사용 유지.

---

## 10. 기타

- **FullPageLoader**: AdminLayout, workspaces, admin index/integrated, workspace signup-requests에서 메시지만 다르게 사용. 중복 없음. 적절.
- **.env.example**: 존재함. 필요 변수 목록 문서화 유지 권장.
- **스토어**: `filterState`, `workspaceState` 등 zustand 사용. 역할이 나뉘어 있어 문제 없음.

---

## 11. 개선 작업 우선순위 제안

| 순위 | 항목 | 예상 공수 | 효과 |
|------|------|-----------|------|
| 1 | API Bearer + isServiceAdmin 공통화 | 소 | 중복 제거, 수정 시 한 곳만 변경 |
| 2 | WORKSPACE_ROLE_LABELS 단일 소스화 | 소 | 라벨 변경 시 한 곳만 수정 |
| 3 | API try/catch 또는 래퍼 | 소~중 | 500 시 항상 JSON, 안정성 |
| 4 | Sentry useSentryError로 통일 | 중 | 유지보수·정책 일관성 |
| 5 | component/components 정책 문서화 또는 통합 | 중 | 온보딩·일관성 |
| 6 | (선택) 보호 페이지 getServerSideProps 인증 | 중 | 보안·UX |

---

*작성: 2025-03. 다음 검수 시 이 문서를 기준으로 진행 상황 점검 권장.*

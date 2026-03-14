# REFLECT: 워크스페이스 관리·역할 정책·선택 페이지

> 2026-03-14 — BUILD 완료 후 검토

---

## 1. 검증 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| 로그인 후 `/workspaces` 이동 | ✅ | `auth.ts` usePostSignIn onSuccess → `router.push("/workspaces")` |
| 맵(`/`) currentWorkspace 없을 때 리다이렉트 | ✅ | `index.tsx` useEffect: `user?.user && !workspace` → `router.replace("/workspaces")` |
| AdminLayout 권한 없을 때 `/workspaces` | ✅ | `!legacyAdmin && !hasWorkspace` 시 `router.push("/workspaces")` |
| AdminLayout 워크스페이스 1개+ 시 자동 설정 | ✅ | `setCurrentWorkspace(prev => prev ?? workspaces[0] ?? null)` 유지 |
| GET/POST /api/admin/workspaces | ✅ | 본인 멤버 목록, 생성 시 top_admin 추가 |
| /workspaces 페이지 목록·선택·(관리자) 생성 | ✅ | useMyWorkspaces, setCurrentWorkspace, create 모달 |
| root_admin만 user_metadata.role 변경 | ✅ | PATCH users/[id]에서 role 포함 시 isRootAdmin 체크, 아니면 403 |
| Header "워크스페이스 변경" 링크 | ✅ | workspaces.length > 0일 때 `/workspaces` 링크 |
| 사이드바 "워크스페이스 관리" | ✅ | `/admin/workspaces`, Business 아이콘 |

---

## 2. 플로우 확인

- **로그인** → `/workspaces` → (0개면 안내/생성 유도, 1개+면 목록) → "이 워크스페이스 사용" → 맵(`/`) 또는 관리자(`/admin`).
- **맵 직접 접근** (`/`) → 로그인 + currentWorkspace 없음 → `/workspaces`로 리다이렉트.
- **관리자 직접 접근** (`/admin`) → 비로그인 시 `/sign-in`, 권한 없으면 `/workspaces`; 워크스페이스 있으면 자동으로 currentWorkspace 설정 후 패널 표시.
- **역할 변경** → root_admin만 PATCH로 `user_metadata.role` 변경 가능; admin이 시도 시 403.

---

## 3. 알려진 이슈·개선 여지

| 구분 | 내용 |
|------|------|
| **UI** | 사용자 관리에서 admin(비 root_admin)이 역할을 바꾸려 하면 API 403. 역할 필드를 root_admin일 때만 편집 가능하게 하거나, 403 시 토스트로 "최고 관리자만 역할을 변경할 수 있습니다" 안내하면 UX 개선 가능. |
| **Zustand rehydration** | 맵 첫 로드 시 persist 미적용 전에 `workspace`가 잠깐 null이면 `/workspaces`로 리다이렉트될 수 있음. 현재는 의도된 동작(한 번 선택 페이지 경유). |
| **관리자 워크스페이스 목록** | GET /api/admin/workspaces는 "본인 멤버"만 반환. root_admin이 전체 워크스페이스를 보는 기능은 스코프 외(추후 확장). |

---

## 4. 완료 정리

- PLAN 체크리스트 전부 구현 완료.
- Lint·빌드 통과.
- 다음: 실제 계정으로 로그인 → `/workspaces` → 선택/생성 → 맵·관리자 진입, root_admin/admin 역할 변경 동작만 한 번씩 수동 확인 권장.

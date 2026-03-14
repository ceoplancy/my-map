# INIT: 워크스페이스 관리·생성 및 역할 정책

> 2026-03-14 요청 기준 분석

---

## 요청 요약

1. **역할 정책**
   - **최고 관리자**(root_admin): 서비스의 **관리자**(admin) 지정.
   - **관리자**(admin): 각 **워크스페이스**의 관리자(워크스페이스 멤버 역할) 관리.

2. **관리자 패널**
   - 현재 "워크스페이스 관리 및 생성" 메뉴/기능 없음 → **추가 필요**.
   - 관리자·최고 관리자는 워크스페이스를 **생성**할 수 있어야 함.

3. **사용자 플로우**
   - **워크스페이스 선택 전용 페이지** 필요.
   - 복수 워크스페이스: 목록에서 선택.
   - 1개만 있어도 해당 페이지 경유: 목록 보기 + (관리자면) 여기서 바로 **생성** 가능.

---

## 현재 구조 (파악 결과)

| 구분 | 내용 |
|------|------|
| **앱 역할** | `user_metadata.role`: `user` \| `admin` \| `root_admin` (일반/관리자/최고 관리자) |
| **관리자 판별** | `isAppAdmin`: `role.includes("admin")` → admin·root_admin 모두 관리자 패널 접근 |
| **최고 관리자 보호** | UserList에서 `root_admin`은 수정/삭제 버튼 비노출 (root_admin만 타인 역할 지정 가능한 구조) |
| **워크스페이스 생성** | 가입 승인 시에만 생성 (`/api/admin/signup-requests/[id]` approve → workspaces insert + workspace_members top_admin) |
| **관리자 사이드바** | 대시보드, 가입 승인, 사용자 관리, 주주명부 목록/관리, 엑셀 업로드, **워크스페이스 멤버** (워크스페이스 목록/생성 메뉴 없음) |
| **워크스페이스 선택** | Admin: Header 드롭다운 (workspaces.length > 1일 때만). AdminLayout에서 1개일 때 자동 설정. 사용자(맵): 동일 store, 워크스페이스 1개면 자동 설정 |

---

## 관련 파일

| 용도 | 경로 |
|------|------|
| 관리자 레이아웃·워크스페이스 초기화 | `src/layouts/AdminLayout.tsx` |
| 관리자 사이드바 메뉴 | `src/components/admin/Sidebar.tsx` |
| 관리자 헤더 워크스페이스 드롭다운 | `src/components/admin/Header.tsx` |
| 내 워크스페이스 API | `src/pages/api/me/workspaces.ts` |
| 가입 승인(워크스페이스 생성) | `src/pages/api/admin/signup-requests/[id].ts` |
| 사용자 관리(역할 표시/수정) | `src/components/admin/users/UserList.tsx`, `UserDetailModal.tsx`, `UserForm.tsx` |
| 앱 관리자 체크 | `src/pages/api/admin/users/index.ts`, `[id].ts` |
| DB 타입 | `src/types/db.ts` (workspaces, workspace_members, workspace_role enum) |

---

## 제안 스코프 (구현 시 검토)

1. **역할 정책**
   - API: "관리자 지정"은 **root_admin만** 가능하도록 제한 (user_metadata.role을 admin으로 설정/해제하는 PATCH는 root_admin 전용).
   - 관리자(admin)는 사용자 관리에서 일반 사용자만 보거나, 역할 변경 불가. 또는 관리자는 워크스페이스 멤버 역할만 관리.

2. **관리자 패널 — 워크스페이스 관리**
   - 사이드바에 "워크스페이스 관리" 메뉴 추가.
   - 페이지: 내가 접근 가능한 워크스페이스 목록 (admin/root_admin은 전 워크스페이스 또는 본인 관련만 정책에 따라) + **워크스페이스 생성** 폼 (이름, account_type).
   - API: `POST /api/admin/workspaces` (생성), `GET /api/admin/workspaces` (목록, 권한에 따라 필터).

3. **사용자 — 워크스페이스 선택 페이지**
   - 라우트: `/workspaces` (또는 `/select-workspace`).
   - 기능: 내 워크스페이스 목록, "선택" 시 currentWorkspace 설정 후 `/` 또는 `/admin`으로 이동.
   - 관리자·최고 관리자: "워크스페이스 만들기" 버튼 → 생성 후 목록에 반영 또는 해당 워크스페이스 선택 상태로 진입.
   - 진입 조건: 로그인 후 워크스페이스가 0개면 이 페이지로 리다이렉트(생성 유도 또는 안내); 1개만 있으면 기존처럼 자동 선택 후 맵/관리자로 가도 되지만, 요청대로면 "항상 이 페이지 경유"로 할 수 있음 (1개여도 목록 + 생성 버튼 노출).

4. **라우팅 정리**
   - 로그인 후: `/workspaces`로 먼저 보내서 선택/생성 후, "이 워크스페이스 사용" 등으로 `/` 또는 `/admin` 이동.
   - 또는 기존처럼 1개면 자동 선택 후 `/`/`/admin` 유지하고, "워크스페이스 변경" 시에만 `/workspaces`로 이동하는 링크 제공.

---

## 복잡도

| 기준 | 판단 |
|------|------|
| 파일 수 | 10+ (신규 페이지, API, 사이드바, 라우팅, 역할 제한 로직) |
| 설계 결정 | 역할별 권한(최고/일반 관리자), 워크스페이스 목록 범위(전체 vs 본인 소속), 진입 플로우 |
| DB 변경 | 필요 시 RLS·뷰 또는 admin 전용 API로 해결 가능; 신규 테이블 없이 기존 workspaces·workspace_members 활용 |

**복잡도: L3** (설계 필요, 5+ 파일, 역할·플로우 결정)

---

## 다음 단계

- **PLAN**: 인터뷰·우선순위·페이즈 확정 (진입 플로우: 항상 /workspaces 경유 여부, 관리자 목록 범위, root_admin 전용 API 범위).
- **CREATIVE**: "워크스페이스 관리" 페이지 정보 구조·UI, `/workspaces` 페이지 레이아웃·플로우.
- **BUILD**: API·페이지·사이드바·역할 제한 구현.

# PLAN: 워크스페이스 관리·역할 정책·선택 페이지

> 2026-03-14 — INIT 기반 실행 계획

---

## 1. 스코프·결정 사항

### 1.1 진입 플로우

| 상황 | 동작 |
|------|------|
| 로그인 후 워크스페이스 **0개** | `/workspaces`로 리다이렉트. 관리자면 "생성" 유도, 일반 사용자면 안내(가입 승인 대기 등). |
| 로그인 후 워크스페이스 **1개** | **항상 `/workspaces` 경유**. 목록 1개 + "이 워크스페이스 사용" + (관리자면) "워크스페이스 만들기". |
| 로그인 후 워크스페이스 **2개 이상** | `/workspaces`에서 선택 후 "사용"으로 진입. (기존 Admin Header 드롭다운은 유지해 스위칭용.) |

- 로그인 성공 시 `router.push("/")` → **`/workspaces`로 변경** (또는 미들웨어/레이아웃에서 로그인 사용자는 `/` 요청 시 `/workspaces`로 리다이렉트).
- 맵(`/`)·관리자(`/admin/*`) 진입은 **반드시 currentWorkspace가 설정된 뒤**만 허용. 미설정 시 `/workspaces`로 보냄.

### 1.2 관리자 워크스페이스 목록 범위

- **GET /api/admin/workspaces**: 본인이 멤버인 워크스페이스만 반환 (기존 `workspace_members` 기준).  
  → root_admin이 "전체 워크스페이스"를 보는 기능은 **이번 스코프 제외** (추후 필요 시 확장).

### 1.3 역할 정책

| 액션 | 허용 주체 |
|------|-----------|
| `user_metadata.role`을 `admin` 또는 `user`로 변경 | **root_admin만** |
| `user_metadata.role`을 `root_admin`으로 설정/해제 | **불가** (코드상 설정하지 않음) |
| 워크스페이스 멤버 역할(workspace_members.role) 변경 | admin·root_admin (해당 워크스페이스 멤버인 경우) |

- 사용자 관리 PATCH: body에 `user_metadata.role`이 있으면 **요청자가 root_admin일 때만** 허용. admin이 role을 넣어 PATCH하면 403 또는 role 필드 무시.

---

## 2. 페이즈

### Phase 1 — 역할 정책 (API)

- **목표**: root_admin만 앱 관리자(admin) 지정 가능.
- **산출물**  
  - `isAppAdmin` 유지.  
  - `isRootAdmin(token)` 헬퍼 추가 (user_metadata.role === "root_admin").  
  - `PATCH /api/admin/users/[id]`: body.user_metadata.role 변경 시 요청자가 root_admin이 아니면 403 또는 role 제거 후 업데이트.
- **영향 파일**: `src/pages/api/admin/users/[id].ts`, (선택) `src/pages/api/admin/users/index.ts` 공통 헬퍼 위치.

### Phase 2 — 워크스페이스 관리 (관리자 패널)

- **목표**: 관리자·최고 관리자가 워크스페이스를 생성하고, 목록을 볼 수 있음.
- **API**  
  - `GET /api/admin/workspaces`: Bearer + isAppAdmin. 본인 멤버인 워크스페이스 목록 (id, name, account_type, created_at).  
  - `POST /api/admin/workspaces`: body `{ name, account_type }`. 생성 후 생성자를 해당 워크스페이스의 `top_admin`으로 workspace_members에 추가.
- **페이지**  
  - `src/pages/admin/workspaces/index.tsx`: "워크스페이스 관리" — 목록 테이블 + "워크스페이스 만들기" 버튼 → 모달/인라인 폼 (이름, account_type). 생성 후 목록 refetch, 선택 스토어 갱신.
- **사이드바**  
  - "워크스페이스 관리" 메뉴 추가 (경로 `/admin/workspaces`), 기존 "워크스페이스 멤버" 위 또는 아래 배치.

### Phase 3 — 사용자 워크스페이스 선택 페이지

- **목표**: 모든 로그인 사용자가 `/workspaces`에서 워크스페이스 목록 확인·선택·(관리자면) 생성.
- **페이지**  
  - `src/pages/workspaces.tsx`:  
    - 내 워크스페이스 목록 (useMyWorkspaces).  
    - 카드/리스트 per 워크스페이스 + "이 워크스페이스 사용" 버튼 → setCurrentWorkspace(ws), router.push(isAdmin ? "/admin" : "/").  
    - 관리자·최고 관리자: "워크스페이스 만들기" 버튼 → 생성 모달 또는 인라인 폼. 생성 후 useMyWorkspaces invalidate, 새 항목 선택 가능.
    - 워크스페이스 0개: 안내 문구 + (관리자면) 생성 유도.
- **라우팅·가드**  
  - 로그인 성공 시 이동: `/` → `/workspaces`로 변경 (auth 쪽 postSignIn onSuccess).  
  - `/` 및 `/admin`(또는 AdminLayout): currentWorkspace 없으면 `/workspaces`로 리다이렉트 (이미 workspace 1개일 때 자동 설정하던 로직은 AdminLayout에서 유지하되, 진입점을 `/workspaces`로 통일).

### Phase 4 — 정리·연결

- **진입 가드**: `pages/index.tsx` (맵): currentWorkspace 없으면 `/workspaces`로 redirect.  
- **AdminLayout**: 이미 currentWorkspace 없을 때 "워크스페이스 선택해 주세요" 또는 리다이렉트 `/workspaces` 처리 일치.  
- **Header**: "워크스페이스 변경" 링크 추가 → `/workspaces` 이동 (선택 UI 통일).

---

## 3. 태스크 체크리스트 (BUILD 시 참조)

- [x] **P1** `isRootAdmin(token)` 추가, users/[id] PATCH에서 role 변경 시 root_admin 체크
- [x] **P2** `GET /api/admin/workspaces` 구현 (본인 멤버 목록)
- [x] **P2** `POST /api/admin/workspaces` 구현 (생성 + 생성자 top_admin 추가)
- [x] **P2** `src/pages/admin/workspaces/index.tsx` — 목록 + 생성 폼
- [x] **P2** Sidebar에 "워크스페이스 관리" 메뉴 추가
- [x] **P3** `src/pages/workspaces.tsx` — 목록, 선택, (관리자) 생성
- [x] **P3** 로그인 성공 시 `/workspaces`로 이동하도록 auth 수정
- [x] **P4** 맵(`/`)·AdminLayout에서 currentWorkspace 없을 때 `/workspaces` 리다이렉트
- [x] **P4** Header에 "워크스페이스 변경" → `/workspaces` 링크

---

## 4. CREATIVE 생략 여부

- UI는 기존 관리자 패널·스타일(emotion, COLORS, 카드/테이블)을 재사용.  
- **CREATIVE 단계 없이 BUILD로 진행** 가능. 세부 레이아웃(카드 vs 테이블)은 구현 시 일관되게 선택.

---

## 5. 다음 단계

- **BUILD**: Phase 1 → 2 → 3 → 4 순서로 구현.
- 완료 후 **REFLECT**에서 진입 플로우·역할 동작 검증.

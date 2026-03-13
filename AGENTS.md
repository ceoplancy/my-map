# AGENTS.md — my-map (앤트리맵) 에이전트 가이드

> **이 파일이 모든 작업의 시작점입니다.**

---

## 프로젝트 구조

| 계층 | 역할 | 비고 |
|------|------|------|
| **Next.js** (`src/`) | UI, API Routes, Supabase 연동, 라우팅 | 단일 앱, Pages Router |
| **Supabase** | DB, 인증, 스토리지 | 타입: `src/types/db.ts` |

- 비즈니스 로직: API Routes·Serverless·Supabase RPC 등에서 처리.
- 클라이언트: Supabase 클라이언트 또는 내부 API 호출.

---

## 자동 워크플로우

### 트리거 키워드

| 키워드 | 동작 |
|--------|------|
| `INIT` 또는 `VAN` | 분석 시작 → 복잡도 판단 → 워크플로우 결정 |
| `PLAN` | 계획 수립 (Cursor Plan 모드) |
| `CREATIVE` | 설계 결정 (UI면 ui-ux-pro-max) |
| `BUILD` | 구현 시작 (Cursor Agent 모드) |
| `REFLECT` | 검토 (이슈면 Debug 모드) |
| `ARCHIVE` | 문서화 및 아카이브 → **`memory-bank/archive/`**에 저장, `index.md` 갱신 |

### 자동 감지 패턴

- "~해줘", "~구현해줘", "~수정해줘", "~추가해줘"
- "~가 안 돼", "~에러", "~버그"
- 기능/수정/개선 관련 요청

→ 감지 시 **자동으로 INIT 시작**

---

## 워크플로우

```
INIT → PLAN → CREATIVE → BUILD → REFLECT → ARCHIVE
 Ask    Plan    Plan     Agent   Ask/Debug  Agent
```

| Level | 설명 | 워크플로우 |
|-------|------|-----------|
| L1 | 버그, 단일 파일 | INIT→BUILD→REFLECT |
| L2 | 개선, 2-5 파일 | +PLAN |
| L3 | 새 기능, 설계 필요 | +CREATIVE |
| L4 | 아키텍처 변경 | 전체+ARCHIVE |

---

## INIT 자동 실행 (요청 시)

```
✅ INIT 분석
━━━━━━━━━━━━━━━━━
📋 요청: {요청 내용 요약}
📊 복잡도: L{1-4}
   - 파일 수: {n}
   - 설계 필요: {예/아니오}
   - DB 변경: {예/아니오}
📁 관련 파일: {파일 목록}
━━━━━━━━━━━━━━━━━
➡️ 워크플로우: {선택된 워크플로우}
➡️ 다음 단계: [PLAN/BUILD]

진행할까요? (Y/자동 진행)
```

---

## Source of Truth

| 항목 | 위치 |
|------|------|
| 작업 목록 | `memory-bank/tasks.md` |
| 현재 컨텍스트 | `memory-bank/activeContext.md` |
| 도메인 지식 | `memory-bank/domainKnowledge.md` |
| **통합 아카이브** | `memory-bank/archive/` (인덱스: `memory-bank/archive/index.md`) |
| 코드 표준 | `.cursorrules` |
| 워크플로우 상세 | `.cursor/rules/workflow-modes.mdc` |

### 앤트리맵 도메인 (요약)

| 용어 | 설명 |
|------|------|
| 주주명부 | 엑셀 기반 주주 목록 (주소, 주식 수, 상태) |
| 용역 | 현장 요원 — 방문·상태·메모·사진 |
| 상장사/의결권 대행사 | 플랫폼화 시 B2B 가입 주체 |

→ `memory-bank/domainKnowledge.md`

---

## 서브에이전트

| 호출 | 역할 | 시점 |
|------|------|------|
| /explorer | 파일 탐색 | INIT |
| /architect | 설계 | PLAN, CREATIVE |
| /frontend-engineer | UI | BUILD |
| /implementer | 로직/API | BUILD |
| /debugger | 에러 분석 | BUILD, REFLECT |
| /verifier | 검증 | REFLECT |

---

## 주요 경로

| 용도 | 경로 |
|------|------|
| API | `src/pages/api/`, `src/api/` |
| 페이지 | `src/pages/` |
| 컴포넌트 | `src/components/`, `src/component/` |
| 훅 | `src/hooks/` |
| DB 타입 | `src/types/db.ts` |
| 스토어 | `src/store/` |
| 레이아웃 | `src/layouts/` |

---

## 빠른 명령

```bash
pnpm dev          # 개발 서버
pnpm build        # 빌드
pnpm lint         # 린트
pnpm typegen      # Supabase 타입 → src/types/db.ts
```

- **환경 변수**: `.env` (Supabase 등). `.env.example` 참고.

---

## 문서 우선순위

사용자 지시 > `.cursor/rules` > AGENTS.md

---

**아카이브**: `memory-bank/archive/`만 사용. 완료 문서는 해당 경로로 이동 후 `memory-bank/archive/index.md`에 항목 추가.

**삭제 금지**: `memory-bank/`, `.cursor/rules/`

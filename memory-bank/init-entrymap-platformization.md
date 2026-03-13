# INIT — 앤트리맵 플랫폼화 구현 준비

**일자**: 2025-03-13  
**브랜치**: dev  
**역할**: 15년+ 서비스 기획·개발 관점 구현 준비

---

## 1. INIT 요약

| 항목 | 내용 |
|------|------|
| **요청** | (1) AI 구조 리팩터링 — my-map 프로젝트에 맞게 전반 정리 (2) 앤트리맵 SaaS 플랫폼화 구현 준비 |
| **복잡도** | **L4** (아키텍처·시스템 전반, 10+ 파일, 다수 설계 결정) |
| **워크플로우** | INIT → PLAN → CREATIVE → BUILD → REFLECT → ARCHIVE |
| **다음 단계** | PLAN (우선순위·페이즈·스코프 확정) |

---

## 2. 현재 상태 정리

### 2.1 프로젝트

- **이름**: my-map (앤트리맵)
- **구조**: 단일 Next.js (Pages Router) + Supabase
- **역할**: 1개 회사 대상 주주·주식 관리 (엑셀 주주명부, 지도 마커, 용역 현장·상태·메모·사진)
- **경로**: `src/pages/`, `src/api/`, `src/components/`, `src/component/`, `src/types/db.ts`, `src/store/` 등

### 2.2 완료한 준비 작업 (dev 브랜치)

- **dev 브랜치** 생성 및 staging 용도로 사용 예정.
- **memory-bank** 구축: `tasks.md`, `activeContext.md`, `domainKnowledge.md`, `progress.md`, `archive/`.
- **AI 구조 리팩터링**  
  - `.cursorrules`, `AGENTS.md`: MICE → 앤트리맵, Rust/apps 제거, 단일 Next.js 경로 반영.  
  - `.cursorindexingignore`: `src/types/db.ts` 등 현재 경로 반영.  
  - `.cursor/rules`: workflow·memory-bank에서 앤트리맵 용어로 통일, Rust 규칙은 참조용으로 유지.  
  - `.cursor/agents`: explorer, implementer, architect, frontend-engineer, verifier, debugger — 앤트리맵 도메인·경로로 수정.
- **PRD 정리**: `memory-bank/prd-entrymap-platform.md` — 플랫폼 진입·관리자 패널·용역 모바일·즉시 반영 항목(활성화 기간, 직접 촬영) 포함.
- **도메인 지식**: `memory-bank/domainKnowledge.md` — 현재 서비스·플랫폼화 후 용어 정리.

---

## 3. 플랫폼화 관점 정리

### 3.1 비즈니스 방향

- **Before**: 단일 테넌트(1개 회사), 단일 주주명부·단일 용역 풀.
- **After**: 멀티테넌트(B2B), 계정별 워크스페이스, 복수 주주명부·독립 용역·승인 워크플로우.

### 3.2 설계 시 고려사항 (PLAN 단계에서 구체화)

| 영역 | 고려 사항 |
|------|-----------|
| **계정·역할** | 상장사/의결권 대행사 구분, 운영사(승인자), 가입 대기·승인/반려 플로우 |
| **데이터 격리** | 워크스페이스(또는 tenant/org) 단위 격리, RLS·API 스코프 |
| **주주명부** | 복수 명부, 명부별 활성화 기간, 노출 ON/OFF, 실패 건 인라인 수정 |
| **용역** | 계정 생성·권한(일반/팀장)·담당 상장사, 이력(누가/언제/무엇) |
| **모바일** | 마커 색상·필터·주주별 업로드 링크·QR, 활동 사진 직촬, 이력 UI |
| **운영** | 용역 요청 버튼 → 알림·이메일 |

### 3.3 즉시 반영(단기) 항목

1. **주주명부 생성 시 활성화 기간 설정** — 스키마·UI·저장 로직.
2. **용역 직접 사진 촬영** — 신분증 등 외에 “직접 촬영” 플로우 추가, 필요 시 주주별 업로드 링크·QR 연동 준비.

---

## 4. 다음 액션 (PLAN)

1. **PLAN 모드**에서 다음을 확정 권장:  
   - 플랫폼화 **페이즈** (1차: 활성화 기간 + 직접 촬영 / 2차: 가입·승인 / 3차: 복수 명부·대시보드 등).  
   - **DB 스키마** 변경 범위 (워크스페이스, 주주명부 메타, 용역 계정·이력 등).  
   - **API·라우트** 구조 (기존 `src/api/`, `src/pages/api/` 확장 방식).
2. **CREATIVE** 필요 시: 대시보드·모바일 이력·필터 UI 등 설계안 수립.
3. **BUILD**는 PLAN/CREATIVE 결과를 반영해 작업 목록(`tasks.md`) 단위로 진행.

---

## 5. 참조 파일

| 파일 | 용도 |
|------|------|
| `memory-bank/prd-entrymap-platform.md` | 플랫폼화 PRD 전체 |
| `memory-bank/domainKnowledge.md` | 도메인 용어 |
| `memory-bank/tasks.md` | 작업 목록 |
| `memory-bank/activeContext.md` | 현재 컨텍스트 |
| `AGENTS.md` | 에이전트·워크플로우 |
| `.cursorrules` | 코드·경로 기준 |

---

**INIT 완료.** 다음: **PLAN**으로 우선순위·스코프·페이즈 확정 후 BUILD 진행.

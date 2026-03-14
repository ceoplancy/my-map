# Memory Bank — entre-map (앤트리맵)

> 단일 소스: 작업 컨텍스트, 도메인 지식, 아카이브

---

## 구조

| 파일 | 용도 |
|------|------|
| **tasks.md** | 작업 목록 (SoT) |
| **activeContext.md** | 현재 컨텍스트·포커스 |
| **domainKnowledge.md** | 앤트리맵 도메인 용어·비즈니스 규칙 |
| **progress.md** | 구현 진행 (BUILD 단계) |
| **archive/** | 완료 문서·회고·가이드 (인덱스: archive/index.md) |

---

## 갱신 시점

- **tasks.md**: INIT/PLAN 시, 작업 완료 시
- **activeContext.md**: 모드 전환 시
- **progress.md**: BUILD 단계별
- **archive/index.md**: 아카이빙 시

---

## 참조

- 워크플로우: `.cursor/rules/workflow-modes.mdc`
- 아카이브·정리: `.cursor/rules/archive-and-cleanup.mdc`
- 에이전트: `AGENTS.md`

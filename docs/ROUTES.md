# 라우팅 규칙 (워크스페이스 기준)

## 진입·리다이렉트 흐름

```
비로그인 → / 접근 시 → /sign-in
로그인 성공 → /workspaces (워크스페이스 선택)
워크스페이스 선택 후 → 일반: /workspaces/[workspaceId] (지도), 관리자: /admin
/ 접근 시 → 워크스페이스 있음: /workspaces/[id] 리다이렉트, 없음: /workspaces 리다이렉트
/workspaces/[id] 접근 시 해당 워크스페이스 없거나 권한 없음 → /workspaces
/admin/* 접근 시 비로그인 → /sign-in, 워크스페이스 없고 비통합관리자 → /workspaces
```

## 경로별 요약

| 경로 | 용도 | 전제 조건 | 비인가 시 |
|------|------|-----------|-----------|
| `/` | **리다이렉트 전용** (→ `/sign-in` / `/workspaces` / `/workspaces/[id]`) | - | - |
| `/workspaces/[workspaceId]` | **지도** (해당 워크스페이스 주주 데이터) | 로그인 + 해당 워크스페이스 접근 권한 | 비로그인 → `/sign-in`, 권한 없음 → `/workspaces` |
| `/sign-in` | 로그인 | - | - |
| `/sign-up` | 가입 신청 | - | - |
| `/workspaces` | 워크스페이스 선택/전환 | 로그인 | 비로그인 → `/sign-in` |
| `/admin` | **워크스페이스 대시보드** (선택된 워크스페이스 기준) | 로그인 + 워크스페이스 선택 | 워크스페이스 없음 → 안내 + 통합 관리 링크(service_admin만) |
| `/admin/integrated` | **통합 대시보드** (플랫폼 전체, 워크스페이스 무관) | **통합 관리자(service_admin)** | 비통합관리자 → `/admin` 리다이렉트 |
| `/admin/signup-requests` | 가입 승인 | **통합 관리자(service_admin)** | 401 |
| `/admin/users` | 사용자 관리 | **통합 관리자(service_admin)** | 권한 없음 안내 + 대시보드 링크 |
| `/admin/workspaces` | 워크스페이스 관리 | **통합 관리자(service_admin)** | 권한 없음 안내 + 대시보드 링크 |
| `/admin/lists` | 주주명부 목록 | 로그인 + 워크스페이스 | 워크스페이스 없음 → 안내 |
| `/admin/shareholders` | 주주명부 관리 | 로그인 + listId 쿼리 | listId 없음 → 목록 링크 안내 |
| `/admin/excel-import` | 엑셀 업로드 | 로그인 + listId(선택 명부) | listId 없음 → 목록 링크 안내 |
| `/admin/members` | 워크스페이스 멤버 | 로그인 + 워크스페이스 | 워크스페이스 없음 → 안내 |

## 지도 페이지 (`/workspaces/[workspaceId]`) 데이터 소스

- **URL의 워크스페이스 id** 기준으로 해당 워크스페이스 주주 데이터만 사용 (`shareholders` 테이블, `visibleListIds` 기준).
- 페이지 진입 시 URL의 workspaceId로 접근 가능한 워크스페이스를 찾아 전역 상태에 동기화하고, 없거나 권한 없으면 `/workspaces`로 리다이렉트.
- 워크스페이스에 “노출”된 주주명부가 없으면 마커 없음 + 사이드 메뉴에 안내 문구 표시.
- 레거시 `excel` 테이블은 지도에서 사용하지 않음 (워크스페이스별 `shareholders`만 사용).

## 통합 관리 vs 워크스페이스

- **통합 관리(서비스 최고 관리자)**: 전용 경로 `/admin/integrated`, `/admin/signup-requests`, `/admin/users`, `/admin/workspaces`. 헤더에 워크스페이스 선택/변경 없음. 플랫폼 전체 사용자·워크스페이스 현황만 표시.
- **워크스페이스별 관리**: `/admin`(대시보드), `/admin/lists`, `/admin/shareholders`, `/admin/excel-import`, `/admin/members`. 헤더에서 워크스페이스 선택·변경 가능. 선택된 워크스페이스 기준 데이터만 표시.
- 지도 대시보드의 "통합 관리" 링크: service_admin → `/admin/integrated`, 그 외 관리자 → `/admin`.

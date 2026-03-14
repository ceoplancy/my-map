# 컴포넌트 구조

- **`src/components/`**: 공통·기능 단위 컴포넌트.
  - **`ui/`**: UI 원시/공통 조각 (버튼, 스피너, 모달, 맵 마커, 엑셀 테이블 등). kebab-case 파일명.
  - **`admin/`**: 관리자 레이아웃·사이드바·헤더·주주/사용자 관련.
  - **`excel-import/`**: 엑셀 업로드 뷰.
  - **`animations/`**: 로그인 등 애니메이션.
- **`ErrorBoundary`, `FullPageLoader`, `StatsCard`**: 루트 `components/` 직속.

신규 UI 조각은 `components/ui/`에, 도메인/기능 단위는 `components/<도메인>/`에 추가.

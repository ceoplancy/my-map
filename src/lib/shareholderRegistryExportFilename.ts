/**
 * 주주명부 엑셀 내보내기 파일명 (대시보드·주주 관리 페이지 공통).
 * 예: `주주명부_나우로보틱스_2026-03-26.xlsx`
 */
export function buildShareholderRegistryExportFileName(
  listName: string | null | undefined,
): string {
  const prefix = listName ? `주주명부_${listName}` : "주주명부"

  return `${prefix}_${new Date().toISOString().slice(0, 10)}.xlsx`
}

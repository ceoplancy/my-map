/** 주주 행의 변경 이력 항목 (DB json history 컬럼) */

export type HistoryChange = {
  memo?: { original: string; modified: string }
  status?: { original: string; modified: string }
  phone?: { original: string; modified: string }
  special_notes?: { original: string; modified: string }
  image?: { original: string; modified: string }
}

export type HistoryItem = {
  modified_at: string

  /** 표시용: 이름 (이메일) 등 */
  modifier: string

  /** Supabase Auth 사용자 id (감사 추적용, 선택) */
  user_id?: string

  changes: HistoryChange
}

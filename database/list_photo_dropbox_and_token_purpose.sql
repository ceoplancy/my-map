-- 명부별 공개 사진 접수함 + 업로드 토큰 용도 구분
-- 적용 후: pnpm supabase:typegen (또는 typegen 스크립트)으로 클라이언트 타입 갱신 권장
--
-- list_upload_tokens 이 없는 프로젝트(초기 DB)용: 아래 CREATE 로 먼저 만든 뒤 purpose 만 보강합니다.

CREATE TABLE IF NOT EXISTS list_upload_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES shareholder_lists (id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT list_upload_tokens_token_unique UNIQUE (token)
);

ALTER TABLE list_upload_tokens
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'member_session';

COMMENT ON COLUMN list_upload_tokens.purpose IS
  'member_session: 로그인 후 /upload-photo ; public_drop: 비로그인 /photo-drop';

CREATE TABLE IF NOT EXISTS list_photo_dropbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES shareholder_lists (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  content_type text,
  original_filename text
);

CREATE INDEX IF NOT EXISTS list_photo_dropbox_list_created_idx
  ON list_photo_dropbox (list_id, created_at DESC);

COMMENT ON TABLE list_photo_dropbox IS
  '공개 접수(/photo-drop)로 올라온 파일 메타 — 스토리지 경로는 inbox/{list_id}/...';

-- RLS: 브라우저 anon/인증 JWT로는 직접 접근 불가. 읽기·쓰기는 Next API의 service role만 사용.
ALTER TABLE list_photo_dropbox ENABLE ROW LEVEL SECURITY;

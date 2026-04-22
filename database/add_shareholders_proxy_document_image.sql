-- Supabase / PostgreSQL: 주주 의결권 서류 사진 URL (신분증 image와 분리)
-- 적용 후 클라이언트 타입(db.ts)과 일치합니다.

alter table public.shareholders
  add column if not exists proxy_document_image text;

comment on column public.shareholders.proxy_document_image is
  '의결권 서류 등 사진 공개 URL — 스토리지 경로 {list_id}/{shareholder_id}-proxy.(webp|png)';

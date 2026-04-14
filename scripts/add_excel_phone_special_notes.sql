-- Supabase SQL editor에서 한 번 실행 (이미 컬럼이 있으면 스킵됩니다)
alter table public.excel
  add column if not exists phone text;

alter table public.excel
  add column if not exists special_notes text;

-- Supabase SQL Editor에서 실행
-- 신분증 QR 업로드: 주주(excel) 행당 이력 누적

create table if not exists public.shareholder_id_photo (
  id bigint generated always as identity primary key,
  excel_id bigint not null references public.excel (id) on delete cascade,
  file_url text not null,
  storage_path text not null,
  uploader_name text,
  guide_name text,
  created_at timestamptz not null default now()
);

create index if not exists shareholder_id_photo_excel_id_idx
  on public.shareholder_id_photo (excel_id);

alter table public.shareholder_id_photo enable row level security;

drop policy if exists "shareholder_id_photo_select_auth" on public.shareholder_id_photo;
create policy "shareholder_id_photo_select_auth"
  on public.shareholder_id_photo for select
  to authenticated
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'id-documents',
  'id-documents',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
)
on conflict (id) do nothing;

drop policy if exists "id_documents_public_read" on storage.objects;
create policy "id_documents_public_read"
  on storage.objects for select
  using (bucket_id = 'id-documents');

-- Supabase Dashboard → SQL 에서 실행 (Storage 버킷 + 읽기 정책)
-- 앱 기본 버킷명: shareholder-images (NEXT_PUBLIC_SUPABASE_SHAREHOLDER_BUCKET 으로 변경 가능)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  ''shareholder-images'',
  ''shareholder-images'',
  true,
  5242880,
  array[''image/jpeg'', ''image/png'', ''image/webp'', ''image/gif'']::text[]
)
on conflict (id) do nothing;

-- 공개 읽기 (버킷이 public 이면 객체 URL로 조회)
create policy "shareholder_images_public_read"
on storage.objects for select
using (bucket_id = ''shareholder-images'');

-- 로그인 사용자 업로드
create policy "shareholder_images_auth_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = ''shareholder-images'');

-- 본인이 올린 파일만 덮어쓰기/삭제가 필요하면 id 기반 path 정책으로 좁힐 것
create policy "shareholder_images_auth_update"
on storage.objects for update
to authenticated
using (bucket_id = ''shareholder-images'');

create policy "shareholder_images_auth_delete"
on storage.objects for delete
to authenticated
using (bucket_id = ''shareholder-images'');

-- Seed: 기본 워크스페이스 + 기본 명부 생성 후, excel 데이터를 shareholders로 이관
-- ※ public.excel 테이블은 읽기만 하며, 수정/삭제하지 않음 (원본 유지)

-- 1. 기본 워크스페이스 없으면 생성
INSERT INTO public.workspaces (id, name, account_type)
SELECT gen_random_uuid(), '기본 워크스페이스', 'listed_company'
WHERE NOT EXISTS (SELECT 1 FROM public.workspaces WHERE name = '기본 워크스페이스');

-- 2. 기본 워크스페이스 아래 '기본 명부' 없으면 생성
INSERT INTO public.shareholder_lists (workspace_id, name, is_visible)
SELECT w.id, '기본 명부', true
FROM public.workspaces w
WHERE w.name = '기본 워크스페이스'
  AND NOT EXISTS (
    SELECT 1 FROM public.shareholder_lists sl
    WHERE sl.workspace_id = w.id AND sl.name = '기본 명부'
  )
LIMIT 1;

-- 3. excel 전체 행을 '기본 워크스페이스 > 기본 명부'의 shareholders로 복사 (한 번만 실행됨)
INSERT INTO public.shareholders (list_id, name, address, lat, lng, latlngaddress, company, status, stocks, memo, maker, image, history)
SELECT sl.id, e.name, e.address, e.lat::double precision, e.lng::double precision, e.latlngaddress, e.company, e.status, COALESCE(e.stocks, 0)::bigint, e.memo, e.maker, e.image, e.history
FROM public.excel e
CROSS JOIN (
  SELECT sl2.id
  FROM public.shareholder_lists sl2
  JOIN public.workspaces w2 ON w2.id = sl2.workspace_id
  WHERE w2.name = '기본 워크스페이스' AND sl2.name = '기본 명부'
  LIMIT 1
) sl
WHERE NOT EXISTS (SELECT 1 FROM public.shareholders sh WHERE sh.list_id = sl.id);

-- 4. 기존 admin/root_admin 사용자를 기본 워크스페이스 멤버(top_admin)로 등록
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, u.id, 'top_admin'
FROM public.workspaces w
CROSS JOIN auth.users u
WHERE w.name = '기본 워크스페이스'
  AND (
    (u.raw_user_meta_data->>'role')::text LIKE '%admin%'
    OR (u.raw_user_meta_data->>'role')::text = 'root_admin'
  )
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Seed: default workspace and migrate excel to shareholders
INSERT INTO public.workspaces (id, name, account_type)
SELECT gen_random_uuid(), '기본 워크스페이스', 'listed_company'
WHERE NOT EXISTS (SELECT 1 FROM public.workspaces WHERE name = '기본 워크스페이스');

INSERT INTO public.shareholder_lists (workspace_id, name, is_visible)
SELECT w.id, '기본 명부', true FROM public.workspaces w
WHERE w.name = '기본 워크스페이스'
AND NOT EXISTS (SELECT 1 FROM public.shareholder_lists sl WHERE sl.workspace_id = w.id AND sl.name = '기본 명부')
LIMIT 1;

INSERT INTO public.shareholders (list_id, name, address, lat, lng, latlngaddress, company, status, stocks, memo, maker, image, history)
SELECT sl.id, e.name, e.address, e.lat::double precision, e.lng::double precision, e.latlngaddress, e.company, e.status, COALESCE(e.stocks, 0)::bigint, e.memo, e.maker, e.image, e.history
FROM public.excel e
CROSS JOIN (SELECT id FROM public.shareholder_lists WHERE name = '기본 명부' LIMIT 1) sl
WHERE NOT EXISTS (SELECT 1 FROM public.shareholders sh WHERE sh.list_id = sl.id);

INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, u.id, 'top_admin'
FROM public.workspaces w
CROSS JOIN auth.users u
WHERE w.name = '기본 워크스페이스'
AND ((u.raw_user_meta_data->>'role')::text LIKE '%admin%' OR (u.raw_user_meta_data->>'role')::text = 'root_admin')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

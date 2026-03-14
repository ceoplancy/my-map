-- ceo@antre.com 사용자를 기본 워크스페이스의 최고 관리자(top_admin)로 등록
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, u.id, 'top_admin'
FROM public.workspaces w
CROSS JOIN auth.users u
WHERE w.name = '기본 워크스페이스'
  AND u.email = 'ceo@antre.com'
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'top_admin';

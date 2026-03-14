-- ceo@antre.com을 서비스 관리자(service_admin)로 등록 → 가입 승인 등 통합 관리 접근 가능
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT NULL, u.id, 'service_admin'
FROM auth.users u
WHERE u.email = 'ceo@antre.com'
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'service_admin';

-- 가입 승인 철회(revoked) + 플랫폼 감사 로그
ALTER TYPE public.signup_request_status ADD VALUE 'revoked';

CREATE TABLE IF NOT EXISTS public.platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_log_created_at ON public.platform_audit_log (created_at DESC);

ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

-- 앱은 서버(API Route + service role)에서만 기록·조회. 직접 클라이언트 접근 없음.
CREATE POLICY "platform_audit_log no direct access"
  ON public.platform_audit_log
  FOR ALL
  USING (false)
  WITH CHECK (false);

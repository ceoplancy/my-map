-- 명부 이용 규율 동의 (shareholder_lists.rules_version 과 맞춰 재동의 판단)
-- 없으면 지도 로드 시 PGRST205 / 규율 동의 upsert 실패 가능
-- 적용: Supabase SQL Editor에서 전체 실행

CREATE TABLE IF NOT EXISTS public.list_rules_acceptances (
  list_id uuid NOT NULL REFERENCES public.shareholder_lists (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  rules_version integer NOT NULL DEFAULT 1,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, user_id)
);

COMMENT ON TABLE public.list_rules_acceptances IS
  '워크스페이스 멤버의 명부별 규율 동의 — lists.rules_version 과 비교';

ALTER TABLE public.list_rules_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "list_rules_acceptances_select_own"
  ON public.list_rules_acceptances;
CREATE POLICY "list_rules_acceptances_select_own"
  ON public.list_rules_acceptances
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "list_rules_acceptances_insert_member"
  ON public.list_rules_acceptances;
CREATE POLICY "list_rules_acceptances_insert_member"
  ON public.list_rules_acceptances
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.shareholder_lists sl
      INNER JOIN public.workspace_members wm
        ON wm.workspace_id = sl.workspace_id
       AND wm.user_id = auth.uid()
      WHERE sl.id = list_id
    )
  );

DROP POLICY IF EXISTS "list_rules_acceptances_update_own"
  ON public.list_rules_acceptances;
CREATE POLICY "list_rules_acceptances_update_own"
  ON public.list_rules_acceptances
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.shareholder_lists sl
      INNER JOIN public.workspace_members wm
        ON wm.workspace_id = sl.workspace_id
       AND wm.user_id = auth.uid()
      WHERE sl.id = list_id
    )
  );

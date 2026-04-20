-- RLS for plan tables + storage policies (run after 20260417120000)

ALTER TABLE public.list_rules_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_upload_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excel_import_staging ENABLE ROW LEVEL SECURITY;

-- list_rules_acceptances: 본인 행 읽기/쓰기 + 같은 워크스페이스 멤버는 읽기
CREATE POLICY list_rules_acceptances_select ON public.list_rules_acceptances
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.shareholder_lists sl
      WHERE sl.id = list_rules_acceptances.list_id
        AND public.is_workspace_member(sl.workspace_id)
    )
  );

CREATE POLICY list_rules_acceptances_insert ON public.list_rules_acceptances
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.shareholder_lists sl
      WHERE sl.id = list_rules_acceptances.list_id
        AND public.is_workspace_member(sl.workspace_id)
    )
  );

CREATE POLICY list_rules_acceptances_update ON public.list_rules_acceptances
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.shareholder_lists sl
      WHERE sl.id = list_rules_acceptances.list_id
        AND public.is_workspace_member(sl.workspace_id)
    )
  );

-- QR 토큰: 워크스페이스 관리자만 발급·조회
CREATE POLICY list_upload_tokens_select ON public.list_upload_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shareholder_lists sl
      WHERE sl.id = list_upload_tokens.list_id
        AND public.is_workspace_member(sl.workspace_id)
    )
  );

CREATE POLICY list_upload_tokens_insert ON public.list_upload_tokens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shareholder_lists sl
      WHERE sl.id = list_upload_tokens.list_id
        AND public.can_write_workspace(sl.workspace_id)
    )
  );

CREATE POLICY list_upload_tokens_delete ON public.list_upload_tokens
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.shareholder_lists sl
      WHERE sl.id = list_upload_tokens.list_id
        AND public.can_write_workspace(sl.workspace_id)
    )
  );

-- 엑셀 보류 행: 명부가 속한 워크스페이스 멤버
CREATE POLICY excel_import_staging_select ON public.excel_import_staging
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shareholder_lists sl
      WHERE sl.id = excel_import_staging.list_id
        AND public.is_workspace_member(sl.workspace_id)
    )
  );

CREATE POLICY excel_import_staging_insert ON public.excel_import_staging
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.shareholder_lists sl
      WHERE sl.id = excel_import_staging.list_id
        AND public.is_workspace_member(sl.workspace_id)
    )
  );

CREATE POLICY excel_import_staging_update ON public.excel_import_staging
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shareholder_lists sl
      WHERE sl.id = excel_import_staging.list_id
        AND public.can_write_workspace(sl.workspace_id)
    )
  );

CREATE POLICY excel_import_staging_delete ON public.excel_import_staging
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.shareholder_lists sl
      WHERE sl.id = excel_import_staging.list_id
        AND public.can_write_workspace(sl.workspace_id)
    )
  );

-- Storage: shareholder-photos — 앱에서 list_id 경로를 강제; 세밀한 경로 RLS는 대시보드에서 추가 가능
CREATE POLICY storage_shareholder_photos_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'shareholder-photos');

CREATE POLICY storage_shareholder_photos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shareholder-photos');

CREATE POLICY storage_shareholder_photos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'shareholder-photos')
  WITH CHECK (bucket_id = 'shareholder-photos');

CREATE POLICY storage_shareholder_photos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'shareholder-photos');

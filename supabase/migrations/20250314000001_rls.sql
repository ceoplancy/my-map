-- Enable RLS on all platform tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shareholder_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shareholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shareholder_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_agent_activity_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_requests ENABLE ROW LEVEL SECURITY;

-- Helper: current user is service_admin
CREATE OR REPLACE FUNCTION public.is_service_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = auth.uid() AND role = 'service_admin' AND workspace_id IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: current user is member of workspace (or service_admin)
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean AS $$
  SELECT public.is_service_admin() OR EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = auth.uid() AND workspace_id = ws_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: current user can write to workspace (top_admin or admin or service_admin)
CREATE OR REPLACE FUNCTION public.can_write_workspace(ws_id uuid)
RETURNS boolean AS $$
  SELECT public.is_service_admin() OR EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = auth.uid() AND workspace_id = ws_id AND role IN ('top_admin', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: current user can read shareholder (member of list's workspace; if field_agent then list in allowed_list_ids)
CREATE OR REPLACE FUNCTION public.can_read_shareholder(sh_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shareholders s
    JOIN public.shareholder_lists sl ON sl.id = s.list_id
    JOIN public.workspace_members wm ON wm.workspace_id = sl.workspace_id AND wm.user_id = auth.uid()
    WHERE s.id = sh_id
    AND (wm.role IN ('service_admin', 'top_admin', 'admin') OR (wm.role = 'field_agent' AND sl.id = ANY(wm.allowed_list_ids)))
  ) OR (SELECT public.is_service_admin());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- workspaces: members read; top_admin/admin/service_admin write
CREATE POLICY workspaces_select ON public.workspaces FOR SELECT USING (public.is_workspace_member(id));
CREATE POLICY workspaces_insert ON public.workspaces FOR INSERT WITH CHECK (public.is_service_admin());
CREATE POLICY workspaces_update ON public.workspaces FOR UPDATE USING (public.can_write_workspace(id));

-- workspace_members: members of that workspace can select; top_admin/service_admin can insert/update/delete
CREATE POLICY workspace_members_select ON public.workspace_members FOR SELECT USING (
  public.is_service_admin() OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
);
CREATE POLICY workspace_members_insert ON public.workspace_members FOR INSERT WITH CHECK (
  public.is_service_admin() OR (workspace_id IS NOT NULL AND public.can_write_workspace(workspace_id))
);
CREATE POLICY workspace_members_update ON public.workspace_members FOR UPDATE USING (
  public.is_service_admin() OR (workspace_id IS NOT NULL AND public.can_write_workspace(workspace_id))
);
CREATE POLICY workspace_members_delete ON public.workspace_members FOR DELETE USING (
  public.is_service_admin() OR (workspace_id IS NOT NULL AND public.can_write_workspace(workspace_id))
);

-- shareholder_lists: workspace members read; top_admin/admin write
CREATE POLICY shareholder_lists_select ON public.shareholder_lists FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY shareholder_lists_insert ON public.shareholder_lists FOR INSERT WITH CHECK (public.can_write_workspace(workspace_id));
CREATE POLICY shareholder_lists_update ON public.shareholder_lists FOR UPDATE USING (public.can_write_workspace(workspace_id));
CREATE POLICY shareholder_lists_delete ON public.shareholder_lists FOR DELETE USING (public.can_write_workspace(workspace_id));

-- shareholders: read via can_read_shareholder; write via workspace write + same list access
CREATE POLICY shareholders_select ON public.shareholders FOR SELECT USING (public.can_read_shareholder(id));
CREATE POLICY shareholders_insert ON public.shareholders FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shareholder_lists sl
    WHERE sl.id = list_id AND public.can_write_workspace(sl.workspace_id)
  )
);
CREATE POLICY shareholders_update ON public.shareholders FOR UPDATE USING (public.can_read_shareholder(id));
CREATE POLICY shareholders_delete ON public.shareholders FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.shareholder_lists sl
    JOIN public.workspace_members wm ON wm.workspace_id = sl.workspace_id AND wm.user_id = auth.uid()
    WHERE sl.id = shareholders.list_id AND (wm.role IN ('top_admin', 'admin') OR public.is_service_admin())
  )
);

-- shareholder_change_history: read if can read shareholder
CREATE POLICY shareholder_change_history_select ON public.shareholder_change_history FOR SELECT USING (
  public.can_read_shareholder(shareholder_id)
);
CREATE POLICY shareholder_change_history_insert ON public.shareholder_change_history FOR INSERT WITH CHECK (true);

-- signup_requests: service_admin only
CREATE POLICY signup_requests_select ON public.signup_requests FOR SELECT USING (public.is_service_admin());
CREATE POLICY signup_requests_insert ON public.signup_requests FOR INSERT WITH CHECK (true);
CREATE POLICY signup_requests_update ON public.signup_requests FOR UPDATE USING (public.is_service_admin());

-- field_agent_activity_photos: workspace members
CREATE POLICY field_agent_activity_photos_select ON public.field_agent_activity_photos FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY field_agent_activity_photos_insert ON public.field_agent_activity_photos FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

-- resource_requests: service_admin can read all; requester can insert
CREATE POLICY resource_requests_select ON public.resource_requests FOR SELECT USING (public.is_service_admin() OR requested_by = auth.uid());
CREATE POLICY resource_requests_insert ON public.resource_requests FOR INSERT WITH CHECK (requested_by = auth.uid());

-- Platform schema: enums and tables
CREATE TYPE public.account_type AS ENUM ('listed_company', 'proxy_company');
CREATE TYPE public.workspace_role AS ENUM ('service_admin', 'top_admin', 'admin', 'field_agent');
CREATE TYPE public.signup_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_type public.account_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL,
  allowed_list_ids uuid[] DEFAULT '{}',
  is_team_leader boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_members_service_admin_workspace
    CHECK (
      (role = 'service_admin' AND workspace_id IS NULL) OR
      (role != 'service_admin' AND workspace_id IS NOT NULL)
    ),
  CONSTRAINT workspace_members_unique_user_workspace UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON public.workspace_members(user_id);

CREATE TABLE public.shareholder_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  active_from date,
  active_to date,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shareholder_lists_workspace_id ON public.shareholder_lists(workspace_id);

CREATE TABLE public.shareholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.shareholder_lists(id) ON DELETE CASCADE,
  name text,
  address text,
  lat double precision,
  lng double precision,
  latlngaddress text,
  company text,
  status text,
  stocks bigint NOT NULL DEFAULT 0,
  memo text,
  maker text,
  image text,
  history jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shareholders_list_id ON public.shareholders(list_id);
CREATE INDEX idx_shareholders_status ON public.shareholders(status);
CREATE INDEX idx_shareholders_lat_lng ON public.shareholders(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE TABLE public.shareholder_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shareholder_id uuid NOT NULL REFERENCES public.shareholders(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  field text NOT NULL,
  old_value text,
  new_value text
);

CREATE INDEX idx_shareholder_change_history_shareholder_id ON public.shareholder_change_history(shareholder_id);

CREATE TABLE public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  account_type public.account_type NOT NULL,
  workspace_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.signup_request_status NOT NULL DEFAULT 'pending',
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signup_requests_email_unique UNIQUE (email)
);

CREATE INDEX idx_signup_requests_status ON public.signup_requests(status);

CREATE TABLE public.field_agent_activity_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_field_agent_activity_photos_workspace_user ON public.field_agent_activity_photos(workspace_id, user_id);

CREATE TABLE public.resource_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_resource_requests_created_at ON public.resource_requests(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER shareholder_lists_updated_at BEFORE UPDATE ON public.shareholder_lists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER shareholders_updated_at BEFORE UPDATE ON public.shareholders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

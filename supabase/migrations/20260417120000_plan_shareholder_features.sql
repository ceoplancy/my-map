-- Run once in Supabase SQL editor or: supabase db push
-- After apply: configure storage RLS for bucket shareholder-photos and table RLS via dashboard if needed.

ALTER TABLE public.shareholder_lists
  ADD COLUMN IF NOT EXISTS contact_phone text NULL,
  ADD COLUMN IF NOT EXISTS contact_note text NULL,
  ADD COLUMN IF NOT EXISTS rules_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

ALTER TABLE public.shareholders
  ADD COLUMN IF NOT EXISTS address_original text NULL,
  ADD COLUMN IF NOT EXISTS geocode_status text NULL DEFAULT 'ok';

CREATE TABLE IF NOT EXISTS public.list_rules_acceptances (
  list_id uuid NOT NULL REFERENCES public.shareholder_lists (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rules_version integer NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, user_id)
);

CREATE INDEX IF NOT EXISTS list_rules_acceptances_user_id_idx
  ON public.list_rules_acceptances (user_id);

CREATE TABLE IF NOT EXISTS public.list_upload_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.shareholder_lists (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS list_upload_tokens_list_id_idx ON public.list_upload_tokens (list_id);

CREATE TABLE IF NOT EXISTS public.excel_import_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.shareholder_lists (id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  row_data jsonb NOT NULL,
  original_address text NULL,
  stocks integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued',
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS excel_import_staging_list_status_idx
  ON public.excel_import_staging (list_id, status);

INSERT INTO storage.buckets (id, name, public)
VALUES ('shareholder-photos', 'shareholder-photos', true)
ON CONFLICT (id) DO NOTHING;

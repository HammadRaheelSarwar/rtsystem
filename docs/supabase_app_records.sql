-- Persistent application record store for the RT Inquiry system.
-- Run this once in the Supabase SQL Editor before deploying the matching API.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.app_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_records_collection_idx
  ON public.app_records (collection);

CREATE INDEX IF NOT EXISTS app_records_collection_updated_idx
  ON public.app_records (collection, updated_at DESC);

CREATE INDEX IF NOT EXISTS app_records_data_gin_idx
  ON public.app_records USING GIN (data jsonb_path_ops);

CREATE UNIQUE INDEX IF NOT EXISTS app_records_users_email_unique
  ON public.app_records (LOWER(data->>'email')) WHERE collection = 'users';

CREATE UNIQUE INDEX IF NOT EXISTS app_records_roles_name_unique
  ON public.app_records ((data->>'name')) WHERE collection = 'roles';

CREATE UNIQUE INDEX IF NOT EXISTS app_records_departments_code_unique
  ON public.app_records ((data->>'code')) WHERE collection = 'departments';

CREATE UNIQUE INDEX IF NOT EXISTS app_records_clients_code_unique
  ON public.app_records ((data->>'clientCode')) WHERE collection = 'clients';

CREATE UNIQUE INDEX IF NOT EXISTS app_records_settings_key_unique
  ON public.app_records ((data->>'key')) WHERE collection = 'system_settings';

ALTER TABLE public.app_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages application records" ON public.app_records;
CREATE POLICY "Service role manages application records"
  ON public.app_records
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Application files are stored in the private bucket created by the API.
-- The service-role-backed API is the only public access path.

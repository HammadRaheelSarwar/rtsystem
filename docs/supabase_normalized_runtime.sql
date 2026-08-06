-- Runtime compatibility for the normalized RT Inquiry schema.
-- Keeps application data in its dedicated relational table while preserving
-- form fields that do not yet have a first-class column in table-local metadata.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- The application owns authentication and password hashing. Profiles therefore
-- use stable application UUIDs rather than requiring a matching auth.users row.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS refresh_tokens JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  approvers JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  table_name TEXT;
  runtime_tables TEXT[] := ARRAY[
    'departments','roles','profiles','clients','inquiries','inquiry_taking_forms',
    'estimation_reviews','job_inquiry_forms','jif_building_parameters',
    'jif_roof_wall_conditions','jif_claddings','jif_insulations','jif_accessories',
    'jif_canopies','jif_surface_paint_specs','jif_design_loads','jif_comments',
    'jif_checklist_items','design_tasks','design_queries','design_query_responses',
    'design_weight_summaries','dws_buildings','costing_sheets','costing_items',
    'material_rates','tax_settings','commercial_proposals','technical_proposals',
    'proposal_drawings','gm_reviews','gm_review_items','sales_submissions','follow_ups',
    'inquiry_outcomes','documents','notifications','activity_logs','workflow_history',
    'workflow_transitions','system_settings','approval_rules'
  ];
BEGIN
  FOREACH table_name IN ARRAY runtime_tables LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT ''{}''::jsonb', table_name);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()', table_name);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('DROP POLICY IF EXISTS "Allow service role full access" ON public.%I', table_name);
      EXECUTE format('CREATE POLICY "Allow service role full access" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', table_name);
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique ON public.profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS profiles_role_id_idx ON public.profiles (role_id);
CREATE INDEX IF NOT EXISTS profiles_department_id_idx ON public.profiles (department_id);

NOTIFY pgrst, 'reload schema';

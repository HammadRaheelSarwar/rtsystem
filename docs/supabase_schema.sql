-- Supabase Enterprise PostgreSQL Schema for RT System (40 Relational Tables)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. SYSTEM BASE TABLES (Departments, Roles, Profiles)
-- ============================================================================

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Profiles (References auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  employee_code TEXT UNIQUE,
  email TEXT NOT NULL,
  phone TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  designation TEXT,
  avatar_url TEXT,
  digital_signature_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CLIENTS AND INQUIRIES
-- ============================================================================

-- 4. Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  designation TEXT,
  email TEXT,
  phone TEXT,
  alternate_phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  industry TEXT,
  website TEXT,
  tax_number TEXT,
  notes TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 5. Inquiries
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_number TEXT UNIQUE NOT NULL,
  revision_number INTEGER DEFAULT 0,
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
  consultant_name TEXT,
  project_name TEXT NOT NULL,
  project_description TEXT,
  project_location TEXT,
  inquiry_type TEXT,
  urgency TEXT DEFAULT 'NORMAL',
  quote_basis TEXT,
  proposal_submission_date DATE,
  design_required_date DATE,
  source TEXT,
  priority TEXT DEFAULT 'NORMAL',
  current_status TEXT DEFAULT 'DRAFT',
  current_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  final_result TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  gm_approved_at TIMESTAMPTZ,
  forwarded_to_sales_at TIMESTAMPTZ,
  submitted_to_client_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_inquiry_revision UNIQUE (inquiry_number, revision_number)
);

-- ============================================================================
-- 3. SALES AND ITF TABLES
-- ============================================================================

-- 6. Inquiry Taking Forms (ITF)
CREATE TABLE IF NOT EXISTS inquiry_taking_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID UNIQUE NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  quantity_of_buildings INTEGER,
  building_usage TEXT,
  approximate_width NUMERIC(12,3),
  approximate_length NUMERIC(12,3),
  approximate_height NUMERIC(12,3),
  approximate_area NUMERIC(14,3),
  unit_of_measurement TEXT,
  site_conditions TEXT,
  client_specifications TEXT,
  special_requirements TEXT,
  sales_remarks TEXT,
  status TEXT DEFAULT 'DRAFT',
  submitted_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Estimation Reviews
CREATE TABLE IF NOT EXISTS estimation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  itf_id UUID REFERENCES inquiry_taking_forms(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decision TEXT, -- Accepted/Returned/Clarification Required
  comments TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. JIF TABLES
-- ============================================================================

-- 8. Job Inquiry Forms (JIF Header)
CREATE TABLE IF NOT EXISTS job_inquiry_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  revision_number INTEGER DEFAULT 0,
  revision_cause TEXT,
  from_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  to_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  quantity_identical_buildings INTEGER,
  usage TEXT,
  unit_of_measurement TEXT,
  area NUMERIC(14,3),
  installation_site_condition TEXT,
  hse_level TEXT,
  prepared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  prepared_date DATE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'DRAFT',
  is_current_revision BOOLEAN DEFAULT TRUE,
  submitted_to_design_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_jif_revision UNIQUE (inquiry_id, revision_number)
);

-- 9. JIF Building Parameters
CREATE TABLE IF NOT EXISTS jif_building_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jif_id UUID UNIQUE NOT NULL REFERENCES job_inquiry_forms(id) ON DELETE CASCADE,
  frame_type TEXT,
  width NUMERIC(12,3),
  width_modules JSONB DEFAULT '{}'::jsonb,
  gable_extension TEXT,
  eave_extension TEXT,
  left_end_wall_condition TEXT,
  right_end_wall_condition TEXT,
  end_wall_spacing TEXT,
  side_wall_girt_type TEXT,
  end_wall_girt_type TEXT,
  length NUMERIC(12,3),
  bay_spacing TEXT,
  clear_height NUMERIC(12,3),
  eave_height NUMERIC(12,3),
  clear_ridge_height NUMERIC(12,3),
  ridge_line_position TEXT,
  finished_floor_level TEXT,
  roof_slope TEXT,
  brick_wall_height NUMERIC(12,3),
  bracing_type TEXT,
  storm_water_drainage TEXT,
  building_shape TEXT,
  steel_column_start_level TEXT,
  impact_on_existing_structure TEXT,
  connection_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. JIF Roof & Wall Conditions
CREATE TABLE IF NOT EXISTS jif_roof_wall_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jif_id UUID NOT NULL REFERENCES job_inquiry_forms(id) ON DELETE CASCADE,
  location TEXT,
  condition_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. JIF Claddings
CREATE TABLE IF NOT EXISTS jif_claddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jif_id UUID NOT NULL REFERENCES job_inquiry_forms(id) ON DELETE CASCADE,
  location TEXT,
  thickness TEXT,
  description TEXT,
  profile TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. JIF Insulations
CREATE TABLE IF NOT EXISTS jif_insulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jif_id UUID NOT NULL REFERENCES job_inquiry_forms(id) ON DELETE CASCADE,
  location TEXT,
  thickness TEXT,
  description TEXT,
  density TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. JIF Accessories
CREATE TABLE IF NOT EXISTS jif_accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jif_id UUID NOT NULL REFERENCES job_inquiry_forms(id) ON DELETE CASCADE,
  location TEXT,
  quantity NUMERIC(12,2),
  unit TEXT,
  description TEXT,
  dimensions TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. JIF Canopies
CREATE TABLE IF NOT EXISTS jif_canopies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jif_id UUID NOT NULL REFERENCES job_inquiry_forms(id) ON DELETE CASCADE,
  quantity_identical INTEGER,
  location TEXT,
  eave_condition TEXT,
  width NUMERIC(12,3),
  length NUMERIC(12,3),
  clear_height NUMERIC(12,3),
  soffit_panel_included BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. JIF Surface Paint Specs
CREATE TABLE IF NOT EXISTS jif_surface_paint_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jif_id UUID UNIQUE NOT NULL REFERENCES job_inquiry_forms(id) ON DELETE CASCADE,
  primary_steel_surface_preparation TEXT,
  secondary_steel_surface_preparation TEXT,
  primer TEXT,
  primer_thickness TEXT,
  paint_system TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. JIF Design Loads
CREATE TABLE IF NOT EXISTS jif_design_loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jif_id UUID UNIQUE NOT NULL REFERENCES job_inquiry_forms(id) ON DELETE CASCADE,
  dead_load NUMERIC(12,3),
  live_load NUMERIC(12,3),
  collateral_load NUMERIC(12,3),
  solar_load NUMERIC(12,3),
  wind_speed NUMERIC(12,3),
  earthquake_zone TEXT,
  design_software TEXT,
  enclosure_condition TEXT,
  exposure TEXT,
  rainfall_intensity NUMERIC(12,3),
  future_extension TEXT,
  design_vetting_authority TEXT,
  special_design_conditions TEXT,
  project_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. JIF Comments
CREATE TABLE IF NOT EXISTS jif_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jif_id UUID UNIQUE NOT NULL REFERENCES job_inquiry_forms(id) ON DELETE CASCADE,
  minimum_plate_thickness TEXT,
  steel_grade TEXT,
  wall_girt_design TEXT,
  column_base_reactions TEXT,
  inquiry_type_notes TEXT,
  important_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. JIF Checklist Items
CREATE TABLE IF NOT EXISTS jif_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jif_id UUID NOT NULL REFERENCES job_inquiry_forms(id) ON DELETE CASCADE,
  checklist_code TEXT NOT NULL,
  checklist_label TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  remarks TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. DESIGN TABLES
-- ============================================================================

-- 19. Design Tasks
CREATE TABLE IF NOT EXISTS design_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID UNIQUE NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  jif_id UUID REFERENCES job_inquiry_forms(id) ON DELETE SET NULL,
  assigned_designer UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_date DATE,
  target_date DATE,
  actual_completion_date DATE,
  priority TEXT DEFAULT 'NORMAL',
  status TEXT DEFAULT 'PENDING',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Design Queries
CREATE TABLE IF NOT EXISTS design_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  design_task_id UUID REFERENCES design_tasks(id) ON DELETE CASCADE,
  query_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  raised_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'NORMAL',
  status TEXT DEFAULT 'OPEN',
  raised_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Design Query Responses
CREATE TABLE IF NOT EXISTS design_query_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES design_queries(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. DESIGN WEIGHT SUMMARY (DWS) TABLES
-- ============================================================================

-- 22. Design Weight Summaries
CREATE TABLE IF NOT EXISTS design_weight_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  design_task_id UUID REFERENCES design_tasks(id) ON DELETE SET NULL,
  revision_number INTEGER DEFAULT 0,
  prepared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  checked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completion_date DATE,
  design_assumptions TEXT,
  drawing_references TEXT,
  remarks TEXT,
  status TEXT DEFAULT 'DRAFT',
  is_current_revision BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. DWS Buildings
CREATE TABLE IF NOT EXISTS dws_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dws_id UUID NOT NULL REFERENCES design_weight_summaries(id) ON DELETE CASCADE,
  building_name TEXT,
  building_number TEXT,
  building_area NUMERIC(14,3),
  main_frame_weight NUMERIC(14,3),
  secondary_steel_weight NUMERIC(14,3),
  bracing_weight NUMERIC(14,3),
  cladding_weight NUMERIC(14,3),
  accessories_weight NUMERIC(14,3),
  canopy_weight NUMERIC(14,3),
  miscellaneous_weight NUMERIC(14,3),
  total_steel_weight NUMERIC(14,3),
  weight_per_sqft NUMERIC(14,4),
  weight_per_sqm NUMERIC(14,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. COSTING TABLES
-- ============================================================================

-- 24. Costing Sheets
CREATE TABLE IF NOT EXISTS costing_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  dws_id UUID REFERENCES design_weight_summaries(id) ON DELETE SET NULL,
  revision_number INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  exchange_rate NUMERIC(14,6) DEFAULT 1,
  building_area NUMERIC(14,3),
  building_weight NUMERIC(14,3),
  weight_per_sqft NUMERIC(14,4),
  weight_per_sqm NUMERIC(14,4),
  material_subtotal NUMERIC(18,2),
  service_subtotal NUMERIC(18,2),
  subtotal NUMERIC(18,2),
  overhead_percentage NUMERIC(7,3),
  overhead_amount NUMERIC(18,2),
  profit_percentage NUMERIC(7,3),
  profit_amount NUMERIC(18,2),
  discount_percentage NUMERIC(7,3),
  discount_amount NUMERIC(18,2),
  tax_percentage NUMERIC(7,3),
  tax_amount NUMERIC(18,2),
  final_quotation_amount NUMERIC(18,2),
  price_per_sqft NUMERIC(18,4),
  price_per_sqm NUMERIC(18,4),
  price_per_kg NUMERIC(18,4),
  calculation_snapshot JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'DRAFT',
  is_current_revision BOOLEAN DEFAULT TRUE,
  prepared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. Costing Items
CREATE TABLE IF NOT EXISTS costing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  costing_sheet_id UUID NOT NULL REFERENCES costing_sheets(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- MATERIAL, SERVICE, TRANSPORT, FABRICATION, ERECTION, DESIGN, OTHER
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(14,3),
  unit TEXT,
  unit_rate NUMERIC(18,4),
  amount NUMERIC(18,2),
  rate_source TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. Material Rates
CREATE TABLE IF NOT EXISTS material_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT,
  item_name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  rate NUMERIC(18,4) NOT NULL,
  currency TEXT DEFAULT 'BDT',
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. Tax Settings
CREATE TABLE IF NOT EXISTS tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_name TEXT NOT NULL,
  tax_code TEXT,
  percentage NUMERIC(7,3) NOT NULL,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. PROPOSAL TABLES
-- ============================================================================

-- 28. Commercial Proposals
CREATE TABLE IF NOT EXISTS commercial_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  costing_sheet_id UUID REFERENCES costing_sheets(id) ON DELETE SET NULL,
  proposal_number TEXT,
  revision_number INTEGER DEFAULT 0,
  scope_of_supply TEXT,
  quoted_amount NUMERIC(18,2),
  currency TEXT DEFAULT 'BDT',
  tax_details TEXT,
  payment_terms TEXT,
  delivery_period TEXT,
  proposal_validity TEXT,
  warranty TEXT,
  exclusions TEXT,
  commercial_terms TEXT,
  general_terms TEXT,
  status TEXT DEFAULT 'DRAFT',
  is_locked BOOLEAN DEFAULT FALSE,
  prepared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 29. Technical Proposals
CREATE TABLE IF NOT EXISTS technical_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  revision_number INTEGER DEFAULT 0,
  project_overview TEXT,
  scope_of_work TEXT,
  building_specifications JSONB DEFAULT '{}'::jsonb,
  design_parameters JSONB DEFAULT '{}'::jsonb,
  design_loads JSONB DEFAULT '{}'::jsonb,
  material_specifications JSONB DEFAULT '{}'::jsonb,
  roof_specifications TEXT,
  wall_specifications TEXT,
  cladding_specifications TEXT,
  insulation_specifications TEXT,
  accessories TEXT,
  canopies TEXT,
  surface_preparation TEXT,
  paint_specification TEXT,
  design_codes TEXT,
  standards TEXT,
  exclusions TEXT,
  technical_notes TEXT,
  status TEXT DEFAULT 'DRAFT',
  is_locked BOOLEAN DEFAULT FALSE,
  prepared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 30. Proposal Drawings
CREATE TABLE IF NOT EXISTS proposal_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  drawing_number TEXT NOT NULL,
  drawing_title TEXT NOT NULL,
  revision_number INTEGER DEFAULT 0,
  drawing_type TEXT,
  prepared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  checked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  issue_date DATE,
  storage_path TEXT,
  status TEXT DEFAULT 'DRAFT',
  is_locked BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. GM REVIEW TABLES
-- ============================================================================

-- 31. GM Reviews
CREATE TABLE IF NOT EXISTS gm_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_date TIMESTAMPTZ,
  decision TEXT DEFAULT 'PENDING', -- APPROVED, REVISION_REQUIRED, RETURNED_TO_ESTIMATION, RETURNED_TO_DESIGN, REJECTED
  comments TEXT,
  approval_number TEXT,
  digital_signature_path TEXT,
  approved_revision INTEGER,
  forwarded_to_sales BOOLEAN DEFAULT FALSE,
  forwarded_to_sales_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  forwarded_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 32. GM Review Items
CREATE TABLE IF NOT EXISTS gm_review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gm_review_id UUID NOT NULL REFERENCES gm_reviews(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_id UUID,
  review_status TEXT,
  comments TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. SALES SUBMISSION AND OUTCOME TABLES
-- ============================================================================

-- 33. Sales Submissions
CREATE TABLE IF NOT EXISTS sales_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID UNIQUE NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  gm_review_id UUID REFERENCES gm_reviews(id) ON DELETE SET NULL,
  proposal_received_date TIMESTAMPTZ,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  submission_date TIMESTAMPTZ,
  submission_method TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  recipient_phone TEXT,
  client_acknowledgement TEXT,
  proof_storage_path TEXT,
  next_follow_up_date DATE,
  submission_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 34. Follow Ups
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  sales_submission_id UUID REFERENCES sales_submissions(id) ON DELETE CASCADE,
  follow_up_date TIMESTAMPTZ NOT NULL,
  follow_up_type TEXT,
  contact_person TEXT,
  discussion_summary TEXT,
  client_response TEXT,
  next_action TEXT,
  next_follow_up_date DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 35. Inquiry Outcomes
CREATE TABLE IF NOT EXISTS inquiry_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID UNIQUE NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  result TEXT NOT NULL, -- WON / LOST / CANCELLED
  lost_reason TEXT,
  final_agreed_value NUMERIC(18,2),
  award_date DATE,
  purchase_order_number TEXT,
  purchase_order_storage_path TEXT,
  expected_project_start_date DATE,
  closed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. SHARED SYSTEM TABLES
-- ============================================================================

-- 36. Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_number TEXT,
  title TEXT NOT NULL,
  revision_number INTEGER DEFAULT 0,
  bucket_name TEXT DEFAULT 'documents',
  storage_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'ACTIVE',
  is_locked BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 37. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  notification_type TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 38. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 39. Workflow History
CREATE TABLE IF NOT EXISTS workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  from_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  to_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 40. Workflow Transitions
CREATE TABLE IF NOT EXISTS workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  allowed_role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  required_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  requires_comment BOOLEAN DEFAULT FALSE,
  requires_gm_approval BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- INDEXES FOR ESSENTIAL PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_inquiries_inquiry_number ON inquiries(inquiry_number);
CREATE INDEX IF NOT EXISTS idx_inquiries_client_id ON inquiries(client_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_current_status ON inquiries(current_status);
CREATE INDEX IF NOT EXISTS idx_inquiries_current_department ON inquiries(current_department_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_to ON inquiries(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);

CREATE INDEX IF NOT EXISTS idx_jif_inquiry_revision ON job_inquiry_forms(inquiry_id, revision_number);
CREATE INDEX IF NOT EXISTS idx_design_tasks_assigned ON design_tasks(assigned_designer, status);
CREATE INDEX IF NOT EXISTS idx_design_queries_status ON design_queries(inquiry_id, status);
CREATE INDEX IF NOT EXISTS idx_costing_sheets_revision ON costing_sheets(inquiry_id, revision_number);
CREATE INDEX IF NOT EXISTS idx_gm_reviews_decision ON gm_reviews(inquiry_id, decision);
CREATE INDEX IF NOT EXISTS idx_follow_ups_next_date ON follow_ups(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_activity_logs_inquiry ON activity_logs(inquiry_id, created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_history_inquiry ON workflow_history(inquiry_id, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_inquiry_type ON documents(inquiry_id, document_type);

-- ============================================================================
-- SUPABASE AUTH AUTOMATIC PROFILE TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, is_active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    TRUE
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ============================================================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_taking_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_inquiry_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE jif_building_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE jif_roof_wall_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jif_claddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jif_insulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jif_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jif_canopies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jif_surface_paint_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jif_design_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE jif_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE jif_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_query_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_weight_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE dws_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE costing_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE costing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE technical_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gm_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE gm_review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_transitions ENABLE ROW LEVEL SECURITY;

-- Default permissive RLS policies for authenticated users
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users full access" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "Allow authenticated users full access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "Allow service role full access" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "Allow service role full access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- ============================================================================
-- SEED INITIAL SYSTEM DEPARTMENTS & ROLES
-- ============================================================================
INSERT INTO departments (name, code, description) VALUES
  ('Administration', 'ADMIN', 'System administration department'),
  ('Sales', 'SALES', 'Sales and client relationship management'),
  ('Estimation', 'ESTIMATION', 'Engineering estimation and costing'),
  ('Design', 'DESIGN', 'PEB structural design and drawings'),
  ('General Management', 'GENERAL_MANAGER', 'Executive review and approval management')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (name, code, description) VALUES
  ('Administrator', 'ADMIN', 'Full system access'),
  ('Sales User', 'SALES_USER', 'Sales pipeline management'),
  ('Estimator', 'ESTIMATION_USER', 'Costing and proposal generation'),
  ('Designer', 'DESIGN_USER', 'Design calculations and DWS'),
  ('General Manager', 'GENERAL_MANAGER', 'Proposal package approval and review')
ON CONFLICT (code) DO NOTHING;

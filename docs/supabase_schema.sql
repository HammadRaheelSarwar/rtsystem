-- Supabase PostgreSQL Schema for RT System

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  phone TEXT,
  designation TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  refresh_tokens JSONB DEFAULT '[]'::jsonb,
  last_login TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inquiries
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_number TEXT UNIQUE NOT NULL,
  revision_number INTEGER DEFAULT 0,
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
  consultant TEXT,
  project_name TEXT NOT NULL,
  project_description TEXT,
  project_location TEXT,
  inquiry_type TEXT,
  urgency TEXT DEFAULT 'NORMAL',
  quote_basis TEXT,
  proposal_submission_date TIMESTAMPTZ,
  design_required_date TIMESTAMPTZ,
  current_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
  current_status TEXT DEFAULT 'DRAFT',
  source TEXT,
  priority TEXT DEFAULT 'NORMAL',
  final_result JSONB DEFAULT '{}'::jsonb,
  approved_revision INTEGER,
  approved_at TIMESTAMPTZ,
  package_locked BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Inquiry Taking Form (ITF)
CREATE TABLE IF NOT EXISTS inquiry_taking_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID UNIQUE NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  revision INTEGER DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  client_info JSONB DEFAULT '{}'::jsonb,
  inquiry_info JSONB DEFAULT '{}'::jsonb,
  requirements JSONB DEFAULT '{}'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Design Queries
CREATE TABLE IF NOT EXISTS design_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  query_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  raised_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'NORMAL',
  status TEXT DEFAULT 'OPEN',
  response TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  raised_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  type TEXT DEFAULT 'ESTIMATION',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Job Inquiry Form (JIF)
CREATE TABLE IF NOT EXISTS job_inquiry_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  revision INTEGER DEFAULT 0,
  revision_cause TEXT,
  status TEXT DEFAULT 'DRAFT',
  general JSONB DEFAULT '{}'::jsonb,
  project JSONB DEFAULT '{}'::jsonb,
  building_parameters JSONB DEFAULT '{}'::jsonb,
  roof_wall_conditions JSONB DEFAULT '{}'::jsonb,
  cladding JSONB DEFAULT '[]'::jsonb,
  insulation JSONB DEFAULT '[]'::jsonb,
  accessories JSONB DEFAULT '[]'::jsonb,
  canopies JSONB DEFAULT '[]'::jsonb,
  paint_specification JSONB DEFAULT '{}'::jsonb,
  design_loads JSONB DEFAULT '{}'::jsonb,
  comments JSONB DEFAULT '{}'::jsonb,
  review JSONB DEFAULT '{}'::jsonb,
  checklist JSONB DEFAULT '{}'::jsonb,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inquiry_id, revision)
);

-- 9. Design Tasks
CREATE TABLE IF NOT EXISTS design_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID UNIQUE NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  assigned_designer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  start_date TIMESTAMPTZ,
  target_date TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'NORMAL',
  design_status TEXT DEFAULT 'PENDING',
  remarks TEXT,
  internal_notes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Design Weight Summary (DWS)
CREATE TABLE IF NOT EXISTS design_weight_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  revision INTEGER DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  buildings JSONB DEFAULT '[]'::jsonb,
  prepared_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  checked_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  completion_date TIMESTAMPTZ,
  remarks TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inquiry_id, revision)
);

-- 11. Costing Sheets
CREATE TABLE IF NOT EXISTS costing_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  revision INTEGER DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  basics JSONB DEFAULT '{}'::jsonb,
  material_costs JSONB DEFAULT '{}'::jsonb,
  service_costs JSONB DEFAULT '{}'::jsonb,
  commercial JSONB DEFAULT '{}'::jsonb,
  calculation_snapshot JSONB DEFAULT '{}'::jsonb,
  is_locked BOOLEAN DEFAULT FALSE,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inquiry_id, revision)
);

-- 12. Commercial Proposals
CREATE TABLE IF NOT EXISTS commercial_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  revision INTEGER DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  is_locked BOOLEAN DEFAULT FALSE,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  proposal_number TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project TEXT,
  scope_of_supply TEXT,
  quoted_amount NUMERIC,
  currency TEXT DEFAULT 'BDT',
  applicable_taxes TEXT,
  payment_terms TEXT,
  delivery_period TEXT,
  proposal_validity TEXT,
  warranty TEXT,
  exclusions TEXT,
  commercial_terms TEXT,
  general_terms_and_conditions TEXT,
  authorized_signatory_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inquiry_id, revision)
);

-- 13. Technical Proposals
CREATE TABLE IF NOT EXISTS technical_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  revision INTEGER DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  is_locked BOOLEAN DEFAULT FALSE,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  project_overview TEXT,
  scope_of_work TEXT,
  building_specifications TEXT,
  design_parameters TEXT,
  design_loads TEXT,
  material_specifications TEXT,
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
  drawing_references JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inquiry_id, revision)
);

-- 14. Proposal Drawings
CREATE TABLE IF NOT EXISTS proposal_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  revision INTEGER DEFAULT 0,
  status TEXT DEFAULT 'DRAFT',
  is_locked BOOLEAN DEFAULT FALSE,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  drawing_number TEXT NOT NULL,
  drawing_title TEXT NOT NULL,
  drawing_type TEXT,
  prepared_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  checked_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  issue_date TIMESTAMPTZ,
  document_id UUID,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inquiry_id, drawing_number, revision)
);

-- 15. GM Reviews
CREATE TABLE IF NOT EXISTS gm_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  review_date TIMESTAMPTZ,
  decision TEXT DEFAULT 'PENDING',
  comments TEXT,
  approval_number TEXT,
  digital_signature TEXT,
  approved_revision INTEGER,
  forwarded_to_sales BOOLEAN DEFAULT FALSE,
  forwarded_date TIMESTAMPTZ,
  checklist JSONB DEFAULT '{}'::jsonb,
  snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Sales Submissions
CREATE TABLE IF NOT EXISTS sales_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID UNIQUE NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  proposal_received_date TIMESTAMPTZ,
  submitted_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  submission_date TIMESTAMPTZ,
  submission_method TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  recipient_phone TEXT,
  client_acknowledgement TEXT,
  next_follow_up_date TIMESTAMPTZ,
  submission_remarks TEXT,
  proof_document_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Follow Ups
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  follow_up_date TIMESTAMPTZ NOT NULL,
  follow_up_type TEXT,
  contact_person TEXT,
  discussion_summary TEXT,
  client_response TEXT,
  next_action TEXT,
  next_follow_up_date TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_number TEXT,
  title TEXT NOT NULL,
  revision INTEGER DEFAULT 0,
  file_name TEXT,
  file_path TEXT,
  mime_type TEXT,
  file_size NUMERIC,
  uploaded_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'ACTIVE',
  is_locked BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  type TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Material Rates
CREATE TABLE IF NOT EXISTS material_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  rate NUMERIC NOT NULL,
  currency TEXT DEFAULT 'BDT',
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. Tax Settings
CREATE TABLE IF NOT EXISTS tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  percentage NUMERIC NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. Approval Rules
CREATE TABLE IF NOT EXISTS approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  required_role TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_client_code ON clients(client_code);

CREATE INDEX IF NOT EXISTS idx_inquiries_inquiry_number ON inquiries(inquiry_number);
CREATE INDEX IF NOT EXISTS idx_inquiries_client_id ON inquiries(client_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_current_status ON inquiries(current_status);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_id);

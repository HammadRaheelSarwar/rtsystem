# Feature Audit Against the Project Objective

Audit date: 2026-08-06

## Implemented

- Authentication, password reset, active/inactive accounts, roles and departments
- Client and inquiry creation, editing, searching, filtering and duplication, plus assignment and archive APIs
- ITF, estimation review, six-section JIF, design task, design queries, DWS and costing
- Commercial proposal, technical proposal, proposal drawings and locked proposal package
- GM review, approval, rejection, revision return and forwarding to Sales
- Client submission, follow-ups, negotiation notes and won/lost/cancelled outcomes
- Central document register with numbering, categories, preview, download, replacement, versions, revisions and lock status
- Query assignment/update APIs, response, resolution, reopen, history and ageing views
- In-system and SMTP-backed email notifications
- Role-specific Sales, Estimation, Design, GM and Admin dashboard metrics
- Inquiry reports, CSV export, management analytics, query ageing, workload, quotation and margin reporting
- Searchable administrator audit log
- Administrator system settings, company/email/dropdown/template categories and approval rules
- PDF proposal export, Excel DWS/costing export, and GM-only consolidated Word/Excel package exports with complete ITF, JIF, DWS, costing, proposal and drawing data

## Partial or deployment-dependent

- Supabase persistence: implemented through the normalized relational schema plus `docs/supabase_normalized_runtime.sql`. Existing JSONB records can be migrated with `npm run migrate:normalized`; new writes go directly to their dedicated tables.
- File persistence: implemented through the private Supabase Storage bucket configured by `SUPABASE_DOCUMENTS_BUCKET`. The API creates the bucket using the service-role key when the first document is uploaded.
- Email: implemented when valid SMTP environment variables are configured.
- Digital signatures: metadata fields exist, but certificate-backed signing is not implemented.
- Error logs: Vercel/runtime logs remain the operational source; the application audit log covers successful business actions.
- Deadline notifications: dashboard overdue calculations exist; scheduled reminder delivery requires a cron/automation deployment.

## Optional integrations not configured

- WhatsApp messaging
- ERP integration
- External client portal
- Company-specific APIs

These require provider credentials and an explicit integration choice; they are not safe to enable with placeholder implementations.

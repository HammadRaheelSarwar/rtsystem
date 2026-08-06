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
- PDF proposal export and Excel DWS/costing export

## Partial or deployment-dependent

- Supabase persistence: the checked-in normalized SQL schema and the document-style `SupabaseModel` adapter still use different field/table conventions. This must be reconciled before production data is reliable across Vercel function instances.
- File persistence: Vercel temporary storage supports request processing but is not durable. Production documents require Supabase Storage, S3, Azure Blob Storage or Cloudinary.
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

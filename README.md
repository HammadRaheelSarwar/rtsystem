# RT Inquiry & Proposal Management System

A full-stack application built with React, Express, and Supabase for controlling engineering inquiries from Sales intake through Estimation, Design, General Manager approval, client submission, negotiation and final outcome.

## Architecture Highlights

- **Supabase PostgreSQL Integration**: Uses `@supabase/supabase-js` with a 40-table relational schema ([docs/supabase_schema.sql](docs/supabase_schema.sql)) with primary keys, foreign key constraints, indexes, and Row Level Security (RLS).
- **Security & RBAC**: JWT access tokens plus rotating refresh-token cookies, account activation, password reset, RBAC and department-aware workflow actions.
- **Workflow State Machine**: Central backend state machine that rejects skipped stages. Client submission is impossible until the current revision is GM-approved and locked.
- **Complete Module Suite**: Client, inquiry, ITF, clarification, six-section JIF, Design task, DWS, Costing, Commercial/Technical Proposal, drawing register, GM review, Sales submission and follow-up modules.
- **Revision Locking & Audit Trails**: Optimistic concurrency, revision locking, calculation snapshots, soft deletion, centralized documents, audit timelines, notifications and live reports.
- **Vercel Cloud Deployment**: Pre-configured unified frontend + serverless Express API setup (`vercel.json` and `api/index.js`).

## Quick Setup

### Prerequisites
- Node.js 20+
- A Supabase Project ([app.supabase.com](https://app.supabase.com))

### 1. Database Setup
Copy and run the DDL script from [docs/supabase_schema.sql](docs/supabase_schema.sql) in your Supabase project's **SQL Editor**.

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Seed Master Data & Development Accounts
```bash
npm run seed
```

### 5. Run Locally
```bash
npm run dev
```
The React frontend runs at `http://localhost:5173`; the Express backend runs at `http://localhost:5000`.

## Testing

```bash
npm test
```

Runs Vitest test suites covering costing calculation snapshots, security & permission enforcement, and workflow state transition rules.

## Deployment to Vercel

1. Connect your GitHub repository to Vercel.
2. In **Project Settings**:
   - Set **Root Directory** to empty (`./`).
   - Add Environment Variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
3. Deploy!

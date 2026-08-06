# RT Inquiry & Proposal Management System

A full-stack MERN application for controlling engineering inquiries from Sales intake through Estimation, Design, General Manager approval, client submission, negotiation and final outcome.

## Highlights

- JWT access tokens plus rotating refresh-token cookies, account activation, password reset, RBAC and department-aware workflow actions.
- Central backend state machine that rejects skipped stages. Client submission is impossible until the current revision is GM-approved and locked.
- Client, inquiry, ITF, clarification, six-section JIF, Design task, DWS, Costing, Commercial/Technical Proposal, drawing register, GM review, Sales submission and follow-up modules.
- Optimistic concurrency, revision locking, calculation snapshots, soft deletion, centralized documents, audit timelines, notifications and live reports.
- Responsive React/Tailwind interface with role-based navigation, charts, filters, accessible forms, print styling and export actions.

## Local setup

Prerequisites: Node.js 22+, npm 10+ and MongoDB 7+.

1. Copy `.env.example` to `.env` and replace all secrets and the initial admin password.
2. Install both workspaces from the repository root:

   ```bash
   npm install
   ```

3. Seed roles, departments, users, rates, tax settings and the sample record:

   ```bash
   npm run seed
   ```

4. Start the API and Vite client:

   ```bash
   npm run dev
   ```

The client runs at `http://localhost:5173`; the API runs at `http://localhost:5000`.

Seeded non-production accounts are `sales@rt.com`, `estimation@rt.com`, `design@rt.com`, and `gm@rt.com`. Their initial passwords are defined in [the seed script](server/src/utils/seed.js) and must be changed or removed for a real deployment. The administrator is read from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Docker

Copy the environment file, change `MONGODB_URI` to `mongodb://mongo:27017/rt_inquiry`, then run:

```bash
docker compose up --build
docker compose exec server node src/utils/seed.js
```

Open `http://localhost:8080`.

## Workflow controls

All status changes go through `server/src/services/workflowService.js`. The service validates the source/target pair and acting role, assigns the next department, verifies all required package components before GM submission, requires comments on returns/revisions, locks every approved revision, and checks the lock before client submission. Changes after approval require a new inquiry revision.

## Testing and build

```bash
npm test
npm run build
```

The test suite covers costing snapshots, forbidden pre-approval Sales submission, approved-revision locking, and GM revision-stage reopening. Add integration tests with a dedicated MongoDB test URI for organization-specific permission matrices.

## Storage and email

Files are stored beneath `UPLOAD_PATH` with generated names, MIME allow-listing, a configurable maximum size, and database metadata. In production, mount this path on durable encrypted storage or replace the storage adapter with object storage. SMTP delivery activates when `SMTP_HOST` and credentials are present. Reset tokens must be inserted into an organization-approved email template before enabling password-reset mail in production.

## API

All responses use `{ success, data, meta? }`; failures use `{ success: false, error: { code, message, details? } }`. Bearer access tokens are required on protected endpoints. See [API documentation](docs/API.md).

## Production checklist

- Generate long independent JWT secrets, set `NODE_ENV=production`, enable TLS, and restrict `CLIENT_URL`.
- Change seeded passwords; configure SMTP, backups, retention, malware scanning and object storage.
- Put the API behind a reverse proxy/WAF and use a MongoDB replica set with authentication.
- Run tests and `npm run build` in CI; add organization-specific approval thresholds and document templates before go-live.

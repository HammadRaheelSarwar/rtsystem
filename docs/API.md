# REST API Reference

Base URL: `/api`. Protected calls use `Authorization: Bearer <accessToken>`. Refresh tokens are held in an HTTP-only, SameSite cookie.

## Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Sign in and set refresh cookie |
| POST | `/auth/refresh-token` | Rotate refresh token and return a new access token |
| POST | `/auth/forgot-password` | Start password reset without account enumeration |
| POST | `/auth/reset-password` | Consume a one-hour reset token |
| POST | `/auth/logout` | Revoke the active refresh token |
| GET | `/auth/profile` | Current user, role and department |

## Master and operational resources

- Users: `GET/POST /users`, `GET/PUT/DELETE /users/:id`, `PATCH /users/:id/status`
- Clients: `GET/POST /clients`, `GET/PUT/DELETE /clients/:id`
- Inquiries: `GET/POST /inquiries`, `GET/PUT/DELETE /inquiries/:id`, `PATCH /inquiries/:id/status`
- Timeline/package: `GET /inquiries/:id/timeline`, `GET /inquiries/:id/package`
- ITF: `POST/GET/PUT /inquiries/:id/itf`, `POST /inquiries/:id/itf/submit`
- JIF: `POST/GET/PUT /inquiries/:id/jif`, `POST /inquiries/:id/jif/revision`, `POST /inquiries/:id/jif/submit-to-design`
- Design: `POST/GET /inquiries/:id/design-task`, `PUT /design-tasks/:id`
- Queries: `POST/GET /inquiries/:id/design-queries`, `POST /design-queries/:id/respond`, `POST /design-queries/:id/resolve`
- DWS: `POST/GET/PUT /inquiries/:id/dws`, `POST /inquiries/:id/dws/submit`
- Costing: `POST/GET/PUT /inquiries/:id/costing`, `POST /inquiries/:id/costing/calculate`, `POST /inquiries/:id/costing/complete`
- Proposals: `POST/GET/PUT /inquiries/:id/{commercial-proposal|technical-proposal}` plus `/complete`
- Drawings: `POST/GET /inquiries/:id/drawings`
- GM: `POST/GET /inquiries/:id/gm-review`, plus `/approve`, `/request-revision`, `/reject`, `/forward-to-sales`
- Sales: `POST/GET /inquiries/:id/client-submission`, `POST/GET /inquiries/:id/follow-ups`, `PATCH /inquiries/:id/final-status`
- Documents: `POST/GET /inquiries/:id/documents`, `DELETE /documents/:id`
- Dashboard/reports: `GET /dashboard`, `GET /reports/summary`
- Exports: `GET /inquiries/:id/package/pdf`, `GET /inquiries/:id/{dws|costing}/excel`

## Workflow status change

`PATCH /inquiries/:id/status`

```json
{
  "status": "UNDER_ESTIMATION_REVIEW",
  "comments": "Optional except for returns or revision requests"
}
```

Invalid transitions return HTTP `409` with code `INVALID_TRANSITION` and the valid target statuses. Locked revision edits return HTTP `423` with code `REVISION_LOCKED`. Premature client submission returns HTTP `409` with code `GM_APPROVAL_REQUIRED`.

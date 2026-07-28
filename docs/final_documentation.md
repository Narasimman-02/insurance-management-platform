# Insurance Management Platform — Final Documentation

## Project summary
A full-stack insurance management system built over a 14-day internship
schedule. Covers the complete policy lifecycle: customer registration,
policy creation/renewal, premium tracking, claims processing, document
management, and business reporting — with role-based access for Admin,
Agent, and Customer accounts.

## Tech stack
| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind CSS |
| Backend | Python + Flask |
| Database | PostgreSQL + SQLAlchemy + Flask-Migrate |
| Auth | Flask-JWT-Extended + Flask-Bcrypt |
| Validation | Marshmallow |
| Charts | Chart.js |
| PDF/reporting groundwork | ReportLab (installed, not yet used — see Known gaps) |
| Deployment | Render (backend + PostgreSQL), Vercel (frontend) |

## Modules delivered (by day)
1. **Day 1–2** — Project scaffold, database models, JWT authentication
2. **Day 3** — Customer Management (CRUD, search, pagination, history)
3. **Day 4** — Policy Management (create, renew, cancel, expiry alerts)
4. **Day 5** — Premium Tracking (record payments, due dates, overdue alerts)
5. **Day 6** — Claim Management (submit, verify, approve/reject)
6. **Day 7** — Document Upload (identity/policy docs, download)
7. **Day 8** — Reports Dashboard (Chart.js: policies/claims by status, premium trends, customer growth)
8. **Day 9** — Search, Filters, Pagination (frontend UI catch-up)
9. **Day 10** — Role-Based Authorization audit (see `role_permissions.md`)
10. **Day 11** — Validation & Error Handling (Marshmallow schemas, global JSON error handlers)
11. **Day 12** — End-to-end test suite (`backend/scripts/day12_e2e_test.ps1`, 32/32 passing)
12. **Day 13** — Responsive Design (mobile sidebar drawer, responsive grids/forms/tables)
13. **Day 14** — Deployment (Render + Vercel) + this documentation

## User roles
- **Admin** — full access, including deleting customers and documents
- **Agent** — manages customers/policies/claims, cannot delete customers
- **Customer** — views policies/claims/payments, submits claims, pays premiums, uploads documents

Full permission matrix: `docs/role_permissions.md`

## Known gaps / honest limitations
These are called out deliberately rather than glossed over:

1. **Customer self-service scoping isn't fully wired.** The `Customer`
   model has a `user_id` foreign key to link a login account to a specific
   customer record, but registration doesn't set it yet, and routes don't
   filter by "the logged-in user's own records" — a customer-role account
   can technically query any `policy_id`/`claim_id` it's given, not just
   its own. Documented as a natural next step, not fixed within the
   14-day scope.
2. **File uploads don't persist on Render's free tier** (ephemeral
   filesystem — wiped on redeploy). Works fine for local dev and demos;
   production would need S3/Cloudinary.
3. **PDF report generation (ReportLab) isn't implemented** — it's in
   `requirements.txt` per the brief's suggested stack, but the Reports
   module only outputs to the dashboard (Chart.js), not downloadable PDFs.
   Listed as a bonus feature per the original brief.
4. **No automated test framework** (pytest/Jest) — testing was done via
   a PowerShell end-to-end script (`day12_e2e_test.ps1`) hitting the live
   API, which is thorough but manual-trigger rather than CI-integrated.

## Bonus features implemented
- Chart.js dashboard (Reports module) beyond the minimum brief
- Global JSON error handling (404/405/413/generic 500) for a consistent API contract
- Full end-to-end automated test script covering all 8 modules + negative-path tests

## Bonus features NOT implemented (future work)
- Email notifications (Flask-Mail)
- OCR document verification (Tesseract)
- Excel export (OpenPyXL)
- Audit logs
- Dark mode / multi-language support

# Role-Based Authorization Matrix (Day 10)

Every protected route uses `@jwt_required()` (must be logged in) plus, where
restricted, `@role_required("admin", "agent")` or similar. Below is the full
audit of what each role can currently do.

| Action | Admin | Agent | Customer |
|---|---|---|---|
| Register customer | ✅ | ✅ | ❌ |
| View/search customer list | ✅ | ✅ | ❌ |
| Edit customer | ✅ | ✅ | ❌ |
| Delete customer | ✅ | ❌ | ❌ |
| Customer history | ✅ | ✅ | ❌ |
| Create policy | ✅ | ✅ | ❌ |
| View policy / list policies | ✅ | ✅ | ✅ |
| Renew policy | ✅ | ✅ | ❌ |
| Cancel policy | ✅ | ✅ | ❌ |
| View expiring policies | ✅ | ✅ | ❌ |
| Record a payment | ✅ | ✅ | ✅ |
| Schedule a due payment | ✅ | ✅ | ❌ |
| View payment history | ✅ | ✅ | ✅ |
| Mark payment as paid | ✅ | ✅ | ✅ |
| View overdue payments | ✅ | ✅ | ❌ |
| Submit a claim | ✅ | ✅ | ✅ |
| View claim / claim history | ✅ | ✅ | ✅ |
| Verify claim | ✅ | ✅ | ❌ |
| Approve/reject claim | ✅ | ✅ | ❌ |
| Upload document | ✅ | ✅ | ✅ |
| View/download document | ✅ | ✅ | ✅ |
| Delete document | ✅ | ✅ | ❌ (fixed Day 10 — previously open to all roles) |
| Reports dashboard (all) | ✅ | ✅ | ❌ |

## Known scope limits (not fixed, by design for this project size)
- A "customer" role account isn't linked to a specific `Customer` record via
  `user_id` (the column exists on the model but registration doesn't set it),
  so customer-role users can technically view/act on **any** `policy_id`,
  `claim_id`, etc. they pass in, not just "their own." Building a true
  self-service portal (customer sees only their own data) would require:
  1. Setting `Customer.user_id` when an admin/agent registers a customer
     linked to a login, or when a customer self-registers
  2. Scoping policy/claim/payment/document queries to the logged-in
     customer's own `customer_id` instead of trusting the request
  This is flagged as a natural "Bonus Feature" extension per the project
  brief, not implemented here to stay within the Day 10 scope.

## Update (post-Day-14): Customer self-service policy applications
- Self-registering as role `customer` now auto-creates a linked `Customer`
  record (`Customer.user_id` set), closing the linkage gap noted above —
  at least for accounts created from this point forward.
- Customers can now **apply** for a policy (`POST /api/policies` with no
  `customer_id` — it's resolved from their own account). New applications
  start as `status: "pending"`.
- Admin/agent see pending applications and can `POST /api/policies/<id>/approve`
  or `.../reject`.
- `GET /api/policies` is now scoped: a customer-role account only ever sees
  their own policies, regardless of query params passed.
- Still open: Payments and Claims still take a raw `policy_id` from
  whoever calls the endpoint, without checking it belongs to the caller.
  A customer can technically record a payment or submit a claim against
  any policy_id, not just their own. Not fixed yet — flagged for a future
  pass, same pattern as the policy scoping fix above.

## Update 2 (post-Day-14): Full customer self-service scoping
- **Dashboard** (`/dashboard`) — new customer-only landing page: greeting +
  policy catalog (`GET /api/policies/catalog`) with "Apply" shortcuts.
- **My Profile** (`/profile`, `GET`/`PUT /api/customers/me`) — customer
  fills in/edits their own name, DOB, phone, address.
- **Payments & Claims are now fully scoped**: a customer-role account can
  only ever list, record, or pay against their OWN policies — enforced
  server-side (`_own_policy_ids` helper in both `payments.py` and
  `claims.py`), not just hidden in the UI. Attempting to act on someone
  else's policy_id now returns 403.
- Frontend: the raw "Policy ID" text field in Payments/Claims forms is now
  a dropdown of the customer's own active policies (removes guesswork/typos
  and reinforces the server-side scoping).
- Login and the default `/` route now send customer-role accounts to
  `/dashboard` instead of the admin-oriented `/customers` page.

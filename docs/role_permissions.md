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

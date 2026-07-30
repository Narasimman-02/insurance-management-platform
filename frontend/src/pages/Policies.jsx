import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Pagination from "../components/Pagination";

const STATUS_STYLES = {
  active: "text-success border-success/30 bg-success/5",
  expired: "text-muted border-border bg-black/5",
  cancelled: "text-danger border-danger/30 bg-danger/5",
  pending: "text-brass border-brass/30 bg-brass/5",
  rejected: "text-danger border-danger/30 bg-danger/5",
};

function PolicyCard({ policy, onRenew, onCancel, onApprove, onReject, canManage }) {
  return (
    <div className="card relative overflow-hidden">
      <div className="p-5 flex justify-between items-start">
        <div>
          <p className="label-eyebrow text-brass">{policy.policy_type}</p>
          <p className="font-mono text-sm text-muted mt-1 tracking-wide">{policy.policy_number}</p>
        </div>
        <span className={`text-xs uppercase tracking-wide px-2 py-1 rounded-sm border ${STATUS_STYLES[policy.status]}`}>
          {policy.status}
        </span>
      </div>

      {/* Perforation divider — the signature element */}
      <div className="relative h-0 border-t border-dashed border-border mx-5">
        <div className="absolute -left-[29px] -top-2 w-4 h-4 rounded-full bg-paper" />
        <div className="absolute -right-[29px] -top-2 w-4 h-4 rounded-full bg-paper" />
      </div>

      <div className="p-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="label-eyebrow">Premium</p>
          <p className="font-display text-lg mt-0.5">₹{Number(policy.premium_amount).toLocaleString()}</p>
        </div>
        <div>
          <p className="label-eyebrow">Term</p>
          <p className="mt-0.5">{policy.start_date} → {policy.end_date}</p>
        </div>
      </div>

      {canManage && policy.status === "pending" && (
        <div className="px-5 pb-3 flex gap-2 flex-wrap">
          <button onClick={() => onApprove(policy.id)} className="btn-secondary text-sm">Approve</button>
          <button onClick={() => onReject(policy.id)} className="btn-danger">Reject</button>
        </div>
      )}

      {canManage && (policy.status === "active" || policy.status === "expired") && (
        <div className="px-5 pb-3 flex gap-2 flex-wrap">
          <button onClick={() => onRenew(policy.id)} className="btn-secondary text-sm">Renew</button>
          <button onClick={() => onCancel(policy.id)} className="btn-danger">Cancel</button>
        </div>
      )}

      {policy.status === "active" && (
        <div className="px-5 pb-5 flex gap-3 text-sm">
          <Link to={`/payments?policy_id=${policy.id}`} className="text-navy underline underline-offset-2">Payments</Link>
          <Link to={`/claims?policy_id=${policy.id}`} className="text-navy underline underline-offset-2">Claims</Link>
        </div>
      )}
    </div>
  );
}

export default function Policies() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "agent";
  const isCustomer = user?.role === "customer";
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("customer_id") || "";
  const applyType = searchParams.get("apply") || "";

  const [policies, setPolicies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(!!applyType);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    customer_id: customerId, policy_type: applyType || "health", premium_amount: "", start_date: "", end_date: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(pageNum = 1, status = statusFilter) {
    setLoading(true);
    try {
      const params = { page: pageNum, per_page: 8 };
      if (customerId) params.customer_id = customerId;
      if (status) params.status = status;
      const { data } = await api.get("/policies", { params });
      setPolicies(data.items);
      setPage(data.page);
      setPages(data.pages || 1);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers() {
    const { data } = await api.get("/customers");
    setCustomers(data.items);
  }

  useEffect(() => {
    load(1, statusFilter);
    if (canManage) loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  function handleStatusChange(value) {
    setStatusFilter(value);
    load(1, value);
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      // Customers apply for themselves — the backend resolves their linked
      // customer record, so we don't send customer_id at all for that role.
      const payload = isCustomer
        ? { policy_type: form.policy_type, premium_amount: Number(form.premium_amount), start_date: form.start_date, end_date: form.end_date }
        : { ...form, premium_amount: Number(form.premium_amount) };

      await api.post("/policies", payload);
      setShowForm(false);
      if (isCustomer) setSuccess("Application submitted — an agent will review it shortly.");
      load(page, statusFilter);
    } catch (err) {
      setError(err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : err.response?.data?.error || "Could not submit.");
    }
  }

  async function handleRenew(id) {
    await api.post(`/policies/${id}/renew`);
    load(page, statusFilter);
  }

  async function handleCancel(id) {
    await api.post(`/policies/${id}/cancel`);
    load(page, statusFilter);
  }

  async function handleApprove(id) {
    await api.post(`/policies/${id}/approve`);
    load(page, statusFilter);
  }

  async function handleReject(id) {
    await api.post(`/policies/${id}/reject`);
    load(page, statusFilter);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
        <div>
          <p className="label-eyebrow text-brass">Module 02</p>
          <h1 className="font-display text-3xl font-semibold mt-1">
            {isCustomer ? "My Policies" : "Policies"}
          </h1>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
          {showForm ? "Cancel" : isCustomer ? "Apply for a policy" : "Create policy"}
        </button>
      </div>

      {success && <p className="text-sm text-success mb-4">{success}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {error && <p className="sm:col-span-2 text-sm text-danger break-words">{error}</p>}
          {canManage && (
            <div>
              <label className="label-eyebrow block mb-1">Customer</label>
              <select required className="input-field" value={form.customer_id}
                onChange={(e) => update("customer_id", e.target.value)}>
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label-eyebrow block mb-1">Policy type</label>
            <select className="input-field" value={form.policy_type}
              onChange={(e) => update("policy_type", e.target.value)}>
              <option value="life">Life</option>
              <option value="health">Health</option>
              <option value="vehicle">Vehicle</option>
              <option value="home">Home</option>
              <option value="travel">Travel</option>
            </select>
          </div>
          <div>
            <label className="label-eyebrow block mb-1">
              {isCustomer ? "Desired premium" : "Premium amount"}
            </label>
            <input type="number" step="0.01" required className="input-field" value={form.premium_amount}
              onChange={(e) => update("premium_amount", e.target.value)} />
          </div>
          <div>
            <label className="label-eyebrow block mb-1">Start date</label>
            <input type="date" required className="input-field" value={form.start_date}
              onChange={(e) => update("start_date", e.target.value)} />
          </div>
          <div>
            <label className="label-eyebrow block mb-1">End date</label>
            <input type="date" required className="input-field" value={form.end_date}
              onChange={(e) => update("end_date", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              {isCustomer ? "Submit application" : "Save policy"}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-2 mb-4">
        <label className="label-eyebrow">Filter status</label>
        <select
          className="input-field max-w-[10rem]"
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : policies.length === 0 ? (
        <p className="text-muted">
          {isCustomer ? "No policies yet — apply for one above." : "No policies match this filter."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {policies.map((p) => (
              <PolicyCard
                key={p.id}
                policy={p}
                onRenew={handleRenew}
                onCancel={handleCancel}
                onApprove={handleApprove}
                onReject={handleReject}
                canManage={canManage}
              />
            ))}
          </div>
          <Pagination page={page} pages={pages} total={total} onPageChange={(p) => load(p, statusFilter)} />
        </>
      )}
    </div>
  );
}

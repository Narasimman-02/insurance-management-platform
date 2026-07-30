import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const STATUS_STYLES = {
  pending: "text-brass border-brass/30 bg-brass/5",
  under_review: "text-navy border-navy/30 bg-navy/5",
  approved: "text-success border-success/30 bg-success/5",
  rejected: "text-danger border-danger/30 bg-danger/5",
};

export default function Claims() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "agent";
  const isCustomer = user?.role === "customer";
  const [searchParams] = useSearchParams();
  const policyId = searchParams.get("policy_id") || "";

  const [claims, setClaims] = useState([]);
  const [myPolicies, setMyPolicies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ policy_id: policyId, claim_amount: "", reason: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = policyId ? { policy_id: policyId } : {};
      const { data } = await api.get("/claims", { params });
      setClaims(data.items);
      if (isCustomer) {
        const policiesRes = await api.get("/policies", { params: { status: "active" } });
        setMyPolicies(policiesRes.data.items);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/claims", { ...form, claim_amount: Number(form.claim_amount) });
      setShowForm(false);
      setForm({ policy_id: policyId, claim_amount: "", reason: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not submit claim.");
    }
  }

  async function handleVerify(id) {
    await api.post(`/claims/${id}/verify`);
    load();
  }

  async function handleApprove(id) {
    await api.post(`/claims/${id}/approve`);
    load();
  }

  async function handleReject(id) {
    await api.post(`/claims/${id}/reject`);
    load();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
        <div>
          <p className="label-eyebrow text-brass">Module 03</p>
          <h1 className="font-display text-3xl font-semibold mt-1">Claims</h1>
          {policyId && (
            <p className="text-sm text-muted mt-1">
              Showing policy #{policyId} ·{" "}
              <Link to="/policies" className="underline underline-offset-2">back to all policies</Link>
            </p>
          )}
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
          {showForm ? "Cancel" : "Submit claim"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
          <div>
            <label className="label-eyebrow block mb-1">Policy</label>
            {isCustomer ? (
              <select required className="input-field" value={form.policy_id}
                onChange={(e) => setForm((f) => ({ ...f, policy_id: e.target.value }))}>
                <option value="">Select your policy</option>
                {myPolicies.map((p) => (
                  <option key={p.id} value={p.id}>{p.policy_number} ({p.policy_type})</option>
                ))}
              </select>
            ) : (
              <input required className="input-field" value={form.policy_id}
                onChange={(e) => setForm((f) => ({ ...f, policy_id: e.target.value }))} />
            )}
          </div>
          <div>
            <label className="label-eyebrow block mb-1">Claim amount</label>
            <input type="number" step="0.01" required className="input-field" value={form.claim_amount}
              onChange={(e) => setForm((f) => ({ ...f, claim_amount: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="label-eyebrow block mb-1">Reason</label>
            <textarea required rows={3} className="input-field" value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Submit claim</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : claims.length === 0 ? (
          <p className="text-muted">No claims yet.</p>
        ) : (
          claims.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="font-mono text-xs text-muted">Policy #{c.policy_id}</p>
                  <p className="font-display text-lg mt-1">₹{Number(c.claim_amount).toLocaleString()}</p>
                  <p className="text-sm text-muted mt-1">{c.reason}</p>
                  <p className="text-xs text-muted mt-2">Submitted {c.submission_date?.slice(0, 10)}</p>
                </div>
                <span className={`shrink-0 text-xs uppercase tracking-wide px-2 py-1 rounded-sm border ${STATUS_STYLES[c.status]}`}>
                  {c.status.replace("_", " ")}
                </span>
              </div>
              {canManage && (c.status === "pending" || c.status === "under_review") && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  {c.status === "pending" && (
                    <button onClick={() => handleVerify(c.id)} className="btn-secondary text-sm">Verify</button>
                  )}
                  <button onClick={() => handleApprove(c.id)} className="btn-secondary text-sm">Approve</button>
                  <button onClick={() => handleReject(c.id)} className="btn-danger">Reject</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

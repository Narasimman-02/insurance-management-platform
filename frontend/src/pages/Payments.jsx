import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const STATUS_STYLES = {
  paid: "text-success border-success/30 bg-success/5",
  due: "text-brass border-brass/30 bg-brass/5",
  overdue: "text-danger border-danger/30 bg-danger/5",
};

export default function Payments() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "agent";
  const isCustomer = user?.role === "customer";
  const [searchParams] = useSearchParams();
  const policyId = searchParams.get("policy_id") || "";

  const [payments, setPayments] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [myPolicies, setMyPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [showDueForm, setShowDueForm] = useState(false);
  const [recordForm, setRecordForm] = useState({ policy_id: policyId, amount: "" });
  const [dueForm, setDueForm] = useState({ policy_id: policyId, amount: "", due_date: "" });
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = policyId ? { policy_id: policyId } : {};
      const { data } = await api.get("/payments", { params });
      setPayments(data.items);
      if (canManage) {
        const overdueRes = await api.get("/payments/overdue");
        setOverdue(overdueRes.data);
      }
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

  async function handleRecord(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/payments", { ...recordForm, amount: Number(recordForm.amount) });
      setShowRecordForm(false);
      setRecordForm({ policy_id: policyId, amount: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not record payment.");
    }
  }

  async function handleScheduleDue(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/payments/due", { ...dueForm, amount: Number(dueForm.amount) });
      setShowDueForm(false);
      setDueForm({ policy_id: policyId, amount: "", due_date: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not schedule payment.");
    }
  }

  async function handleMarkPaid(id) {
    await api.post(`/payments/${id}/pay`);
    load();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
        <div>
          <p className="label-eyebrow text-brass">Module 04</p>
          <h1 className="font-display text-3xl font-semibold mt-1">Premium Payments</h1>
          {policyId && (
            <p className="text-sm text-muted mt-1">
              Showing policy #{policyId} ·{" "}
              <Link to="/policies" className="underline underline-offset-2">back to all policies</Link>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRecordForm((s) => !s)} className="btn-primary">
            {showRecordForm ? "Cancel" : "Record payment"}
          </button>
          {canManage && (
            <button onClick={() => setShowDueForm((s) => !s)} className="btn-secondary">
              {showDueForm ? "Cancel" : "Schedule due"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {showRecordForm && (
        <form onSubmit={handleRecord} className="card p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-eyebrow block mb-1">Policy</label>
            {isCustomer ? (
              <select required className="input-field" value={recordForm.policy_id}
                onChange={(e) => setRecordForm((f) => ({ ...f, policy_id: e.target.value }))}>
                <option value="">Select your policy</option>
                {myPolicies.map((p) => (
                  <option key={p.id} value={p.id}>{p.policy_number} ({p.policy_type})</option>
                ))}
              </select>
            ) : (
              <input required className="input-field" value={recordForm.policy_id}
                onChange={(e) => setRecordForm((f) => ({ ...f, policy_id: e.target.value }))} />
            )}
          </div>
          <div>
            <label className="label-eyebrow block mb-1">Amount</label>
            <input type="number" step="0.01" required className="input-field" value={recordForm.amount}
              onChange={(e) => setRecordForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Save payment (marks as paid today)</button>
          </div>
        </form>
      )}

      {canManage && showDueForm && (
        <form onSubmit={handleScheduleDue} className="card p-6 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label-eyebrow block mb-1">Policy ID</label>
            <input required className="input-field" value={dueForm.policy_id}
              onChange={(e) => setDueForm((f) => ({ ...f, policy_id: e.target.value }))} />
          </div>
          <div>
            <label className="label-eyebrow block mb-1">Amount</label>
            <input type="number" step="0.01" required className="input-field" value={dueForm.amount}
              onChange={(e) => setDueForm((f) => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="label-eyebrow block mb-1">Due date</label>
            <input type="date" required className="input-field" value={dueForm.due_date}
              onChange={(e) => setDueForm((f) => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary">Schedule</button>
          </div>
        </form>
      )}

      {canManage && overdue.length > 0 && (
        <div className="card p-5 mb-6 border-danger/30 bg-danger/5">
          <p className="label-eyebrow text-danger mb-2">⚠ Overdue premium alerts ({overdue.length})</p>
          <ul className="text-sm space-y-1">
            {overdue.map((p) => (
              <li key={p.id} className="flex justify-between items-center">
                <span>Policy #{p.policy_id} — ₹{Number(p.amount).toLocaleString()} was due {p.payment_date?.slice(0, 10)}</span>
                <button onClick={() => handleMarkPaid(p.id)} className="btn-secondary text-xs">Mark paid</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-border text-left label-eyebrow">
              <th className="px-4 py-3">Policy</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="px-4 py-6 text-center text-muted">Loading...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-6 text-center text-muted">No payments yet.</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">#{p.policy_id}</td>
                  <td className="px-4 py-3 font-medium">₹{Number(p.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted">{p.payment_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs uppercase tracking-wide px-2 py-1 rounded-sm border ${STATUS_STYLES[p.payment_status]}`}>
                      {p.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.payment_status !== "paid" && (
                      <button onClick={() => handleMarkPaid(p.id)} className="btn-secondary text-xs">Mark paid</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

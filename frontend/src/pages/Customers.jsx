import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Pagination from "../components/Pagination";

export default function Customers() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "agent";
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function load(searchTerm = "", pageNum = 1) {
    if (!canManage) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/customers", {
        params: { search: searchTerm, page: pageNum, per_page: 10 },
      });
      setCustomers(data.items);
      setPage(data.page);
      setPages(data.pages || 1);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/customers", form);
      setForm({ name: "", email: "", phone: "", address: "" });
      setShowForm(false);
      load(search, page);
    } catch (err) {
      setError(err.response?.data?.error || "Could not create customer.");
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
        <div>
          <p className="label-eyebrow text-brass">Module 01</p>
          <h1 className="font-display text-3xl font-semibold mt-1">Customers</h1>
        </div>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
            {showForm ? "Cancel" : "Register customer"}
          </button>
        )}
      </div>

      {canManage && showForm && (
        <form onSubmit={handleCreate} className="card p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
          <div>
            <label className="label-eyebrow block mb-1">Name</label>
            <input required className="input-field" value={form.name}
              onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label className="label-eyebrow block mb-1">Email</label>
            <input type="email" required className="input-field" value={form.email}
              onChange={(e) => update("email", e.target.value)} />
          </div>
          <div>
            <label className="label-eyebrow block mb-1">Phone</label>
            <input className="input-field" value={form.phone}
              onChange={(e) => update("phone", e.target.value)} />
          </div>
          <div>
            <label className="label-eyebrow block mb-1">Address</label>
            <input className="input-field" value={form.address}
              onChange={(e) => update("address", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Save customer</button>
          </div>
        </form>
      )}

      {!forbidden && (
        <div className="flex gap-2 mb-4">
          <input
            className="input-field max-w-xs"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search, 1)}
          />
          <button onClick={() => load(search, 1)} className="btn-secondary">Search</button>
        </div>
      )}

      {forbidden ? (
        <div className="card p-6 text-sm text-muted">
          The customer directory is only available to admin and agent accounts.
          Head to <strong>Policies</strong> to see policies tied to your account instead.
        </div>
      ) : (
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-border text-left label-eyebrow">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="px-4 py-6 text-center text-muted">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan="4" className="px-4 py-6 text-center text-muted">No customers yet.</td></tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted">{c.email}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/policies?customer_id=${c.id}`} className="text-navy text-sm underline underline-offset-2">
                      View policies
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
      {!forbidden && (
        <Pagination page={page} pages={pages} total={total} onPageChange={(p) => load(search, p)} />
      )}
    </div>
  );
}

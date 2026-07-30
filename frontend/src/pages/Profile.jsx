import { useEffect, useState } from "react";
import api from "../services/api";

export default function Profile() {
  const [form, setForm] = useState({ name: "", dob: "", phone: "", address: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/customers/me");
        setForm({
          name: data.name || "",
          dob: data.dob || "",
          phone: data.phone || "",
          address: data.address || "",
          email: data.email || "",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSuccess(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { name, dob, phone, address } = form;
      await api.put("/customers/me", { name, dob: dob || null, phone, address });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <div>
      <div className="mb-8">
        <p className="label-eyebrow text-brass">My Account</p>
        <h1 className="font-display text-3xl font-semibold mt-1">My Profile</h1>
        <p className="text-muted mt-1">Fill in your details — agents will see this when reviewing your applications.</p>
      </div>

      <form onSubmit={handleSave} className="card p-6 max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
        {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
        {success && <p className="sm:col-span-2 text-sm text-success">Saved.</p>}

        <div className="sm:col-span-2">
          <label className="label-eyebrow block mb-1">Email</label>
          <input disabled className="input-field opacity-60" value={form.email} />
        </div>
        <div>
          <label className="label-eyebrow block mb-1">Full name</label>
          <input required className="input-field" value={form.name}
            onChange={(e) => update("name", e.target.value)} />
        </div>
        <div>
          <label className="label-eyebrow block mb-1">Date of birth</label>
          <input type="date" className="input-field" value={form.dob}
            onChange={(e) => update("dob", e.target.value)} />
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
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

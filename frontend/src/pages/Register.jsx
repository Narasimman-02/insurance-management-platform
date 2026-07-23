import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="label-eyebrow text-brass">Insurance Management Platform</p>
          <h1 className="font-display text-3xl font-semibold mt-2">Create account</h1>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <p className="text-sm text-danger bg-danger/5 border border-danger/20 px-3 py-2 rounded-sm">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-success bg-success/5 border border-success/20 px-3 py-2 rounded-sm">
              Account created — redirecting to sign in...
            </p>
          )}
          <div>
            <label className="label-eyebrow block mb-1">Full name</label>
            <input required className="input-field" value={form.name}
              onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label className="label-eyebrow block mb-1">Email</label>
            <input type="email" required className="input-field" value={form.email}
              onChange={(e) => update("email", e.target.value)} />
          </div>
          <div>
            <label className="label-eyebrow block mb-1">Password</label>
            <input type="password" required className="input-field" value={form.password}
              onChange={(e) => update("password", e.target.value)} />
          </div>
          <div>
            <label className="label-eyebrow block mb-1">Role</label>
            <select className="input-field" value={form.role}
              onChange={(e) => update("role", e.target.value)}>
              <option value="customer">Customer</option>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-4">
          Already have an account? <Link to="/login" className="text-navy underline underline-offset-2">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

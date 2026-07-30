import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(loggedInUser.role === "customer" ? "/dashboard" : "/customers");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="label-eyebrow text-brass">Insurance Management Platform</p>
          <h1 className="font-display text-3xl font-semibold mt-2">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <p className="text-sm text-danger bg-danger/5 border border-danger/20 px-3 py-2 rounded-sm">
              {error}
            </p>
          )}
          <div>
            <label className="label-eyebrow block mb-1">Email</label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label-eyebrow block mb-1">Password</label>
            <input
              type="password"
              required
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-4">
          No account? <Link to="/register" className="text-navy underline underline-offset-2">Register</Link>
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await api.get("/policies/catalog");
      setCatalog(data);
      setLoading(false);
    }
    load();
  }, []);

  function applyFor(type) {
    navigate(`/policies?apply=${type}`);
  }

  return (
    <div>
      <div className="mb-8">
        <p className="label-eyebrow text-brass">Welcome</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Hi, {user?.name} 👋</h1>
        <p className="text-muted mt-2">
          We currently offer {catalog.length} types of insurance policies. Apply for one below,
          or check your existing policies, payments, and claims from the sidebar.
        </p>
      </div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {catalog.map((c) => (
            <div key={c.type} className="card p-5 flex flex-col">
              <p className="label-eyebrow text-brass">{c.label}</p>
              <p className="text-sm text-muted mt-2 flex-1">{c.description}</p>
              <button onClick={() => applyFor(c.type)} className="btn-secondary text-sm mt-4 self-start">
                Apply
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

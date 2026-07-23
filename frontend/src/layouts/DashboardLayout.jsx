import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/customers", label: "Customers" },
  { to: "/policies", label: "Policies" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-navy text-white flex flex-col shrink-0">
        <div className="px-6 py-6 border-b border-white/10">
          <p className="label-eyebrow text-brass-light">Insurance</p>
          <h1 className="font-display text-xl font-semibold leading-tight mt-1">
            Management<br />Platform
          </h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-brass-light"
                    : "text-white/75 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-white/50 uppercase tracking-wide">{user?.role}</p>
          <button
            onClick={logout}
            className="mt-3 text-xs text-white/60 hover:text-white underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-paper">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/customers", label: "Customers" },
  { to: "/policies", label: "Policies" },
  { to: "/reports", label: "Reports" },
];

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  return (
    <>
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
            onClick={onNavigate}
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
    </>
  );
}

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden bg-navy text-white flex items-center justify-between px-4 py-3">
        <p className="font-display text-lg font-semibold">Insurance Platform</p>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -mr-2"
          aria-label="Open menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-72 bg-navy text-white flex flex-col">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-navy text-white flex-col shrink-0">
        <SidebarContent onNavigate={() => {}} />
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-paper min-w-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Customers from "./pages/Customers";
import Policies from "./pages/Policies";
import Payments from "./pages/Payments";
import Claims from "./pages/Claims";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "customer" ? "/dashboard" : "/customers"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/reports" element={<Reports />} />
          </Route>

          <Route path="/" element={<RoleHome />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

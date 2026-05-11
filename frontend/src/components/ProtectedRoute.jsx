import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
        <span className="flex items-center gap-2 text-sm font-semibold text-[#868e96]">
          <svg className="h-5 w-5 animate-spin text-[#4263eb]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </span>
      </div>
    );
  }

  if (!user) {
    // Check if we're on a teacher route to redirect to teacher login
    if (window.location.pathname.startsWith('/teacher')) {
      return <Navigate to="/teacher/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // If user is teacher but trying to access admin routes, or vice versa, App.jsx handles it
  return <Outlet />;
}

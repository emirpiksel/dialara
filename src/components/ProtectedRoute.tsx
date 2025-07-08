import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "superadmin";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, loading } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Oturum kontrolü yapılabilir (isteğe bağlı)
  }, []);

  if (loading) {
    return <div className="text-center mt-10 text-gray-600">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !isAdmin) {
    return <div className="text-center mt-10 text-red-500">Unauthorized - Admins only</div>;
  }

  return <>{children}</>;
}

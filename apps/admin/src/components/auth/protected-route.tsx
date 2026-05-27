import { Navigate, useLocation } from "react-router-dom"
import { authStorage } from "@/lib/auth-storage"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  if (!authStorage.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

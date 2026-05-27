import { Navigate, useLocation } from "react-router-dom"
import { useSession } from "@/hooks/use-auth"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { data, isLoading, error } = useSession()

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>
  }

  if (error || !data) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

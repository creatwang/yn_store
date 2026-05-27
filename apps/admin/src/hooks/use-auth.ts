import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, getAuthHeaders } from "@/lib/api"
import { authStorage } from "@/lib/auth-storage"
import type { LoginInput } from "@my-store/validators"

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await api.api.auth.session.$get(undefined, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error("Unauthorized")
      return res.json()
    },
    enabled: authStorage.isAuthenticated(),
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await api.api.auth.user.emailpass.$post({ json: input })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { message?: string }).message || "登录失败"
        )
      }
      return res.json()
    },
    onSuccess: (data) => {
      authStorage.setToken(data.token)
      queryClient.invalidateQueries({ queryKey: ["session"] })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return () => {
    authStorage.clear()
    queryClient.clear()
    window.location.href = "/admin/login"
  }
}

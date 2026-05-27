import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { authStorage } from "@/lib/auth-storage"
import type { LoginInput } from "@my-store/validators"

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await api.auth.user.emailpass.$post({ json: data })
      const result = await res.json()
      if (!result.token) {
        throw new Error("登录失败")
      }
      authStorage.setToken(result.token)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return () => {
    authStorage.clear()
    queryClient.removeQueries({ queryKey: ["session"] })
    queryClient.clear()
  }
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const token = authStorage.getToken()
      if (!token) {
        throw new Error("未登录")
      }
      const res = await api.auth.session.$get()
      if (!res.ok) {
        throw new Error("获取会话失败")
      }
      return await res.json()
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}